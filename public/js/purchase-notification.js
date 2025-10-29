/**
 * Purchase Notification Form Handler
 * Handles submission of purchase reports with MongoDB integration
 */

document.addEventListener("DOMContentLoaded", () => {
  initializeForm()
  populateBookDropdown()
  setupEventListeners()
})

/**
 * Consolidated and fixed book dropdown population
 * Now properly fetches from API and syncs quantity with stock
 */
async function populateBookDropdown() {
  const select = document.getElementById("bookSelect")
  select.innerHTML = '<option value="">Loading books...</option>'

  try {
    const response = await fetch("/api/listings?limit=1000")

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()
    const books = Array.isArray(data) ? data : data.listings || data.books || []

    if (books.length === 0) {
      select.innerHTML = '<option value="">No books available</option>'
      return
    }

    select.innerHTML = '<option value="">Select a book...</option>'

    books.forEach((book) => {
      if (!book.title || !book.author) return

      const option = document.createElement("option")
      option.value = JSON.stringify({
        id: book._id || book.id,
        title: book.title,
        author: book.author,
        quantity: book.quantity || 0,
      })
      option.textContent = `${book.title} by ${book.author} (Stock: ${book.quantity || 0})`
      select.appendChild(option)
    })
  } catch (error) {
    select.innerHTML = '<option value="">Error loading books</option>'
    console.error("[v0] Failed to load books:", error)
  }
}

/**
 * Initialize form elements and defaults
 */
function initializeForm() {
  const quantityInput = document.getElementById("quantityPurchased")
  if (quantityInput && !quantityInput.value) {
    quantityInput.value = 1
  }

  const notesInput = document.getElementById("notes")
  if (notesInput) {
    updateCharacterCount()
  }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  const form = document.getElementById("purchaseNotificationForm")
  const bookSelect = document.getElementById("bookSelect")
  const fileInput = document.getElementById("transactionProof")
  const notesInput = document.getElementById("notes")
  const quantityInput = document.getElementById("quantityPurchased")

  if (bookSelect) {
    bookSelect.addEventListener("change", function () {
      if (!this.value) {
        document.getElementById("bookTitle").value = ""
        document.getElementById("bookAuthor").value = ""
        document.getElementById("quantityPurchased").innerHTML = '<option value="1">1</option>'
        return
      }

      const book = JSON.parse(this.value)
      const maxQty = Math.min(book.quantity || 1, 10)
      const qtySelect = document.getElementById("quantityPurchased")
      qtySelect.innerHTML = ""

      for (let i = 1; i <= maxQty; i++) {
        const option = document.createElement("option")
        option.value = i
        option.textContent = i
        qtySelect.appendChild(option)
      }

      // Update hidden fields
      document.getElementById("bookTitle").value = book.title
      document.getElementById("bookAuthor").value = book.author
    })
  }

  if (form) {
    form.addEventListener("submit", handleFormSubmit)
  }

  if (fileInput) {
    fileInput.addEventListener("change", handleFileSelection)
  }

  if (notesInput) {
    notesInput.addEventListener("input", updateCharacterCount)
  }

  if (quantityInput) {
    quantityInput.addEventListener("input", validateQuantity)
  }

  // Auto-capitalize inputs
  setupAutoCapitalize()
}

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
  event.preventDefault()

  const form = event.target
  const submitBtn = document.getElementById("submitBtn")
  const formData = new FormData(form)

  // Validate form before submission
  if (!validateForm(formData)) {
    return
  }

  // Show loading state
  const originalButtonText = submitBtn.innerHTML
  submitBtn.disabled = true
  submitBtn.innerHTML = '<span class="loading-spinner"></span> Submitting...'

  try {
    const response = await fetch("/api/purchase-notifications", {
      method: "POST",
      body: formData,
    })

    const result = await response.json()

    if (response.ok) {
      handleSuccessResponse(result)
      form.reset()
      clearFilePreview()
      updateCharacterCount()
      populateBookDropdown()
    } else {
      handleErrorResponse(result, response.status)
    }
  } catch (error) {
    console.error("[v0] Submission error:", error)
    showAlert("Network error occurred. Please check your connection and try again.", "error")
  } finally {
    submitBtn.disabled = false
    submitBtn.innerHTML = originalButtonText
  }
}

/**
 * Validate form data before submission
 */
function validateForm(formData) {
  const bookTitle = formData.get("bookTitle")?.trim()
  const bookAuthor = formData.get("bookAuthor")?.trim()
  const quantity = formData.get("quantityPurchased")
  const transactionProof = formData.get("transactionProof")

  if (!bookTitle) {
    showAlert("Please select a book", "error")
    document.getElementById("bookSelect").focus()
    return false
  }

  if (!bookAuthor) {
    showAlert("Please select a book with author information", "error")
    document.getElementById("bookSelect").focus()
    return false
  }

  const qty = Number.parseInt(quantity)
  if (isNaN(qty) || qty < 1 || qty > 10) {
    showAlert("Quantity must be between 1 and 10", "error")
    document.getElementById("quantityPurchased").focus()
    return false
  }

  if (!transactionProof || transactionProof.size === 0) {
    showAlert("Please upload a transaction proof image", "error")
    document.getElementById("transactionProof").focus()
    return false
  }

  if (transactionProof.size > 5 * 1024 * 1024) {
    showAlert("Transaction proof file must be less than 5MB", "error")
    document.getElementById("transactionProof").focus()
    return false
  }

  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
  if (!allowedTypes.includes(transactionProof.type)) {
    showAlert("Only JPEG, PNG, and WebP images are allowed", "error")
    document.getElementById("transactionProof").focus()
    return false
  }

  return true
}

