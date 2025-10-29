const mongoose = require('mongoose');

const bookListingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  author: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  condition: {
    type: String,
    required: true,
    enum: ['new', 'like-new', 'good', 'fair']
  },
  price: {
    type: Number,
    required: true,
    min: 1
  },
  category: {
    type: String,
    required: true,
    enum: ['fiction', 'non-fiction', 'academic', 'children', 'comics', 'textbook', 'other']
  },
  isbn: {
    type: String,
    trim: true
  },
  images: [{
    type: String
  }],
  city: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerContact: {
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true
    }
  },
  upiId: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

bookListingSchema.index({
  title: 'text',
  author: 'text',
  description: 'text'
});

module.exports = mongoose.model('BookListing', bookListingSchema);
