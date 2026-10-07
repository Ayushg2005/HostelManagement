const express = require('express');
const router = express.Router();
const {
  getMenuItems,
  createMenuItem,
  toggleMenuItem,
  placeOrder,
  getMyOrders,
  getKitchenOrders,
  updateOrderStatus,
  createRazorpayOrder,
  verifyRazorpayPayment,
} = require('../controllers/canteenController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/menu', protect, getMenuItems);
router.post('/menu', protect, authorize('COOK', 'ADMIN'), createMenuItem);
router.patch('/menu/:id/toggle', protect, authorize('COOK', 'ADMIN'), toggleMenuItem);

router.post('/orders', protect, authorize('STUDENT'), placeOrder);
router.post('/orders/razorpay/create', protect, authorize('STUDENT'), createRazorpayOrder);
router.post('/orders/razorpay/verify', protect, authorize('STUDENT'), verifyRazorpayPayment);

router.get('/orders/my', protect, authorize('STUDENT'), getMyOrders);
router.get('/orders/kitchen', protect, authorize('COOK', 'ADMIN'), getKitchenOrders);
router.patch('/orders/:id/status', protect, authorize('COOK', 'ADMIN'), updateOrderStatus);

module.exports = router;
