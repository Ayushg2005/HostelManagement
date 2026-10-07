import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { socket } from '../utils/socket';
import { useAuth } from '../context/AuthContext';
import MagneticButton from './MagneticButton';
import {
  Utensils,
  ShoppingBag,
  Plus,
  Minus,
  CreditCard,
  CheckCircle2,
  Clock,
  ChefHat,
  Flame,
  Sparkles,
  ShieldCheck,
  X,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function NightCanteen() {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [activeTab, setActiveTab] = useState(
    user.role === 'COOK' ? 'kitchen' : 'menu'
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: menuData } = await API.get('/canteen/menu');
      setMenuItems(menuData);

      if (user.role === 'COOK') {
        const { data: kData } = await API.get('/canteen/orders/kitchen');
        setKitchenOrders(kData);
      } else {
        const { data: oData } = await API.get('/canteen/orders/my');
        setOrders(oData);
      }
    } catch (err) {
      console.error('Failed to load canteen data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Socket listeners
    const handleMenuUpdated = () => {
      API.get('/canteen/menu').then(({ data }) => setMenuItems(data));
    };

    const handleNewOrder = (newOrder) => {
      if (user.role === 'COOK') {
        setKitchenOrders((prev) => [...prev, newOrder]);
      }
    };

    const handleOrderStatusChanged = (updatedOrder) => {
      if (user.role === 'COOK') {
        setKitchenOrders((prev) =>
          prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
        );
      } else {
        setOrders((prev) =>
          prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
        );
      }
    };

    socket.on('canteen:menu_updated', handleMenuUpdated);
    socket.on('order:new', handleNewOrder);
    socket.on('order:status_changed', handleOrderStatusChanged);

    return () => {
      socket.off('canteen:menu_updated', handleMenuUpdated);
      socket.off('order:new', handleNewOrder);
      socket.off('order:status_changed', handleOrderStatusChanged);
    };
  }, [user?.role]);

  // Cart operations
  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i._id === item._id);
      if (existing) {
        return prev.map((i) =>
          i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart((prev) => {
      const existing = prev.find((i) => i._id === itemId);
      if (existing.quantity === 1) {
        return prev.filter((i) => i._id !== itemId);
      }
      return prev.map((i) =>
        i._id === itemId ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Cook toggle menu item
  const handleToggleItem = async (itemId) => {
    try {
      await API.patch(`/canteen/menu/${itemId}/toggle`);
    } catch (err) {
      console.error('Failed to toggle item:', err);
    }
  };

  // Process Razorpay Payment
  const handlePayment = async () => {
    setPaymentProcessing(true);
    try {
      // 1. Load Razorpay script dynamically
      const scriptLoaded = await loadRazorpayScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!scriptLoaded) {
        alert('Razorpay SDK failed to load. Are you online?');
        setPaymentProcessing(false);
        return;
      }

      // 2. Create order on backend
      const { data: order } = await API.post('/canteen/orders/razorpay/create', {
        totalAmount: cartTotal,
      });

      // 3. Open Razorpay Checkout
      const options = {
        key: order.key_id, 
        amount: order.amount,
        currency: order.currency,
        name: 'Night Canteen',
        description: 'Hostel Late Night Snack Order',
        image: 'https://images.unsplash.com/photo-1590846406792-0adc7f928f1d?auto=format&fit=crop&w=150&q=80',
        order_id: order.id,
        handler: async function (response) {
          try {
            // 4. Verify Payment on Backend
            const verificationPayload = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              items: cart.map((i) => ({
                menuItemId: i._id,
                name: i.name,
                price: i.price,
                quantity: i.quantity,
              })),
              totalAmount: cartTotal,
            };

            const { data: verifiedOrder } = await API.post('/canteen/orders/razorpay/verify', verificationPayload);
            
            setOrders((prev) => [verifiedOrder, ...prev]);
            setCart([]);
            setShowPaymentModal(false);
            setPaymentProcessing(false);
            setActiveTab('my_orders');

            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 },
            });
          } catch (err) {
            console.error('Payment Verification Failed:', err);
            alert('Payment verification failed!');
            setPaymentProcessing(false);
          }
        },
        prefill: {
          name: user?.name || 'Student',
          email: user?.email || 'student@bmsce.ac.in',
          contact: '9999999999',
        },
        theme: {
          color: '#1a1a1a',
        },
        modal: {
          ondismiss: function() {
            setPaymentProcessing(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        console.error(response.error);
        alert('Payment failed: ' + response.error.description);
      });
      rzp.open();
    } catch (err) {
      console.error('Razorpay Error:', err);
      alert('Error initiating payment. Please try again.');
      setPaymentProcessing(false);
    }
  };

  // Helper to load external scripts
  const loadRazorpayScript = (src) => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Cook update order status
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await API.patch(`/canteen/orders/${orderId}/status`, { orderStatus: newStatus });
    } catch (err) {
      console.error('Failed to update order status:', err);
    }
  };

  const getOrderStatusBadge = (status) => {
    switch (status) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[0.65rem] font-mono font-bold uppercase tracking-widest bg-green/10 text-green border border-green/20 animate-pulse">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ready
          </span>
        );
      case 'preparing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[0.65rem] font-mono font-bold uppercase tracking-widest bg-gold/10 text-gold border border-gold/20">
            <Flame className="w-3.5 h-3.5 animate-bounce" /> Kitchen
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[0.65rem] font-mono font-bold uppercase tracking-widest bg-accent/10 text-accent border border-accent/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[0.65rem] font-mono font-bold uppercase tracking-widest bg-ink/5 text-ink/70 border border-ink/10">
            <Clock className="w-3.5 h-3.5" /> Placed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="p-6 sm:p-8 bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-ink text-paper text-[0.65rem] font-mono font-bold uppercase tracking-widest mb-3">
            <Utensils className="w-3.5 h-3.5" /> Night Canteen & Express Kitchen
          </div>
          <h2 className="text-3xl font-serif font-bold text-ink italic">
            {user.role === 'COOK' ? 'Preparation Board' : 'Midnight Canteen'}
          </h2>
          <p className="text-sm text-muted mt-2 font-sans">
            {user.role === 'COOK'
              ? 'Real-time order board for kitchen staff. Update order states live to notify students.'
              : 'Order late-night snacks with instant Razorpay payment simulation and live kitchen status tracker.'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-paper p-2 border border-border shrink-0">
          {user.role !== 'COOK' && (
            <>
              <button
                onClick={() => setActiveTab('menu')}
                className={`px-4 py-2 text-xs font-sans font-medium transition-colors border-b-2 ${
                  activeTab === 'menu'
                    ? 'border-ink text-ink shadow-sm'
                    : 'border-transparent text-muted hover:text-ink hover:border-border'
                }`}
              >
                Canteen Menu
              </button>
              <button
                onClick={() => setActiveTab('my_orders')}
                className={`px-4 py-2 text-xs font-sans font-medium transition-colors border-b-2 ${
                  activeTab === 'my_orders'
                    ? 'border-ink text-ink shadow-sm'
                    : 'border-transparent text-muted hover:text-ink hover:border-border'
                }`}
              >
                My Orders ({orders.length})
              </button>
            </>
          )}

          {user.role === 'COOK' && (
            <button
              onClick={() => setActiveTab('kitchen')}
              className="px-4 py-2 text-xs font-sans font-bold bg-ink text-paper"
            >
              Kitchen Orders ({kitchenOrders.length})
            </button>
          )}
        </div>
      </div>

      {/* STUDENT VIEW: Menu & Cart */}
      {user.role !== 'COOK' && activeTab === 'menu' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu Catalog (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xl font-serif font-bold text-ink flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-accent" /> Hot & Fresh Menu
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {menuItems.map((item) => {
                const inCart = cart.find((i) => i._id === item._id);
                return (
                  <div
                    key={item._id}
                    className={`bg-paper p-4 border border-border flex items-center space-x-4 shadow-sm transition-colors hover:border-ink/30 ${
                      !item.available ? 'opacity-50 grayscale pointer-events-none' : ''
                    }`}
                  >
                    <img
                      src={item.imageUrl || 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=400&q=80'}
                      alt={item.name}
                      className="w-20 h-20 object-cover border border-border shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[0.55rem] uppercase font-mono tracking-widest px-2 py-0.5 bg-ink/10 text-ink/70">
                        {item.category}
                      </span>
                      <h4 className="text-sm font-bold font-sans text-ink truncate mt-1.5">
                        {item.name}
                      </h4>
                      <div className="text-sm font-bold text-accent font-mono mt-1">
                        ₹{item.price}
                      </div>

                      {item.available ? (
                        <div className="mt-3">
                          {inCart ? (
                            <div className="flex items-center space-x-3 bg-card w-fit px-3 py-1.5 border border-border">
                              <button
                                onClick={() => removeFromCart(item._id)}
                                className="p-1 text-ink/60 hover:text-ink transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-bold font-mono text-ink px-2">
                                {inCart.quantity}
                              </span>
                              <button
                                onClick={() => addToCart(item)}
                                className="p-1 text-ink/60 hover:text-ink transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(item)}
                              className="px-4 py-2 border-2 border-ink text-ink hover:bg-ink hover:text-paper text-[0.65rem] font-bold uppercase tracking-widest transition-colors"
                            >
                              + Add to Cart
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[0.65rem] text-accent font-mono uppercase tracking-widest font-bold mt-3 block">
                          Sold Out
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cart Sidebar (1 Col) */}
          <div className="space-y-4">
            <div className="bg-card p-6 border border-border sticky top-24 shadow-sm">
              <h3 className="text-xl font-serif font-bold text-ink flex items-center gap-2 mb-6">
                <ShoppingBag className="w-5 h-5 text-ink" /> Your Order
              </h3>

              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted text-sm font-sans">
                  Your cart is empty. Pick items from the menu!
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {cart.map((item) => (
                      <div
                        key={item._id}
                        className="flex items-center justify-between text-sm py-3 border-b border-border/50"
                      >
                        <div>
                          <div className="font-bold font-sans text-ink">{item.name}</div>
                          <div className="text-[0.65rem] text-muted font-mono uppercase tracking-widest mt-1">
                            ₹{item.price} x {item.quantity}
                          </div>
                        </div>
                        <div className="font-bold text-ink font-mono">
                          ₹{item.price * item.quantity}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t-2 border-ink flex items-center justify-between">
                    <span className="text-[0.65rem] font-mono tracking-widest uppercase text-muted">Total Payable:</span>
                    <span className="font-bold text-ink text-xl font-mono">
                      ₹{cartTotal}
                    </span>
                  </div>

                  <MagneticButton
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full !py-4 flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" /> Proceed to Pay
                  </MagneticButton>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STUDENT VIEW: My Orders Tab */}
      {user.role !== 'COOK' && activeTab === 'my_orders' && (
        <div className="space-y-4 max-w-3xl">
          {orders.length === 0 ? (
            <div className="bg-card p-12 text-center border border-border text-muted text-sm">
              No recent canteen orders found.
            </div>
          ) : (
            orders.map((o) => (
              <div key={o._id} className="bg-paper p-6 border border-border shadow-sm space-y-4 hover:border-ink/30 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[0.65rem] font-mono tracking-widest uppercase text-muted">
                      Order #{o._id.substring(o._id.length - 6)}
                    </span>
                    <div className="text-sm font-sans font-medium text-ink mt-1">
                      {new Date(o.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div>{getOrderStatusBadge(o.orderStatus)}</div>
                </div>

                <div className="flex flex-wrap gap-2 pt-3 border-t border-border/50">
                  {o.items.map((i, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-card border border-border text-xs font-medium font-sans text-ink"
                    >
                      {i.name} <span className="font-mono text-muted ml-1">x{i.quantity}</span>
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <span className="text-[0.65rem] font-mono uppercase tracking-widest text-muted">
                    Payment: <strong className="text-ink ml-1">{o.paymentId}</strong>
                  </span>
                  <span className="font-bold text-ink font-mono text-lg">
                    ₹{o.totalAmount}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* COOK KITCHEN VIEW */}
      {user.role === 'COOK' && (
        <div className="space-y-8">
          {/* Item Availability Toggle Panel */}
          <div className="bg-card p-6 sm:p-8 border border-border shadow-sm">
            <h3 className="text-xl font-serif font-bold text-ink italic mb-6 flex items-center gap-3">
              <ChefHat className="w-6 h-6 text-ink" /> Menu Availability Controls
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {menuItems.map((item) => (
                <div
                  key={item._id}
                  className="p-4 bg-paper border border-border flex flex-col justify-between gap-3 shadow-sm hover:border-ink/30 transition-colors"
                >
                  <span className="font-bold font-sans text-sm text-ink truncate block" title={item.name}>{item.name}</span>
                  <button
                    onClick={() => handleToggleItem(item._id)}
                    className={`px-3 py-1.5 font-bold text-[0.65rem] font-mono uppercase tracking-widest transition-colors border-2 w-full ${
                      item.available
                        ? 'border-green bg-green/10 text-green hover:bg-green hover:text-paper'
                        : 'border-accent bg-accent/10 text-accent hover:bg-accent hover:text-paper'
                    }`}
                  >
                    {item.available ? 'In Stock' : 'Sold Out'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Kitchen Orders Kanban */}
          <div className="space-y-6">
            <h3 className="text-2xl font-serif font-bold text-ink flex items-center gap-2">
              <Flame className="w-6 h-6 text-accent" /> Live Kitchen Orders Board
            </h3>

            {kitchenOrders.length === 0 ? (
              <div className="bg-card p-12 text-center border border-border text-muted text-sm">
                No active orders right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {kitchenOrders.map((o) => (
                  <div
                    key={o._id}
                    className="bg-paper p-6 border-2 border-border shadow-sm flex flex-col justify-between h-full"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <span className="text-[0.75rem] font-mono font-bold text-ink tracking-widest uppercase">
                          #{o._id.substring(o._id.length - 5)}
                        </span>
                        {getOrderStatusBadge(o.orderStatus)}
                      </div>

                      <div className="text-sm font-bold font-sans text-ink">
                        {o.studentId?.name} <span className="text-muted font-mono font-normal">({o.studentId?.rollNumber || 'CS'})</span>
                      </div>

                      <div className="space-y-2 bg-card p-4 border border-border">
                        {o.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm text-ink font-sans">
                            <span>{item.name}</span>
                            <span className="font-bold text-accent font-mono">
                              x{item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-6 mt-auto">
                      {o.orderStatus === 'placed' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(o._id, 'accepted')}
                          className="w-full py-3 bg-ink hover:bg-ink/90 text-paper font-bold text-xs uppercase tracking-widest font-mono transition-colors border border-ink/50"
                        >
                          Accept Order ✓
                        </button>
                      )}
                      {o.orderStatus === 'accepted' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(o._id, 'preparing')}
                          className="w-full py-3 bg-gold hover:bg-gold/90 text-ink font-bold text-xs uppercase tracking-widest font-mono transition-colors border border-gold/50"
                        >
                          Start Preparing 🍳
                        </button>
                      )}
                      {o.orderStatus === 'preparing' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(o._id, 'ready')}
                          className="w-full py-3 bg-green hover:bg-green/90 text-paper font-bold text-xs uppercase tracking-widest font-mono transition-colors"
                        >
                          Mark Ready 🔔
                        </button>
                      )}
                      {o.orderStatus === 'ready' && (
                        <div className="text-center text-xs text-green font-bold uppercase tracking-widest font-mono p-3 border border-green/30 bg-green/10">
                          Ready for Pickup!
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RAZORPAY TEST PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-paper p-8 border border-border shadow-2xl relative">
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-6 right-6 text-muted hover:text-ink transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center space-x-2 text-ink mb-4">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-[0.65rem] font-mono font-bold uppercase tracking-widest">
                Razorpay Test Mode
              </span>
            </div>

            <h3 className="text-3xl font-bold font-serif text-ink italic">
              Payment
            </h3>
            <p className="text-xs font-sans text-muted mt-2">
              Test mode signature validation. No real money will be charged.
            </p>

            <div className="bg-card p-6 border-y-2 border-ink my-6 flex items-center justify-between">
              <span className="text-[0.65rem] font-mono uppercase tracking-widest text-muted">Payable Amount:</span>
              <span className="text-3xl font-bold text-ink font-mono">
                ₹{cartTotal}
              </span>
            </div>

            <div className="space-y-3 mb-8">
              <div className="text-[0.65rem] font-mono uppercase tracking-widest font-bold text-ink">Select Test Method</div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`p-3 text-xs font-bold uppercase tracking-widest transition-colors border-2 ${
                    paymentMethod === 'UPI'
                      ? 'border-ink bg-ink text-paper'
                      : 'border-border bg-transparent text-muted hover:border-ink/30 hover:text-ink'
                  }`}
                >
                  UPI / GPay
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  className={`p-3 text-xs font-bold uppercase tracking-widest transition-colors border-2 ${
                    paymentMethod === 'CARD'
                      ? 'border-ink bg-ink text-paper'
                      : 'border-border bg-transparent text-muted hover:border-ink/30 hover:text-ink'
                  }`}
                >
                  Card
                </button>
              </div>
            </div>

            <MagneticButton
              onClick={handlePayment}
              disabled={paymentProcessing}
              className="w-full !py-4 flex items-center justify-center gap-3"
            >
              {paymentProcessing ? (
                <>
                  <Clock className="w-5 h-5 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" /> Pay ₹{cartTotal}
                </>
              )}
            </MagneticButton>
          </div>
        </div>
      )}
    </div>
  );
}
