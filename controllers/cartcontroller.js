const Cart = require('../models/Cart');
const BookListing = require('../models/BookListing');

const addToCart = async (req, res) => {
  try {
    const { bookId, quantity = 1 } = req.body;
    const userId = req.session.userId;

    // Find the book
    const book = await BookListing.findById(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Find or create cart for user
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [], totalPrice: 0, totalItems: 0 });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(item => 
      item.bookId.toString() === bookId
    );

    if (existingItemIndex > -1) {
      // Update existing item
      cart.items[existingItemIndex].quantity += parseInt(quantity);
      cart.items[existingItemIndex].total = 
        cart.items[existingItemIndex].quantity * cart.items[existingItemIndex].price;
    } else {
      // Add new item
      cart.items.push({
        bookId,
        quantity: parseInt(quantity),
        price: book.price,
        total: book.price * parseInt(quantity)
      });
    }

    // Recalculate totals
    cart.totalPrice = cart.items.reduce((total, item) => total + item.total, 0);
    cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);

    await cart.save();
    
    res.status(200).json({
      message: 'Item added to cart',
      cart,
      totalItems: cart.totalItems
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Error adding item to cart' });
  }
};

const getCart = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const cart = await Cart.findOne({ userId })
      .populate('items.bookId', 'title author price images city condition');
    
    if (!cart) {
      return res.status(200).json({ 
        items: [], 
        totalPrice: 0, 
        totalItems: 0 
      });
    }
    
    res.status(200).json(cart);
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Error fetching cart' });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const { bookId, quantity } = req.body;
    const userId = req.session.userId;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => 
      item.bookId.toString() === bookId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      cart.items.splice(itemIndex, 1);
    } else {
      // Update quantity
      cart.items[itemIndex].quantity = parseInt(quantity);
      cart.items[itemIndex].total = 
        cart.items[itemIndex].quantity * cart.items[itemIndex].price;
    }

    // Recalculate totals
    cart.totalPrice = cart.items.reduce((total, item) => total + item.total, 0);
    cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);

    await cart.save();
    
    res.status(200).json({
      message: 'Cart updated',
      cart
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ error: 'Error updating cart' });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.session.userId;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => 
      item.bookId.toString() !== bookId
    );

    // Recalculate totals
    cart.totalPrice = cart.items.reduce((total, item) => total + item.total, 0);
    cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);

    await cart.save();
    
    res.status(200).json({
      message: 'Item removed from cart',
      cart
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
  }
};

const clearCart = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    await Cart.findOneAndUpdate(
      { userId },
      { items: [], totalPrice: 0, totalItems: 0 }
    );
    
    res.status(200).json({
      message: 'Cart cleared',
      items: [],
      totalPrice: 0,
      totalItems: 0
    });
  } catch (error) {
    console.error('Clear cart error:', error);
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart
};
