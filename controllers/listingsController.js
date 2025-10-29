const { validationResult } = require('express-validator');
const BookListing = require('../models/BookListing.js');

const createListing = async (req, res) => {
    try {
        const {
            title,
            author,
            description,
            condition,
            price,
            category,
            city,
            isbn,
            quantity,
            contactPhone,
            contactEmail,
            upiId
        } = req.body;

        const newListing = new BookListing({
            title,
            author,
            description,
            condition,
            price: parseFloat(price),
            category,
            city,
            isbn,
            quantity: parseInt(quantity) || 1, 
            images: req.files ? req.files.map(file => file.filename) : [],
            sellerId: req.session.userId,
            sellerContact: {
                phone: contactPhone,
                email: contactEmail
            },
            upiId
        });

        await newListing.save();
        res.status(201).json({ message: 'Listing created successfully!' });
    } catch (error) {
        console.error('Error creating listing:', error);
        res.status(500).json({ error: 'Error creating listing' });
    }
};



const getListings = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      search,
      author,
      category,
      city,
      minPrice,
      maxPrice,
      condition,
      page = 1,
      limit = 12
    } = req.query;

    let query = {};

    if (search) {
      query.$text = { $search: search };
    }

    if (author) {
      query.author = new RegExp(author, 'i');
    }

    if (category) {
      query.category = category;
    }

    if (city) {
      query.city = new RegExp(city, 'i');
    }

    if (condition) {
      query.condition = condition;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const listings = await BookListing.find(query)
      .populate('sellerId', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await BookListing.countDocuments(query);

    res.json({
      listings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({ error: 'Server error fetching listings' });
  }
};

const getListing = async (req, res) => {
  try {
    const listing = await BookListing.findById(req.params.id)
      .populate('sellerId', 'username');

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json({ listing });
  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({ error: 'Server error fetching listing' });
  }
};

const deleteListing = async (req, res) => {
  try {
    const listing = await BookListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.sellerId.toString() !== req.session.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this listing' });
    }

    await BookListing.findByIdAndDelete(req.params.id);
    res.json({ message: 'Listing deleted successfully' });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({ error: 'Server error deleting listing' });
  }
};

module.exports = {
  createListing,
  getListings,
  getListing,
  deleteListing
};
