const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance lazily or use environment variables
const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
  });
};

// @desc    Get all canteen menu items
// @route   GET /api/canteen/menu
// @access  Private
const getMenuItems = async (req, res) => {
  try {
    const items = await MenuItem.find().sort({ category: 1, name: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new menu item
// @route   POST /api/canteen/menu
// @access  Private (Cook/Admin)
const createMenuItem = async (req, res) => {
  try {
    const { name, price, category, imageUrl } = req.body;
    const item = await MenuItem.create({
      name,
      price,
      category,
      imageUrl: imageUrl || '',
      available: true,
    });

    if (req.io) req.io.emit('canteen:menu_updated');
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle menu item availability
// @route   PATCH /api/canteen/menu/:id/toggle
// @access  Private (Cook/Admin)
const toggleMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Menu item not found' });

    item.available = !item.available;
    await item.save();

    if (req.io) req.io.emit('canteen:menu_updated', item);
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create Razorpay Order
// @route   POST /api/canteen/orders/razorpay/create
// @access  Private (Student)
const createRazorpayOrder = async (req, res) => {
  try {
    const { totalAmount } = req.body;
    if (!totalAmount) {
      return res.status(400).json({ message: 'Amount is required' });
    }

    const rzp = getRazorpayInstance();
    const options = {
      amount: totalAmount * 100, // amount in smallest currency unit (paise)
      currency: 'INR',
      receipt: `receipt_order_${Date.now()}`,
    };

    const order = await rzp.orders.create(options);
    res.json({
      ...order,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Razorpay Create Order Error:', error);
    res.status(500).json({ message: error.message || 'Failed to create Razorpay order' });
  }
};

// @desc    Verify Razorpay Payment & Place Order
// @route   POST /api/canteen/orders/razorpay/verify
// @access  Private (Student)
const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, items, totalAmount } = req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';
    
    // Verify signature
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
      return res.status(400).json({ message: 'Transaction is not legit!' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order items cannot be empty' });
    }

    const order = await Order.create({
      studentId: req.user._id,
      items,
      totalAmount,
      paymentStatus: 'paid',
      paymentId: razorpay_payment_id,
      orderStatus: 'placed',
    });

    const populatedOrder = await Order.findById(order._id).populate(
      'studentId',
      'name email rollNumber'
    );

    // Emit live socket event to Cook / Kitchen dashboard
    if (req.io) {
      req.io.emit('order:new', populatedOrder);
    }

    res.status(201).json(populatedOrder);
  } catch (error) {
    console.error('Razorpay Verify Error:', error);
    res.status(500).json({ message: error.message || 'Failed to verify payment' });
  }
};

// @desc    Place canteen order after successful payment simulation
// @route   POST /api/canteen/orders
// @access  Private (Student)
const placeOrder = async (req, res) => {
  try {
    const { items, totalAmount, paymentId } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order items cannot be empty' });
    }

    const order = await Order.create({
      studentId: req.user._id,
      items,
      totalAmount,
      paymentStatus: 'paid',
      paymentId: paymentId || `pay_test_${Date.now()}`,
      orderStatus: 'placed',
    });

    const populatedOrder = await Order.findById(order._id).populate(
      'studentId',
      'name email rollNumber'
    );

    // Emit live socket event to Cook / Kitchen dashboard
    if (req.io) {
      req.io.emit('order:new', populatedOrder);
    }

    res.status(201).json(populatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get student's order history
// @route   GET /api/canteen/orders/my
// @access  Private (Student)
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ studentId: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get active orders for Kitchen dashboard
// @route   GET /api/canteen/orders/kitchen
// @access  Private (Cook/Admin)
const getKitchenOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      orderStatus: { $in: ['placed', 'preparing', 'ready'] },
    })
      .populate('studentId', 'name email rollNumber')
      .sort({ createdAt: 1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order status by Cook (placed -> preparing -> ready -> delivered)
// @route   PATCH /api/canteen/orders/:id/status
// @access  Private (Cook/Admin)
const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.orderStatus = orderStatus;
    await order.save();

    const updatedOrder = await Order.findById(order._id).populate(
      'studentId',
      'name email rollNumber'
    );

    // Socket update to Student
    if (req.io) {
      req.io.emit('order:status_changed', updatedOrder);
    }

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMenuItems,
  createMenuItem,
  toggleMenuItem,
  placeOrder,
  getMyOrders,
  getKitchenOrders,
  updateOrderStatus,
  createRazorpayOrder,
  verifyRazorpayPayment,
};
