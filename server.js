const express = require('express');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const listingsRoutes = require('./routes/listings');
const uploadsRoutes = require('./routes/uploads');
const cartRoutes = require('./routes/cart');

// Import your model (adjust the path/name according to your project)
const Listing = require('./models/BookListing'); // or './models/Book' if that's what you use

const app = express();

// Connect to MongoDB
connectDB();

// STATIC FILES FIRST - This is crucial!
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Other middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: `http://localhost:${process.env.PORT || 3000}`, credentials: true }));
app.use(compression());
app.use(morgan('combined'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/cart', cartRoutes);

// ADMIN STOCK UPDATE ENDPOINTS
// Update stock quantity for a specific listing (PUT method)
app.put('/api/listings/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, stock, reason, updatedBy } = req.body;
    
    console.log(`Admin stock update request for listing ${id}:`, req.body);
    
    // Use either quantity or stock field (admin sends both)
    const newQuantity = quantity !== undefined ? quantity : stock;
    
    if (newQuantity === undefined || newQuantity < 0) {
      return res.status(400).json({ 
        error: 'Invalid quantity. Must be 0 or greater.' 
      });
    }
    
    const updateData = {
      quantity: newQuantity,
      lastUpdated: new Date()
    };
    
    // Add optional fields if provided
    if (reason) updateData.stockUpdateReason = reason;
    if (updatedBy) updateData.lastUpdatedBy = updatedBy;
    
    const updatedListing = await Listing.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    if (!updatedListing) {
      return res.status(404).json({ error: 'Book/Listing not found' });
    }
    
    console.log(`Stock updated successfully: ${updatedListing.title} - New quantity: ${newQuantity}`);
    
    res.json({ 
      success: true, 
      message: 'Stock updated successfully',
      book: updatedListing,
      listing: updatedListing // Send both for compatibility
    });
    
  } catch (error) {
    console.error('Stock update error:', error);
    res.status(500).json({ error: 'Failed to update stock in database' });
  }
});

// Alternative endpoint for books (if your admin tries /api/books)
app.put('/api/books/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, stock, reason } = req.body;
    
    console.log(`Admin stock update request for book ${id}:`, req.body);
    
    const newQuantity = quantity !== undefined ? quantity : stock;
    
    if (newQuantity === undefined || newQuantity < 0) {
      return res.status(400).json({ 
        error: 'Invalid quantity. Must be 0 or greater.' 
      });
    }
    
    const updatedListing = await Listing.findByIdAndUpdate(
      id,
      { 
        quantity: newQuantity,
        lastUpdated: new Date(),
        stockUpdateReason: reason || 'Admin update'
      },
      { new: true }
    );
    
    if (!updatedListing) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    console.log(`Stock updated via /api/books: ${updatedListing.title} - New quantity: ${newQuantity}`);
    
    res.json({ 
      success: true, 
      book: updatedListing 
    });
    
  } catch (error) {
    console.error('Books stock update error:', error);
    res.status(500).json({ error: 'Failed to update book stock' });
  }
});

// PATCH method support (alternative update method)
app.patch('/api/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    
    console.log(`PATCH stock update for listing ${id}: quantity = ${quantity}`);
    
    if (quantity !== undefined && quantity >= 0) {
      const updatedListing = await Listing.findByIdAndUpdate(
        id,
        { 
          quantity: quantity,
          lastUpdated: new Date()
        },
        { new: true }
      );
      
      if (!updatedListing) {
        return res.status(404).json({ error: 'Listing not found' });
      }
      
      console.log(`PATCH stock updated: ${updatedListing.title} - New quantity: ${quantity}`);
      
      return res.json({ 
        success: true, 
        listing: updatedListing 
      });
    }
    
    // If no quantity update, handle other fields (existing PATCH functionality)
    const updatedListing = await Listing.findByIdAndUpdate(
      id,
      { ...req.body, lastUpdated: new Date() },
      { new: true }
    );
    
    if (!updatedListing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    res.json({ success: true, listing: updatedListing });
    
  } catch (error) {
    console.error('PATCH update error:', error);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// Admin endpoint to get all books (alternative to /api/listings)
app.get('/api/books', async (req, res) => {
  try {
    const { limit } = req.query;
    let query = Listing.find();
    
    if (limit) {
      query = query.limit(parseInt(limit));
    }
    
    const books = await query.sort({ createdAt: -1 });
    
    console.log(`Admin fetched ${books.length} books via /api/books`);
    
    res.json(books);
    
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Admin stock update endpoints available:');
  console.log(`  PUT http://localhost:${PORT}/api/listings/:id/stock`);
  console.log(`  PUT http://localhost:${PORT}/api/books/:id/stock`);
  console.log(`  PATCH http://localhost:${PORT}/api/listings/:id`);
});
