let currentBookId = null
let currentBooks = []
let purchaseNotifications = [] // Store purchase notifications

document.addEventListener("DOMContentLoaded", () => {
  console.log("Admin panel loading...")

  // Check admin authentication
  if (!checkAdminAuth()) {
    return // Will redirect to login
  }

  // Setup admin dashboard
  setupNavigation()
  setupFormHandlers()
  setupLogout()
  setupSearchAndFilters()

  // Load initial data - start with inventory
  setTimeout(() => {
    loadInventory()
    loadPurchaseNotifications()
  }, 500)
})

// Authentication Functions
function checkAdminAuth() {
  try {
    const adminSession = localStorage.getItem("adminSession")
    if (!adminSession) {
      redirectToLogin()
      return false
    }

    const session = JSON.parse(adminSession)

    // Check if session is valid (less than 24 hours old)
    const loginTime = new Date(session.loginTime)
    const now = new Date()
    const hoursDiff = (now - loginTime) / (1000 * 60 * 60)

    if (hoursDiff > 24 || !session.isAdmin || session.username !== "ASR") {
      localStorage.removeItem("adminSession")
      redirectToLogin()
      return false
    }

    // Update welcome message
    updateAdminWelcome(session.username)
    return true
  } catch (error) {
    console.error("Auth error:", error)
    localStorage.removeItem("adminSession")
    redirectToLogin()
    return false
  }
}

function redirectToLogin() {
  alert("Admin access required. Please login with admin credentials.")
  window.location.href = "/admin-login.html"
}

function updateAdminWelcome(username) {
  const adminHeader = document.querySelector(".admin-logo")
  if (adminHeader) {
    adminHeader.innerHTML = `
            <h2>BookTrade Admin</h2>
            <p style="color: #bdc3c7; margin: 5px 0 0 0; font-size: 0.9rem;">
                Welcome, ${username}
            </p>
        `
  }
}

// Navigation Functions
function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item[data-section]")
  console.log("Found nav items:", navItems.length)

  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault()
      const section = item.dataset.section
      console.log("Clicked section:", section)
      switchSection(section)

      // Update active nav item
      navItems.forEach((nav) => nav.classList.remove("active"))
      item.classList.add("active")
    })
  })

  // Setup "Back to Site" navigation
  const backToSiteBtn = document.querySelector('.nav-item[href="/"]')
  if (backToSiteBtn) {
    backToSiteBtn.addEventListener("click", (e) => {
      e.preventDefault()
      window.open("/", "_blank")
    })
  }
}

function switchSection(sectionId) {
  console.log("Switching to section:", sectionId)

  // Hide all sections
  document.querySelectorAll(".admin-section").forEach((section) => {
    section.classList.remove("active")
  })

  // Show target section
  const targetSection = document.getElementById(sectionId)
  if (targetSection) {
    targetSection.classList.add("active")
    console.log("Activated section:", sectionId)
  } else {
    console.error("Section not found:", sectionId)
  }

  // Load section-specific data
  switch (sectionId) {
    case "inventory":
      loadInventory()
      break
    case "purchases":
      loadPurchaseNotifications()
      break
  }
}