/**
 * Handle successful submission
 */
function handleSuccessResponse(result) {
  const message = `Purchase report submitted successfully!\n\nBook: ${result.notification.bookTitle}\nQuantity: ${result.notification.quantity}\nStatus: Pending Admin Review\n\nRedirecting to homepage...`

  showAlert(message, "success")

  setTimeout(() => {
    window.location.href = "/"
  }, 3000)
}

/**
 * Handle error response
 */
function handleErrorResponse(result, statusCode) {
  let errorMessage = result.error || "Failed to submit purchase report"

  if (statusCode === 404) {
    errorMessage = `Book not found: ${
      result.message || "Please verify the book title and author match exactly as listed in the inventory"
    }`
  } else if (statusCode === 400) {
    if (result.error === "Book is out of stock") {
      errorMessage = `${result.bookTitle} is currently out of stock (Available: ${result.availableStock || 0})`
    } else if (result.error === "Insufficient stock") {
      errorMessage = `Insufficient stock for ${result.bookTitle}. Available: ${result.availableStock}, Requested: ${result.requestedQuantity}`
    } else if (result.details && Array.isArray(result.details)) {
      errorMessage = result.details.map((d) => d.msg).join(", ")
    } else {
      errorMessage = result.message || errorMessage
    }
  }

  showAlert(errorMessage, "error")
}

/**
 * Handle file selection
 */
function handleFileSelection(event) {
  const file = event.target.files[0]
  const fileLabel = document.getElementById("fileLabel")
  const filePreview = document.getElementById("filePreview")

  if (!file) {
    fileLabel.classList.remove("has-file")
    fileLabel.innerHTML = `
      <div>Click to upload transaction proof</div>
      <small>Accepted formats: JPG, PNG, WebP (Max 5MB)</small>
    `
    filePreview.innerHTML = ""
    return
  }

  // Validate file size
  if (file.size > 5 * 1024 * 1024) {
    showAlert("File size must be less than 5MB", "error")
    event.target.value = ""
    return
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
  if (!allowedTypes.includes(file.type)) {
    showAlert("Only JPEG, PNG, and WebP images are allowed", "error")
    event.target.value = ""
    return
  }

  // Update label
  fileLabel.classList.add("has-file")
  fileLabel.innerHTML = `
    <div>Selected: ${file.name}</div>
    <small>${formatFileSize(file.size)} - Click to change</small>
  `

  // Show preview
  const reader = new FileReader()
  reader.onload = (e) => {
    filePreview.innerHTML = `<img src="${e.target.result}" alt="Transaction proof preview">`
  }
  reader.readAsDataURL(file)

  showAlert("Transaction proof uploaded successfully", "success")
}

/**
 * Clear file preview
 */
function clearFilePreview() {
  const fileLabel = document.getElementById("fileLabel")
  const filePreview = document.getElementById("filePreview")

  fileLabel.classList.remove("has-file")
  fileLabel.innerHTML = `
    <div>Click to upload transaction proof</div>
    <small>Accepted formats: JPG, PNG, WebP (Max 5MB)</small>
  `
  filePreview.innerHTML = ""
}

/**
 * Update character count for notes textarea
 */
function updateCharacterCount() {
  const notesInput = document.getElementById("notes")
  const charCount = document.getElementById("charCount")

  if (notesInput && charCount) {
    const currentLength = notesInput.value.length
    charCount.textContent = currentLength

    if (currentLength >= 500) {
      charCount.style.color = "#e74c3c"
    } else {
      charCount.style.color = "#7f8c8d"
    }
  }
}

/**
 * Validate quantity input
 */
function validateQuantity(event) {
  const input = event.target
  const value = Number.parseInt(input.value)

  if (isNaN(value) || value < 1) {
    input.value = 1
  } else if (value > 10) {
    input.value = 10
    showAlert("Maximum 10 copies allowed per purchase report", "info")
  }
}

/**
 * Setup auto-capitalize for name inputs
 */
function setupAutoCapitalize() {
  const titleInput = document.getElementById("bookTitle")
  const authorInput = document.getElementById("bookAuthor")
  const buyerNameInput = document.getElementById("buyerName")

  function capitalizeWords(input) {
    input.addEventListener("blur", function () {
      if (this.value) {
        this.value = this.value
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(" ")
      }
    })
  }

  if (titleInput) capitalizeWords(titleInput)
  if (authorInput) capitalizeWords(authorInput)
  if (buyerNameInput) capitalizeWords(buyerNameInput)
}

/**
 * Show alert message
 */
function showAlert(message, type = "info") {
  const alertContainer = document.getElementById("alertContainer")

  // Remove existing alerts
  alertContainer.innerHTML = ""

  const alert = document.createElement("div")
  alert.className = `alert alert-${type}`
  alert.style.whiteSpace = "pre-line"
  alert.textContent = message

  alertContainer.appendChild(alert)
  alertContainer.scrollIntoView({ behavior: "smooth", block: "nearest" })

  // Auto-remove success and info messages
  if (type === "success" || type === "info") {
    setTimeout(() => {
      alert.style.transition = "opacity 0.3s ease-out"
      alert.style.opacity = "0"
      setTimeout(() => alert.remove(), 300)
    }, 5000)
  }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

console.log("[v0] Purchase notification form initialized with MongoDB integration")
