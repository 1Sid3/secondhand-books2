const Cart = require("../models/Cart")
const BookListing = require("../models/BookListing")

const addToCart = async (req, res) => {
  try {
    const { bookId, quantity = 1 } = req.body
    const userId = req.session.userId

    // Find the book
    const book = await BookListing.findById(bookId)
    if (!book) {
      return res.status(404).json({ error: "Book not found" })
    }

    const requestedQuantity = parseInt(quantity)

    // CRITICAL: Check if book is out of stock
    if (book.quantity === 0) {
      return res.status(400).json({
        error: "Book is out of stock",
        message: `${book.title} is currently unavailable. Stock quantity is 0.`,
        availableQuantity: 0,
      })
    }

    // Check if requested quantity exceeds available stock
    if (requestedQuantity > book.quantity) {
      return res.status(400).json({
        error: `Only ${book.quantity} unit(s) available. Cannot add ${requestedQuantity} to cart.`,
        availableQuantity: book.quantity,
      })
    }

    if (requestedQuantity <= 0) {
      return res.status(400).json({ error: "Quantity must be at least 1" })
    }

    // Find or create cart for user
    let cart = await Cart.findOne({ userId })
    if (!cart) {
      cart = new Cart({ userId, items: [], totalPrice: 0, totalItems: 0 })
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex((item) => item.bookId.toString() === bookId)

    if (existingItemIndex > -1) {
      const newTotalQuantity = cart.items[existingItemIndex].quantity + requestedQuantity

      // Validate total quantity in cart doesn't exceed available stock
      if (newTotalQuantity > book.quantity) {
        return res.status(400).json({
          error: `Only ${book.quantity} unit(s) available. Current cart has ${cart.items[existingItemIndex].quantity}, cannot add ${requestedQuantity} more.`,
          availableQuantity: book.quantity,
          currentQuantity: cart.items[existingItemIndex].quantity,
        })
      }

      cart.items[existingItemIndex].quantity = newTotalQuantity
      cart.items[existingItemIndex].total = cart.items[existingItemIndex].quantity * cart.items[existingItemIndex].price
    } else {
      // Add new item
      cart.items.push({
        bookId,
        quantity: requestedQuantity,
        price: book.price,
        total: book.price * requestedQuantity,
      })
    }

    // Recalculate totals
    cart.totalPrice = cart.items.reduce((total, item) => total + item.total, 0)
    cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0)

    await cart.save()

    res.status(200).json({
      message: "Item added to cart",
      cart,
      totalItems: cart.totalItems,
    })
  } catch (error) {
    console.error("Add to cart error:", error)
    res.status(500).json({ error: "Error adding item to cart" })
  }
}

const getCart = async (req, res) => {
  try {
    const userId = req.session.userId

    const cart = await Cart.findOne({ userId }).populate("items.bookId", "title author price images city condition quantity")

    if (!cart) {
      return res.status(200).json({
        items: [],
        totalPrice: 0,
        totalItems: 0,
      })
    }

    // Filter out items where the book is now out of stock or has insufficient quantity
    const validItems = cart.items.filter(item => {
      if (!item.bookId) return false
      const availableQuantity = item.bookId.quantity || 0
      
      // If book is out of stock or cart quantity exceeds available, remove from cart
      if (availableQuantity === 0) {
        console.log(`Removing out of stock item: ${item.bookId.title}`)
        return false
      }
      
      // If cart has more than available, adjust quantity
      if (item.quantity > availableQuantity) {
        console.log(`Adjusting quantity for ${item.bookId.title}: ${item.quantity} -> ${availableQuantity}`)
        item.quantity = availableQuantity
        item.total = item.quantity * item.price
      }
      
      return true
    })

    // Update cart if items were filtered
    if (validItems.length !== cart.items.length) {
      cart.items = validItems
      cart.totalPrice = cart.items.reduce((total, item) => total + item.total, 0)
      cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0)
      await cart.save()
    }

    res.status(200).json(cart)
  } catch (error) {
    console.error("Get cart error:", error)
    res.status(500).json({ error: "Error fetching cart" })
  }
}

const updateCartItem = async (req, res) => {
  try {
    const { bookId, quantity } = req.body
    const userId = req.session.userId

    const cart = await Cart.findOne({ userId })
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" })
    }

    const itemIndex = cart.items.findIndex((item) => item.bookId.toString() === bookId)

    if (itemIndex === -1) {
      return res.status(404).json({ error: "Item not found in cart" })
    }

    const book = await BookListing.findById(bookId)
    if (!book) {
      return res.status(404).json({ error: "Book not found" })
    }

    // Check if book is out of stock
    if (book.quantity === 0) {
      // Remove item from cart if out of stock
      cart.items.splice(itemIndex, 1)
      cart.totalPrice = cart.items.reduce((total, item) => total + item.total, 0)
      cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0)
      await cart.save()

      return res.status(400).json({
        error: `${book.title} is now out of stock and has been removed from your cart.`,
        availableQuantity: 0,
        cart,
      })
    }

    const newQuantity = parseInt(quantity)

    // Validate new quantity against available stock
    if (newQuantity > book.quantity) {
      return res.status(400).json({
        error: `Only ${book.quantity} unit(s) available for this book.`,
        availableQuantity: book.quantity,
      })
    }

    if (newQuantity <= 0) {
      // Remove item if quantity is 0 or less
      cart.items.splice(itemIndex, 1)
    } else {
      // Update quantity
      cart.items[itemIndex].quantity = newQuantity
      cart.items[itemIndex].total = cart.items[itemIndex].quantity * cart.items[itemIndex].price
    }

    // Recalculate totals
    cart.totalPrice = cart.items.reduce((total, item) => total + item.total, 0)
    cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0)

    await cart.save()

    res.status(200).json({
      message: "Cart updated",
      cart,
    })
  } catch (error) {
    console.error("Update cart error:", error)
    res.status(500).json({ error: "Error updating cart" })
  }
}

const removeFromCart = async (req, res) => {
  try {
    const { bookId } = req.params
    const userId = req.session.userId

    const cart = await Cart.findOne({ userId })
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" })
    }

    cart.items = cart.items.filter((item) => item.bookId.toString() !== bookId)

    // Recalculate totals
    cart.totalPrice = cart.items.reduce((total, item) => total + item.total, 0)
    cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0)

    await cart.save()

    res.status(200).json({
      message: "Item removed from cart",
      cart,
    })
  } catch (error) {
    console.error("Remove from cart error:", error)
    res.status(500).json({ error: "Error removing item from cart" })
  }
}

const clearCart = async (req, res) => {
  try {
    const userId = req.session.userId

    await Cart.findOneAndUpdate({ userId }, { items: [], totalPrice: 0, totalItems: 0 })

    res.status(200).json({
      message: "Cart cleared",
      items: [],
      totalPrice: 0,
      totalItems: 0,
    })
  } catch (error) {
    console.error("Clear cart error:", error)
    res.status(500).json({ error: "Error clearing cart" })
  }
}

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
}