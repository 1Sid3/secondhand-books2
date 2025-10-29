const express = require("express")
const router = express.Router()
const mongoose = require("mongoose")
const { body, validationResult } = require("express-validator")
const multer = require("multer")
const path = require("path")
const fs = require("fs")

const BookListing = require("../models/BookListing")

/**
 * Purchase Notification Schema
 * Tracks customer purchase requests for inventory management
 */
const purchaseNotificationSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookListing",
      required: true,
      index: true,
    },
    bookTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    bookAuthor: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    buyerName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    buyerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    buyerPhone: {
      type: String,
      trim: true,
    },
    amountPaid: {
      type: Number,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["UPI", "Bank Transfer", "Cash", "Other"],
      default: "UPI",
    },
    transactionProof: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    processedAt: {
      type: Date,
    },
    processedBy: {
      type: String,
    },
    rejectionReason: {
      type: String,
      maxlength: 200,
    },
    stockBefore: {
      type: Number,
    },
    stockAfter: {
      type: Number,
    },
  },
  {
    timestamps: true,
  },
)

// Create indexes for efficient querying
purchaseNotificationSchema.index({ createdAt: -1 })
purchaseNotificationSchema.index({ status: 1, createdAt: -1 })

const PurchaseNotification = mongoose.model("PurchaseNotification", purchaseNotificationSchema)

/**
 * Configure multer for transaction proof uploads
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads/transaction-proofs")
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueName = `proof_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  },
})

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, and WebP images are allowed."), false)
  }
}

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
})

/**
 * Validation middleware for purchase notification submission
 */
const purchaseNotificationValidation = [
  body("bookTitle")
    .trim()
    .notEmpty()
    .withMessage("Book title is required")
    .isLength({ max: 200 })
    .withMessage("Book title must be less than 200 characters"),
  body("bookAuthor")
    .trim()
    .notEmpty()
    .withMessage("Author name is required")
    .isLength({ max: 100 })
    .withMessage("Author name must be less than 100 characters"),
  body("quantityPurchased")
    .trim()
    .notEmpty()
    .withMessage("Quantity is required")
    .toInt()
    .isInt({ min: 1, max: 10 })
    .withMessage("Quantity must be between 1 and 10"),
  body("buyerName")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Buyer name must be less than 100 characters"),
  body("buyerEmail").optional({ checkFalsy: true }).isEmail().withMessage("Invalid email address").normalizeEmail(),
  body("buyerPhone")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[\d\s\-+()]+$/)
    .withMessage("Invalid phone number format"),
  body("amountPaid").optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage("Amount must be a positive number"),
  body("paymentMethod")
    .optional({ checkFalsy: true })
    .isIn(["UPI", "Bank Transfer", "Cash", "Other"])
    .withMessage("Invalid payment method"),
  body("notes")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes must be less than 500 characters"),
]

/**
 * POST /api/purchase-notifications
 * Submit a new purchase notification
 */
router.post("/", upload.single("transactionProof"), purchaseNotificationValidation, async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      // Clean up uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path)
      }
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      })
    }

    // Check if transaction proof was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: "Transaction proof image is required",
      })
    }

    const {
      bookTitle,
      bookAuthor,
      quantityPurchased,
      buyerName,
      buyerEmail,
      buyerPhone,
      amountPaid,
      paymentMethod,
      notes,
    } = req.body

    // Find the book listing by title and author
    const listing = await BookListing.findOne({
      title: { $regex: new RegExp(`^${bookTitle.trim()}$`, "i") },
      author: { $regex: new RegExp(`^${bookAuthor.trim()}$`, "i") },
    })

    if (!listing) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path)
      return res.status(404).json({
        error: "Book not found in inventory",
        message: "Please verify the book title and author match exactly as listed",
      })
    }

    // Validate stock availability
    const requestedQuantity = Number.parseInt(quantityPurchased)
    const availableStock = listing.quantity || 0

    if (availableStock === 0) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path)
      return res.status(400).json({
        error: "Book is out of stock",
        message: "This book is currently unavailable. Stock quantity is 0.",
        bookTitle: listing.title,
        availableStock: 0,
      })
    }

    if (requestedQuantity > availableStock) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path)
      return res.status(400).json({
        error: "Insufficient stock",
        message: `Only ${availableStock} ${
          availableStock === 1 ? "copy" : "copies"
        } available. You requested ${requestedQuantity}.`,
        bookTitle: listing.title,
        availableStock: availableStock,
        requestedQuantity: requestedQuantity,
      })
    }

    // Create purchase notification
    const notification = new PurchaseNotification({
      listingId: listing._id,
      bookTitle: listing.title,
      bookAuthor: listing.author,
      quantity: requestedQuantity,
      buyerName: buyerName || "Anonymous",
      buyerEmail: buyerEmail || null,
      buyerPhone: buyerPhone || null,
      amountPaid: amountPaid ? Number.parseFloat(amountPaid) : null,
      paymentMethod: paymentMethod || "UPI",
      transactionProof: req.file.filename,
      notes: notes || null,
      status: "pending",
      stockBefore: availableStock,
    })

    await notification.save()

    res.status(201).json({
      success: true,
      message: "Purchase notification submitted successfully",
      notification: {
        id: notification._id,
        bookTitle: notification.bookTitle,
        quantity: notification.quantity,
        status: notification.status,
        submittedAt: notification.createdAt,
      },
    })
  } catch (error) {
    console.error("Error submitting purchase notification:", error)

    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }

    res.status(500).json({
      error: "Failed to submit purchase notification",
      message: error.message,
    })
  }
})

