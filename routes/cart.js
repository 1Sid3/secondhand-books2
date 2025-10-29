const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authGuard = require('../middleware/authGuard');

router.post('/add', authGuard, cartController.addToCart);
router.get('/', authGuard, cartController.getCart);
router.put('/update', authGuard, cartController.updateCartItem);
router.delete('/remove/:bookId', authGuard, cartController.removeFromCart);
router.delete('/clear', authGuard, cartController.clearCart);

module.exports = router;