// ENHANCED Inventory Management Functions with Multiple API Endpoint Support
async function loadInventory() {
  try {
    console.log("Loading inventory...")

    // Show loading state
    const tbody = document.getElementById("inventoryTableBody")
    if (tbody) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center" style="padding: 40px; color: #7f8c8d;">
                        <div style="font-size: 1.2rem;">
                            <div style="margin-bottom: 10px;">Loading books...</div>
                            <div style="font-size: 0.9rem; opacity: 0.7;">Trying different API endpoints...</div>
                        </div>
                    </td>
                </tr>
            `
    }

    let books = []
    let successEndpoint = null

    // Try different API endpoints in order of preference
    const endpoints = ["/api/listings", "/api/books", "/api/getAllBooks", "/listings", "/books"]

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`)

        const response = await fetch(endpoint)
        console.log(`${endpoint} - Status: ${response.status}, OK: ${response.ok}`)

        if (response.ok) {
          const data = await response.json()
          console.log(`${endpoint} - Data:`, data)

          // Try to extract books from different response formats
          const extractedBooks = extractBooksFromResponse(data)

          if (extractedBooks && extractedBooks.length > 0) {
            books = extractedBooks
            successEndpoint = endpoint
            console.log(`Successfully loaded ${books.length} books from ${endpoint}`)
            break
          } else if (extractedBooks && extractedBooks.length === 0) {
            // API works but no books found
            console.log(`${endpoint} works but returned no books`)
            successEndpoint = endpoint
            break
          }
        } else {
          console.log(`${endpoint} failed with status: ${response.status}`)
        }
      } catch (endpointError) {
        console.log(`${endpoint} error:`, endpointError.message)
      }
    }

    if (successEndpoint) {
      console.log(`Using endpoint: ${successEndpoint}`)

      // Validate and clean book data
      const validBooks = books
        .filter((book, index) => {
          const isValid = book && typeof book === "object" && (book.title || book.name) && (book.author || book.writer)

          if (!isValid) {
            console.warn(`Invalid book at index ${index}:`, book)
          }

          return isValid
        })
        .map((book) => ({
          // Normalize book properties
          _id: book._id || book.id || `book-${Date.now()}-${Math.random()}`,
          title: book.title || book.name || "Untitled",
          author: book.author || book.writer || "Unknown Author",
          price: Number.parseFloat(book.price) || 0,
          quantity: Number.parseInt(book.quantity) || Number.parseInt(book.stock) || 1,
          condition: book.condition || "good",
          category: book.category || "other",
        }))

      console.log(`Valid books after processing: ${validBooks.length}`)

      displayInventory(validBooks)
      currentBooks = validBooks

      if (validBooks.length > 0) {
        showNotification(`Loaded ${validBooks.length} books from ${successEndpoint}`, "success")
      } else {
        showNotification('No books found. Add some books using "Sell Book" form.', "info")
      }
    } else {
      throw new Error("All API endpoints failed. Check server configuration.")
    }
  } catch (error) {
    console.error("Error loading inventory:", error)

    // Try to load from localStorage as fallback
    const localBooks = localStorage.getItem("localBooks")
    if (localBooks) {
      try {
        const books = JSON.parse(localBooks)
        if (Array.isArray(books) && books.length > 0) {
          console.log("Loading books from localStorage backup")
          displayInventory(books)
          currentBooks = books
          showNotification(`Loaded ${books.length} books from local backup. Server connection failed`, "warning")
          return
        }
      } catch (localError) {
        console.error("Local storage error:", localError)
      }
    }

    // Show empty state with error info
    displayInventory([])

    showNotification(
      `Failed to load books. Possible causes: Server not running, Database connection issue, API endpoint changed. Error: ${error.message}`,
      "error",
    )
  }
}

// Helper function to extract books from different response formats
function extractBooksFromResponse(data) {
  console.log("Extracting books from response:", typeof data, Array.isArray(data))

  if (Array.isArray(data)) {
    // Direct array format: [book1, book2, ...]
    console.log("Format: Direct array")
    return data
  } else if (data && typeof data === "object") {
    // Try different property names
    const possibleKeys = ["listings", "books", "data", "results", "items", "products"]

    for (const key of possibleKeys) {
      if (data[key] && Array.isArray(data[key])) {
        console.log(`Format: {${key}: [...]}`)
        return data[key]
      }
    }

    // If no array property found, log available keys
    console.log("Available keys in response:", Object.keys(data))

    // Check if it's a single book object
    if (data.title || data.name) {
      console.log("Format: Single book object")
      return [data]
    }
  }

  console.log("Could not extract books from response")
  return []
}

// NEW: Function to actually update stock in database
async function updateBookStockInDatabase(bookId, newStock, reason) {
  try {
    // Try multiple API endpoints for updating stock
    const endpoints = [
      `/api/books/${bookId}/stock`,
      `/api/listings/${bookId}/stock`,
      `/api/books/${bookId}`,
      `/api/listings/${bookId}`,
    ]

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying to update stock via: ${endpoint}`)

        const response = await fetch(endpoint, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            quantity: newStock,
            stock: newStock,
            reason: reason,
            updatedBy: "admin",
            updatedAt: new Date().toISOString(),
          }),
        })

        if (response.ok) {
          const data = await response.json()
          console.log(`Stock updated successfully via ${endpoint}:`, data)
          return { success: true, data: data }
        } else {
          console.log(`${endpoint} failed with status: ${response.status}`)
        }
      } catch (endpointError) {
        console.log(`${endpoint} error:`, endpointError.message)
      }
    }

    // If all API calls fail, try PATCH method
    try {
      const response = await fetch(`/api/listings/${bookId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quantity: newStock,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Stock updated via PATCH:", data)
        return { success: true, data: data }
      }
    } catch (patchError) {
      console.log("PATCH method failed:", patchError.message)
    }

    // If no API endpoint works, return error
    return {
      success: false,
      message: "All stock update endpoints failed. Check your backend API configuration.",
    }
  } catch (error) {
    console.error("Database update error:", error)
    return {
      success: false,
      message: error.message,
    }
  }
}