/**
 * GET /api/purchase-notifications
 * Retrieve all purchase notifications (admin only)
 * Fixed broken endpoint - removed incomplete code with undefined Listing variable
 */
router.get("/", async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query

    const query = {}
    if (status) {
      query.status = status
    }

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    const notifications = await PurchaseNotification.find(query)
      .populate("listingId", "title author price")
      .sort({ createdAt: -1 })
      .limit(Number.parseInt(limit))
      .skip(skip)

    const total = await PurchaseNotification.countDocuments(query)

    res.json({
      success: true,
      notifications,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / Number.parseInt(limit)),
      },
    })
  } catch (error) {
    console.error("Error fetching purchase notifications:", error)
    res.status(500).json({
      error: "Failed to fetch purchase notifications",
      message: error.message,
    })
  }
})

/**
 * GET /api/purchase-notifications/:id
 * Retrieve a specific purchase notification
 */
router.get("/:id", async (req, res) => {
  try {
    const notification = await PurchaseNotification.findById(req.params.id).populate(
      "listingId",
      "title author price quantity",
    )

    if (!notification) {
      return res.status(404).json({
        error: "Purchase notification not found",
      })
    }

    res.json({
      success: true,
      notification,
    })
  } catch (error) {
    console.error("Error fetching purchase notification:", error)
    res.status(500).json({
      error: "Failed to fetch purchase notification",
      message: error.message,
    })
  }
})

/**
 * PUT /api/purchase-notifications/:id/approve
 * Approve a purchase notification and update inventory
 * Removed MongoDB transactions - not supported on standalone MongoDB instances
 */
router.put("/:id/approve", async (req, res) => {
  try {
    const notification = await PurchaseNotification.findById(req.params.id)

    if (!notification) {
      return res.status(404).json({
        error: "Purchase notification not found",
      })
    }

    if (notification.status !== "pending") {
      return res.status(400).json({
        error: "Notification has already been processed",
        currentStatus: notification.status,
      })
    }

    const listing = await BookListing.findById(notification.listingId)

    if (!listing) {
      return res.status(404).json({
        error: "Book listing not found",
      })
    }

    // Validate current stock
    const currentStock = listing.quantity || 0
    if (currentStock < notification.quantity) {
      return res.status(400).json({
        error: "Insufficient current stock",
        message: `Current stock (${currentStock}) is less than notification quantity (${notification.quantity})`,
        currentStock,
        requestedQuantity: notification.quantity,
      })
    }

    // Update book listing stock
    const newStock = currentStock - notification.quantity
    listing.quantity = newStock
    await listing.save()

    // Update notification status
    notification.status = "approved"
    notification.processedAt = new Date()
    notification.processedBy = req.body.processedBy || "admin"
    notification.stockAfter = newStock
    await notification.save()

    res.json({
      success: true,
      message: "Purchase notification approved and inventory updated",
      notification: {
        id: notification._id,
        status: notification.status,
        stockBefore: notification.stockBefore,
        stockAfter: notification.stockAfter,
      },
      listing: {
        id: listing._id,
        title: listing.title,
        newStock: listing.quantity,
      },
    })
  } catch (error) {
    console.error("Error approving purchase notification:", error)
    res.status(500).json({
      error: "Failed to approve purchase notification",
      message: error.message,
    })
  }
})

/**
 * PUT /api/purchase-notifications/:id/reject
 * Reject a purchase notification
 */
router.put(
  "/:id/reject",
  [body("reason").trim().notEmpty().withMessage("Rejection reason is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        })
      }

      const notification = await PurchaseNotification.findById(req.params.id)

      if (!notification) {
        return res.status(404).json({
          error: "Purchase notification not found",
        })
      }

      if (notification.status !== "pending") {
        return res.status(400).json({
          error: "Notification has already been processed",
          currentStatus: notification.status,
        })
      }

      notification.status = "rejected"
      notification.processedAt = new Date()
      notification.processedBy = req.body.processedBy || "admin"
      notification.rejectionReason = req.body.reason
      await notification.save()

      res.json({
        success: true,
        message: "Purchase notification rejected",
        notification: {
          id: notification._id,
          status: notification.status,
          rejectionReason: notification.rejectionReason,
        },
      })
    } catch (error) {
      console.error("Error rejecting purchase notification:", error)
      res.status(500).json({
        error: "Failed to reject purchase notification",
        message: error.message,
      })
    }
  },
)

/**
 * DELETE /api/purchase-notifications/:id
 * Delete a purchase notification
 */
router.delete("/:id", async (req, res) => {
  try {
    const notification = await PurchaseNotification.findById(req.params.id)

    if (!notification) {
      return res.status(404).json({
        error: "Purchase notification not found",
      })
    }

    // Delete transaction proof file
    const proofPath = path.join(__dirname, "../uploads/transaction-proofs", notification.transactionProof)
    if (fs.existsSync(proofPath)) {
      fs.unlinkSync(proofPath)
    }

    await PurchaseNotification.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: "Purchase notification deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting purchase notification:", error)
    res.status(500).json({
      error: "Failed to delete purchase notification",
      message: error.message,
    })
  }
})

module.exports = router
