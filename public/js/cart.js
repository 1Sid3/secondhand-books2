// Declare the checkAuthStatus function or import it before using it
async function checkAuthStatus() {
  // Placeholder implementation for checkAuthStatus
  // This should be replaced with the actual implementation
  return null // Return null or a user object based on authentication status
}

document.addEventListener("DOMContentLoaded", () => {
  checkAuthStatus().then((user) => {
    if (!user) {
      alert("Please login to view cart")
      window.location.href = "/login.html"
    } else {
      loadCart()
    }
  })

  // Clear cart button
  document.getElementById("clearCartBtn").addEventListener("click", clearCart)

  // Checkout button (placeholder)
  document.getElementById("checkoutBtn").addEventListener("click", () => {
    alert("Checkout functionality coming soon! Contact sellers directly using their details.")
  })
})

async function loadCart() {
  try {
    const response = await fetch("/api/cart")
    const cart = await response.json()

    if (response.ok) {
      displayCart(cart)
    } else {
      console.error("Error loading cart:", cart.error)
    }
  } catch (error) {
    console.error("Error loading cart:", error)
  }
}

function displayCart(cart) {
  const cartItemsDiv = document.getElementById("cartItems")
  const cartTotalDiv = document.getElementById("cartTotal")

  if (!cart.items || cart.items.length === 0) {
    cartItemsDiv.innerHTML = `
            <div class="empty-cart">
                <h3>Your cart is empty</h3>
                <p>Start adding some books!</p>
                <a href="/" class="btn btn-primary">Browse Books</a>
            </div>
        `
    cartTotalDiv.innerHTML = ""
    return
  }

  cartItemsDiv.innerHTML = cart.items
    .map(
      (item) => `
        <div class="cart-item" data-book-id="${item.bookId._id}">
            <div class="item-image">
                ${
                  item.bookId.images && item.bookId.images.length > 0
                    ? `<img src="/uploads/${item.bookId.images[0]}" alt="${item.bookId.title}">`
                    : '<div class="no-image">📖</div>'
                }
            </div>
            <div class="item-details">
                <h3>${item.bookId.title}</h3>
                <p>by ${item.bookId.author}</p>
                <p>Condition: ${item.bookId.condition}</p>
                <p>City: ${item.bookId.city}</p>
            </div>
            <div class="item-quantity">
                <span class="quantity-label">Qty:</span>
                <div class="qty-input-group">
                    <button type="button" class="qty-btn" onclick="updateQuantity('${item.bookId._id}', ${item.quantity - 1})">−</button>
                    <input type="number" class="qty-input" value="${item.quantity}" readonly />
                    <button type="button" class="qty-btn" onclick="updateQuantity('${item.bookId._id}', ${item.quantity + 1})">+</button>
                </div>
            </div>
            <div class="item-price">
                <div class="unit-price">₹${item.price}</div>
                <div class="total-price">₹${item.total}</div>
            </div>
            <div class="item-actions">
                <button onclick="removeFromCart('${item.bookId._id}')" class="btn btn-danger">Remove</button>
            </div>
        </div>
    `,
    )
    .join("")

  cartTotalDiv.innerHTML = `
        <div class="total-summary">
            <h3>Cart Summary</h3>
            <div class="total-items">Total Items: ${cart.totalItems}</div>
            <div class="total-price">Total Price: ₹${cart.totalPrice}</div>
        </div>
    `
}

async function updateQuantity(bookId, newQuantity) {
  if (newQuantity <= 0) {
    if (confirm("Remove this item from cart?")) {
      await removeFromCart(bookId)
    }
    return
  }

  try {
    const response = await fetch("/api/cart/update", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bookId, quantity: newQuantity }),
    })

    const result = await response.json()

    if (response.ok) {
      loadCart()
      showNotification("Cart updated successfully", "success")
    } else {
      showNotification(result.error || "Failed to update cart", "error")
      loadCart() // Reload to show correct quantity
    }
  } catch (error) {
    console.error("Update quantity error:", error)
    showNotification("Error updating cart", "error")
  }
}

function showNotification(message, type) {
  const notification = document.createElement("div")
  notification.className = `notification ${type}`
  notification.textContent = message
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        border-radius: 15px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        background: ${type === "success" ? "rgba(38, 222, 129, 0.9)" : "rgba(231, 76, 60, 0.9)"};
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        animation: notificationSlide 0.5s ease-out;
    `

  document.body.appendChild(notification)

  setTimeout(() => {
    notification.style.animation = "notificationSlide 0.5s ease-out reverse"
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove()
      }
    }, 500)
  }, 3000)
}

// UPDATED - Simpler approach for removeFromCart
async function removeFromCart(bookId) {
  try {
    const response = await fetch(`/api/cart/remove/${bookId}`, {
      method: "DELETE",
    })

    const result = await response.json()

    if (response.ok) {
      loadCart() // Reload cart
      // Simple success feedback
      console.log("Item removed from cart")
    } else {
      alert(result.error || "Failed to remove item")
    }
  } catch (error) {
    console.error("Remove from cart error:", error)
    alert("Error removing item")
  }
}

// UPDATED - Simpler approach for clearCart
async function clearCart() {
  if (!confirm("Are you sure you want to clear your cart?")) {
    return
  }

  try {
    const response = await fetch("/api/cart/clear", {
      method: "DELETE",
    })

    const result = await response.json()

    if (response.ok) {
      loadCart() // Reload cart
      alert("Cart cleared successfully")
    } else {
      alert(result.error || "Failed to clear cart")
    }
  } catch (error) {
    console.error("Clear cart error:", error)
    alert("Error clearing cart")
  }
}