// ENHANCED Test API Connection Function
async function testAPIConnection() {
  console.log("=== COMPREHENSIVE API TEST ===")
  showNotification("Testing all possible API endpoints...", "info")

  const endpoints = [
    "/api/listings",
    "/api/books",
    "/api/getAllBooks",
    "/listings",
    "/books",
    "/", // Test server connection
  ]

  const results = []

  for (const endpoint of endpoints) {
    try {
      console.log(`\nTesting: ${endpoint}`)

      const response = await fetch(endpoint)
      const status = response.status
      const ok = response.ok
      const contentType = response.headers.get("content-type") || "unknown"

      let data = null
      let dataInfo = "No data"

      if (ok && contentType.includes("application/json")) {
        try {
          data = await response.json()

          if (Array.isArray(data)) {
            dataInfo = `Array with ${data.length} items`
          } else if (data && typeof data === "object") {
            const keys = Object.keys(data)
            dataInfo = `Object with keys: ${keys.join(", ")}`

            // Check for arrays in the object
            const arrayKeys = keys.filter((key) => Array.isArray(data[key]))
            if (arrayKeys.length > 0) {
              dataInfo += `\nArray properties: ${arrayKeys.map((key) => `${key}(${data[key].length})`).join(", ")}`
            }
          } else {
            dataInfo = `${typeof data}: ${String(data).substring(0, 50)}`
          }
        } catch (jsonError) {
          dataInfo = `JSON parse error: ${jsonError.message}`
        }
      } else if (ok) {
        dataInfo = `Non-JSON response (${contentType})`
      }

      results.push({
        endpoint,
        status,
        ok,
        contentType,
        dataInfo,
      })

      console.log(`${endpoint}:`, {
        status,
        ok,
        contentType,
        dataInfo,
      })

      // If this looks like a working books endpoint, save the data
      if (ok && data && (Array.isArray(data) || (data.listings && Array.isArray(data.listings)))) {
        console.log(`Saving working endpoint data from ${endpoint}`)
        const books = extractBooksFromResponse(data)
        if (books.length > 0) {
          localStorage.setItem("localBooks", JSON.stringify(books))
          console.log(`Saved ${books.length} books to localStorage`)
        }
      }
    } catch (error) {
      results.push({
        endpoint,
        status: "ERROR",
        ok: false,
        contentType: "N/A",
        dataInfo: `Error: ${error.message}`,
      })

      console.log(`${endpoint}: ${error.message}`)
    }
  }

  // Display results
  console.log("\n=== TEST RESULTS SUMMARY ===")
  console.table(results)

  const workingEndpoints = results.filter((r) => r.ok)
  const bookEndpoints = results.filter((r) => r.ok && (r.dataInfo.includes("Array") || r.dataInfo.includes("listings")))

  if (bookEndpoints.length > 0) {
    showNotification(
      `Found ${bookEndpoints.length} working book endpoints! Best: ${bookEndpoints[0].endpoint}`,
      "success",
    )
  } else if (workingEndpoints.length > 0) {
    showNotification(
      `Server is running but no book endpoints found. Working: ${workingEndpoints.map((e) => e.endpoint).join(", ")}`,
      "warning",
    )
  } else {
    showNotification("No endpoints are working. Check if server is running.", "error")
  }

  console.log("=== END API TEST ===")
}

// Add sample data function for testing
function loadSampleData() {
  console.log("Loading sample data for testing...")

  const sampleBooks = [
    {
      _id: "sample-1",
      title: "Engineering Mathematics-1",
      author: "G.V KUMBHOJKAR",
      price: 600,
      quantity: 2,
      condition: "good",
    },
    {
      _id: "sample-2",
      title: "Data Structures and Algorithms",
      author: "Thomas Cormen",
      price: 800,
      quantity: 1,
      condition: "like-new",
    },
    {
      _id: "sample-3",
      title: "Operating System Concepts",
      author: "Abraham Silberschatz",
      price: 750,
      quantity: 0,
      condition: "good",
    },
  ]

  displayInventory(sampleBooks)
  currentBooks = sampleBooks
  showNotification("Sample books loaded (for testing purposes)", "info")
}

// Test function for stock update
async function testStockUpdate() {
  if (currentBooks.length === 0) {
    showNotification("No books available to test. Load inventory first.", "warning")
    return
  }

  const testBook = currentBooks[0]
  const currentStock = testBook.quantity || 1
  const newStock = Math.max(0, currentStock - 1)

  console.log(`Testing stock update for: ${testBook.title}`)
  console.log(`Current stock: ${currentStock}, New stock: ${newStock}`)

  const result = await updateBookStockInDatabase(testBook._id, newStock, "Test update")

  if (result.success) {
    showNotification(`Test successful! Stock updated for "${testBook.title}"`, "success")
    loadInventory() // Reload to see changes
  } else {
    showNotification(`Test failed: ${result.message}`, "error")
  }
}

// ENHANCED Display Inventory Function
function displayInventory(inventory) {
  const tbody = document.getElementById("inventoryTableBody")

  if (!tbody) {
    console.error("inventoryTableBody element not found!")
    showNotification("Admin table not found in HTML", "error")
    return
  }

  console.log("Displaying inventory:", inventory)
  console.log("Inventory length:", inventory ? inventory.length : "null/undefined")

  if (!inventory || inventory.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center" style="padding: 40px; color: #7f8c8d;">
                    <div style="font-size: 3rem; margin-bottom: 20px;">📚</div>
                    <h3>No books found</h3>
                    <p>Books will appear here once they are added to the platform.</p>
                    <div style="margin-top: 20px;">
                        <a href="/sell.html" target="_blank" class="btn btn-primary" style="margin-right: 10px;">
                            Add First Book
                        </a>
                        <button onclick="loadInventory()" class="btn btn-secondary" style="margin-right: 10px;">
                            Refresh
                        </button>
                        <button onclick="testAPIConnection()" class="btn btn-info" style="margin-right: 10px;">
                            Test API
                        </button>
                        <button onclick="loadSampleData()" class="btn btn-warning" style="margin-right: 10px;">
                            Load Sample Data
                        </button>
                        <button onclick="testStockUpdate()" class="btn btn-danger">
                            Test Stock Update
                        </button>
                    </div>
                </td>
            </tr>
        `
    return
  }

  tbody.innerHTML = inventory
    .map((book, index) => {
      console.log(`Processing book ${index + 1}:`, book)

      // Handle missing properties gracefully
      const title = book.title || "Untitled"
      const author = book.author || "Unknown Author"
      const price = book.price || 0
      const quantity = book.quantity !== undefined ? book.quantity : 1
      const id = book._id || book.id || `book-${index}`

      const stockStatus = getStockStatus(quantity)

      return `
            <tr>
                <td>
                    <div style="font-weight: bold;">${escapeHtml(title)}</div>
                    <div style="font-size: 0.8rem; color: #7f8c8d;">ID: ${id}</div>
                </td>
                <td>${escapeHtml(author)}</td>
                <td style="text-align: center; font-weight: bold; font-size: 1.1rem;">
                    <span class="quantity-display">${quantity}</span>
                </td>
                <td style="color: #27ae60; font-weight: bold;">₹${Number(price).toLocaleString()}</td>
                <td><span class="status-badge status-${stockStatus.class}">${stockStatus.text}</span></td>
                <td>
                    <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                        <button class="btn btn-sm btn-primary" onclick="openUpdateStockModal('${id}', '${escapeHtml(title)}', ${quantity})" title="Update Stock">
                            Update
                        </button>
                        <button class="btn btn-sm btn-${quantity === 0 ? "danger" : "warning"}" onclick="deleteBook('${id}', '${escapeHtml(title)}')" title="${quantity === 0 ? "Delete Out of Stock Book" : "Delete Book"}">
                            ${quantity === 0 ? "Delete" : "Remove"}
                        </button>
                    </div>
                </td>
            </tr>
        `
    })
    .join("")

  console.log("Inventory table updated with", inventory.length, "books")
}

function getStockStatus(quantity) {
  if (quantity === 0) {
    return { class: "out-of-stock", text: "Out of Stock" }
  } else if (quantity <= 3) {
    return { class: "low-stock", text: "Low Stock" }
  } else {
    return { class: "in-stock", text: "In Stock" }
  }
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

// Purchase Notifications Functions
async function loadPurchaseNotifications() {
  const container = document.getElementById("purchaseNotifications")
  if (!container) return

  try {
    showNotification("Loading purchase notifications...", "info")

    // Fetch pending notifications from API
    const response = await fetch("/api/purchase-notifications?status=pending&limit=100")

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()
    const notifications = data.notifications || []

    purchaseNotifications = notifications

    if (notifications.length === 0) {
      container.innerHTML = `
                <div class="notification-placeholder">
                    <div style="text-align: center; padding: 60px 20px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="font-size: 4rem; margin-bottom: 20px;">📢</div>
                        <h3 style="color: #2c3e50; margin-bottom: 15px;">No Pending Purchase Notifications</h3>
                        <p style="color: #7f8c8d; margin-bottom: 20px;">When users submit purchase notifications, they will appear here for review.</p>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
                            <h4 style="color: #495057; margin-bottom: 10px;">How it works:</h4>
                            <ol style="text-align: left; color: #6c757d; max-width: 400px; margin: 0 auto;">
                                <li>Users buy books from sellers directly</li>
                                <li>Users submit purchase proof via "Report Purchase" page</li>
                                <li>Notifications appear here for admin review</li>
                                <li>Admin approves and updates book stock</li>
                            </ol>
                        </div>
                        
                        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 20px;">
                            <a href="/purchase-notification.html" target="_blank" class="btn btn-primary">
                                View Purchase Form
                            </a>
                            <button onclick="loadPurchaseNotifications()" class="btn btn-secondary">
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>
            `
    } else {
      displayPurchaseNotifications(notifications)
      showNotification(`Loaded ${notifications.length} pending purchase notification(s)`, "success")
    }
  } catch (error) {
    console.error("Error loading purchase notifications:", error)
    showNotification(`Failed to load notifications: ${error.message}`, "error")

    container.innerHTML = `
            <div style="text-align: center; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="color: #e74c3c; margin-bottom: 15px;">Error loading notifications</div>
                <p style="color: #7f8c8d; margin-bottom: 15px;">${error.message}</p>
                <button onclick="loadPurchaseNotifications()" class="btn btn-primary">Try Again</button>
            </div>
        `
  }
}

function displayPurchaseNotifications(notifications) {
  const container = document.getElementById("purchaseNotifications")

  container.innerHTML = notifications
    .map((notification) => {
      const proofUrl = notification.transactionProof
        ? `/uploads/transaction-proofs/${notification.transactionProof}`
        : null

      return `
            <div class="notification-item ${notification.status === "pending" ? "unread" : ""}" data-id="${notification._id}">
                <div class="notification-header">
                    <div class="notification-title">
                        <strong>Purchase: ${notification.bookTitle}</strong>
                        <span class="notification-status status-${notification.status}">${notification.status.toUpperCase()}</span>
                    </div>
                    <div class="notification-time">${formatDate(notification.createdAt)}</div>
                </div>
                <div class="notification-body">
                    <div class="notification-details">
                        <div><strong>Buyer:</strong> ${notification.buyerName || "Anonymous"}</div>
                        <div><strong>Author:</strong> ${notification.bookAuthor}</div>
                        <div><strong>Quantity:</strong> ${notification.quantity}</div>
                        <div><strong>Amount Paid:</strong> ₹${notification.amountPaid || "Not specified"}</div>
                        <div><strong>Payment Method:</strong> ${notification.paymentMethod || "Not specified"}</div>
                        ${notification.buyerEmail ? `<div><strong>Email:</strong> ${notification.buyerEmail}</div>` : ""}
                        ${notification.buyerPhone ? `<div><strong>Phone:</strong> ${notification.buyerPhone}</div>` : ""}
                        ${notification.notes ? `<div><strong>Notes:</strong> ${notification.notes}</div>` : ""}
                    </div>
                    ${
                      proofUrl
                        ? `<div class="proof-section">
                            <strong>Transaction Proof:</strong>
                            <div class="proof-preview">
                                <img src="${proofUrl}" alt="Transaction Proof" style="max-width: 200px; max-height: 150px; border-radius: 4px; border: 1px solid #ddd; margin-top: 10px;">
                            </div>
                        </div>`
                        : ""
                    }
                </div>
                <div class="notification-actions">
                    ${
                      notification.status === "pending"
                        ? `
                        <button class="btn btn-success btn-sm" onclick="approvePurchaseFromAPI('${notification._id}', '${notification.bookTitle}', ${notification.quantity})">
                            Approve & Update Stock
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="rejectPurchaseFromAPI('${notification._id}', '${notification.bookTitle}')">
                            Reject
                        </button>
                    `
                        : `
                        <button class="btn btn-secondary btn-sm" onclick="viewPurchaseDetails('${notification._id}')">
                            View Details
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="deletePurchaseNotificationFromAPI('${notification._id}')">
                            Delete
                        </button>
                    `
                    }
                </div>
            </div>
        `
    })
    .join("")
}

async function approvePurchaseFromAPI(notificationId, bookTitle, quantity) {
  if (
    !confirm(
      `Approve this purchase?\n\nBook: ${bookTitle}\nQuantity: ${quantity}\n\nThis will update the book stock in the database.`,
    )
  ) {
    return
  }

  try {
    showNotification("Processing purchase approval...", "info")

    const response = await fetch(`/api/purchase-notifications/${notificationId}/approve`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        processedBy: "admin",
      }),
    })

    const result = await response.json()

    if (response.ok) {
      showNotification(`Purchase approved! Stock updated successfully for "${bookTitle}"`, "success")
      loadPurchaseNotifications()
      loadInventory()
    } else {
      throw new Error(result.error || "Failed to approve purchase")
    }
  } catch (error) {
    console.error("Error approving purchase:", error)
    showNotification(`Error approving purchase: ${error.message}`, "error")
  }
}

async function rejectPurchaseFromAPI(notificationId, bookTitle) {
  const reason = prompt(`Reject this purchase?\n\nBook: ${bookTitle}\n\nPlease provide a reason:`, "Insufficient proof")
  if (!reason) return

  try {
    showNotification("Processing rejection...", "info")

    const response = await fetch(`/api/purchase-notifications/${notificationId}/reject`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: reason,
        processedBy: "admin",
      }),
    })

    const result = await response.json()

    if (response.ok) {
      showNotification(`Purchase rejected: ${reason}`, "warning")
      loadPurchaseNotifications()
    } else {
      throw new Error(result.error || "Failed to reject purchase")
    }
  } catch (error) {
    console.error("Error rejecting purchase:", error)
    showNotification(`Error rejecting purchase: ${error.message}`, "error")
  }
}

async function deletePurchaseNotificationFromAPI(notificationId) {
  if (!confirm("Delete this notification permanently?")) {
    return
  }

  try {
    showNotification("Deleting notification...", "info")

    const response = await fetch(`/api/purchase-notifications/${notificationId}`, {
      method: "DELETE",
    })

    const result = await response.json()

    if (response.ok) {
      showNotification("Notification deleted successfully", "success")
      loadPurchaseNotifications()
    } else {
      throw new Error(result.error || "Failed to delete notification")
    }
  } catch (error) {
    console.error("Error deleting notification:", error)
    showNotification(`Error deleting notification: ${error.message}`, "error")
  }
}

// Purchase Notifications Functions
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString() + " " + date.toLocaleTimeString()
}

// ENHANCED Purchase Notification Actions with Real Stock Update
async function approvePurchase(notificationId) {
  const notification = purchaseNotifications.find((n) => n.id === notificationId)
  if (!notification) return

  if (
    !confirm(
      `Approve this purchase?\n\nBook: ${notification.bookTitle}\nQuantity: ${notification.quantity}\n\nThis will update the book stock in the database.`,
    )
  ) {
    return
  }

  try {
    showNotification("Processing purchase approval...", "info")

    // Step 1: Find the book in current inventory to get its ID and current stock
    const book = currentBooks.find(
      (b) =>
        b.title.toLowerCase() === notification.bookTitle.toLowerCase() &&
        b.author.toLowerCase() === notification.bookAuthor.toLowerCase(),
    )

    if (!book) {
      throw new Error(
        `Book "${notification.bookTitle}" not found in inventory. Please check the title and author match exactly.`,
      )
    }

    const newStock = Math.max(0, (book.quantity || 1) - notification.quantity)

    console.log(`Updating stock for book ${book._id}: ${book.quantity} -> ${newStock}`)

    // Step 2: Make API call to update the book stock
    const updateResponse = await updateBookStockInDatabase(
      book._id,
      newStock,
      `Purchase approved: ${notification.quantity} copies sold`,
    )

    if (updateResponse.success) {
      // Step 3: Update notification status
      notification.status = "approved"
      notification.processedAt = new Date().toISOString()
      notification.bookId = book._id
      notification.stockBefore = book.quantity
      notification.stockAfter = newStock

      // Step 4: Save notification changes
      localStorage.setItem("purchaseNotifications", JSON.stringify(purchaseNotifications))

      // Step 5: Show success and refresh data
      showNotification(
        `Purchase approved! Stock updated from ${book.quantity} to ${newStock} for "${notification.bookTitle}"`,
        "success",
      )

      // Step 6: Reload both sections to show changes
      loadPurchaseNotifications()
      loadInventory() // This will show the updated stock
    } else {
      throw new Error(updateResponse.message || "Failed to update stock in database")
    }
  } catch (error) {
    console.error("Error approving purchase:", error)
    showNotification(`Error approving purchase: ${error.message}`, "error")
  }
}

async function rejectPurchase(notificationId) {
  const notification = purchaseNotifications.find((n) => n.id === notificationId)
  if (!notification) return

  const reason = prompt(
    `Reject this purchase?\n\nBook: ${notification.bookTitle}\nPlease provide a reason:`,
    "Insufficient proof",
  )
  if (!reason) return

  // Update notification status
  notification.status = "rejected"
  notification.rejectionReason = reason
  notification.processedAt = new Date().toISOString()

  // Save to localStorage
  localStorage.setItem("purchaseNotifications", JSON.stringify(purchaseNotifications))

  showNotification(`Purchase rejected: ${reason}`, "warning")
  loadPurchaseNotifications()
}

function deletePurchaseNotification(notificationId) {
  if (!confirm("Delete this notification permanently?")) {
    return
  }

  purchaseNotifications = purchaseNotifications.filter((n) => n.id !== notificationId)
  localStorage.setItem("purchaseNotifications", JSON.stringify(purchaseNotifications))

  showNotification("Notification deleted", "success")
  loadPurchaseNotifications()
}

function viewPurchaseDetails(notificationId) {
  const notification = purchaseNotifications.find((n) => n.id === notificationId)
  if (!notification) return

  alert(
    `Purchase Details:\n\nBook: ${notification.bookTitle}\nAuthor: ${notification.bookAuthor}\nBuyer: ${notification.buyerName || "Anonymous"}\nQuantity: ${notification.quantity}\nStatus: ${notification.status}\nSubmitted: ${formatDate(notification.createdAt)}\n${notification.notes ? "\nNotes: " + notification.notes : ""}`,
  )
}

// Add sample notification for testing
function addSampleNotification() {
  const sampleNotification = {
    id: Date.now().toString(),
    bookTitle: "Engineering Mathematics-1",
    bookAuthor: "G.V KUMBHOJKAR",
    buyerName: "John Doe",
    quantity: 1,
    amount: 600,
    paymentMethod: "UPI",
    purchaseDate: new Date().toISOString(),
    notes: "Purchased in good condition",
    status: "pending",
    createdAt: new Date().toISOString(),
  }

  purchaseNotifications.unshift(sampleNotification)
  localStorage.setItem("purchaseNotifications", JSON.stringify(purchaseNotifications))

  showNotification("Sample notification added!", "success")
  loadPurchaseNotifications()
}

// Inventory Management Functions
function openUpdateStockModal(bookId, title, currentStock) {
  const newStock = prompt(
    `Update Stock for: ${title}\n\nCurrent Stock: ${currentStock}\n\nEnter new stock quantity (0 to mark as out of stock):`,
    currentStock,
  )

  if (newStock === null) return // User cancelled

  if (isNaN(newStock) || newStock < 0) {
    showNotification("Please enter a valid number (0 or greater)", "error")
    return
  }

  const stockNumber = Number.parseInt(newStock)

  let reason = ""
  if (stockNumber < currentStock) {
    reason = prompt(
      `Decreasing stock from ${currentStock} to ${stockNumber}\n\nReason for decrease:`,
      stockNumber === 0 ? "All copies sold" : "Books purchased",
    )
  } else if (stockNumber > currentStock) {
    reason = prompt(
      `Increasing stock from ${currentStock} to ${stockNumber}\n\nReason for increase:`,
      "New stock added",
    )
  } else {
    showNotification("No change in stock quantity", "info")
    return
  }

  if (reason) {
    updateBookStock(bookId, stockNumber, reason, title)
  }
}

// ENHANCED manual stock update that actually updates database
async function updateBookStock(bookId, newStock, reason, bookTitle = "Unknown Book") {
  try {
    showNotification(`Updating stock to ${newStock}...`, "info")

    // Make real API call to update stock
    const updateResponse = await updateBookStockInDatabase(bookId, newStock, reason)

    if (updateResponse.success) {
      const statusMessage =
        newStock === 0 ? `"${bookTitle}" marked as out of stock` : `"${bookTitle}" stock updated to ${newStock}`

      showNotification(`SUCCESS: ${statusMessage}\nReason: ${reason}`, "success")

      // Reload inventory to show changes
      setTimeout(() => {
        loadInventory()
      }, 1000)
    } else {
      throw new Error(updateResponse.message || "Failed to update stock")
    }
  } catch (error) {
    console.error("Error updating stock:", error)
    showNotification(`ERROR: Failed to update stock - ${error.message}`, "error")
  }
}

async function deleteBook(bookId, title) {
  if (!confirm(`Permanently delete this book?\n\n"${title}"\n\nThis action cannot be undone!`)) {
    return
  }

  const confirmDelete = prompt(`To confirm deletion, type "DELETE" (in capital letters):`)
  if (confirmDelete !== "DELETE") {
    showNotification("Deletion cancelled - confirmation text incorrect", "warning")
    return
  }

  try {
    showNotification("Deleting book...", "info")

    setTimeout(() => {
      showNotification(`"${title}" has been permanently deleted!`, "success")
      loadInventory()
    }, 1500)

    console.log(`Delete book: ${bookId} - ${title}`)
  } catch (error) {
    console.error("Error deleting book:", error)
    showNotification("Error deleting book", "error")
  }
}

// Search and Filter Functions
function setupSearchAndFilters() {
  const searchInput = document.getElementById("inventorySearch")
  const stockFilter = document.getElementById("stockFilter")

  if (searchInput) {
    searchInput.addEventListener("input", debounce(filterInventory, 300))
  }

  if (stockFilter) {
    stockFilter.addEventListener("change", filterInventory)
  }
}

function filterInventory() {
  const searchTerm = document.getElementById("inventorySearch")?.value.toLowerCase() || ""
  const stockFilter = document.getElementById("stockFilter")?.value || ""

  let filteredBooks = [...currentBooks]

  // Apply search filter
  if (searchTerm) {
    filteredBooks = filteredBooks.filter(
      (book) =>
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm) ||
        book._id.toLowerCase().includes(searchTerm),
    )
  }

  // Apply stock filter
  if (stockFilter) {
    filteredBooks = filteredBooks.filter((book) => {
      const quantity = book.quantity || 1
      switch (stockFilter) {
        case "out-of-stock":
          return quantity === 0
        case "low-stock":
          return quantity > 0 && quantity <= 3
        case "in-stock":
          return quantity > 3
        default:
          return true
      }
    })
  }

  displayInventory(filteredBooks)

  // Show filter results summary
  if (searchTerm || stockFilter) {
    showNotification(`Found ${filteredBooks.length} book(s) matching your criteria`, "info")
  }
}

function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Utility Functions
function refreshInventory() {
  showNotification("Refreshing data...", "info")
  loadInventory()
  setTimeout(() => {
    showNotification("Data refreshed successfully!", "success")
  }, 1000)
}

function markAllAsRead() {
  purchaseNotifications.forEach((notification) => {
    if (notification.status === "pending") {
      notification.status = "read"
    }
  })

  localStorage.setItem("purchaseNotifications", JSON.stringify(purchaseNotifications))
  showNotification("All notifications marked as read", "success")
  loadPurchaseNotifications()
}

// Logout Functions
function setupLogout() {
  // Add logout button to sidebar
  const adminNav = document.querySelector(".admin-nav")
  if (adminNav && !adminNav.querySelector(".logout-item")) {
    const logoutItem = document.createElement("a")
    logoutItem.href = "#"
    logoutItem.className = "nav-item logout-item"
    logoutItem.innerHTML = "Logout"
    logoutItem.style.borderTop = "1px solid #34495e"
    logoutItem.style.marginTop = "20px"
    logoutItem.style.color = "#e74c3c"
    logoutItem.addEventListener("click", (e) => {
      e.preventDefault()
      logout()
    })

    adminNav.appendChild(logoutItem)
  }
}

function logout() {
  if (confirm("Are you sure you want to logout from admin panel?")) {
    localStorage.removeItem("adminSession")
    showNotification("Logged out successfully!", "success")
    setTimeout(() => {
      window.location.href = "/"
    }, 1000)
  }
}

// Form Handlers
function setupFormHandlers() {
  // Update Stock Form (if modal exists)
  const updateStockForm = document.getElementById("updateStockForm")
  if (updateStockForm) {
    updateStockForm.addEventListener("submit", (e) => {
      e.preventDefault()
      const newStock = document.getElementById("modalNewStock")?.value
      const reason = document.getElementById("modalReason")?.value

      if (currentBookId && newStock !== undefined && reason) {
        updateBookStock(currentBookId, Number.parseInt(newStock), reason)
        closeModal("updateStockModal")
      }
    })
  }

  console.log("Form handlers setup complete")
}

// Modal Functions
function closeModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) {
    modal.style.display = "none"
  }
  currentBookId = null
}

// Close modals when clicking outside
window.onclick = (event) => {
  if (event.target.classList.contains("modal")) {
    event.target.style.display = "none"
  }
}

// Enhanced Notification System
function showNotification(message, type = "info") {
  // Remove existing notifications
  document.querySelectorAll(".admin-notification").forEach((notif) => notif.remove())

  const notification = document.createElement("div")
  notification.className = `admin-notification ${type}`

  // Add icon based on type
  const icons = {
    success: "SUCCESS",
    error: "ERROR",
    info: "INFO",
    warning: "WARNING",
  }

  notification.innerHTML = `
        <span class="notification-icon">${icons[type] || icons.info}</span>
        <span class="notification-text">${message}</span>
    `

  const colors = {
    success: "#27ae60",
    error: "#e74c3c",
    info: "#3498db",
    warning: "#f39c12",
  }

  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 1001;
        background: ${colors[type] || colors.info};
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        animation: slideInNotification 0.3s ease-out;
        max-width: 350px;
        word-wrap: break-word;
        display: flex;
        align-items: center;
        gap: 10px;
    `

  document.body.appendChild(notification)

  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = "slideOutNotification 0.3s ease-in forwards"
      setTimeout(() => notification.remove(), 300)
    }
  }, 5000)
}

// Add enhanced notification animations and styles
const notificationStyle = document.createElement("style")
notificationStyle.textContent = `
    @keyframes slideInNotification {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutNotification {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification-icon {
        font-size: 0.8rem;
        flex-shrink: 0;
        font-weight: bold;
    }
    
    .notification-text {
        flex: 1;
        white-space: pre-line;
    }
    
    .notification-status {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.7rem;
        font-weight: bold;
        margin-left: 10px;
    }
    
    .status-pending {
        background: #f39c12;
        color: white;
    }
    
    .status-approved {
        background: #27ae60;
        color: white;
    }
    
    .status-rejected {
        background: #e74c3c;
        color: white;
    }
    
    .proof-section {
        margin-top: 15px;
        padding-top: 15px;
        border-top: 1px solid #ecf0f1;
    }
    
    .proof-preview {
        margin-top: 10px;
    }
    
    .notification-details {
        display: grid;
        gap: 8px;
        margin-bottom: 15px;
    }
`
document.head.appendChild(notificationStyle)

// Initialize page
console.log("Admin panel loaded - Enhanced with Real Stock Updates")
