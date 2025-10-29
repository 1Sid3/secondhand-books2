# Secondhand Books Marketplace - Complete Project Documentation

## Project Overview
A full-stack secondhand books marketplace application built with Express.js backend and vanilla JavaScript frontend. Users can buy/sell books, manage carts, and sellers can receive purchase notifications for admin approval.

---

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js 4.18.2
- **Database**: MongoDB (Local: mongodb://127.0.0.1:27017/secondhand_books)
- **Authentication**: Express-session with bcryptjs password hashing
- **File Upload**: Multer 1.4.5
- **Image Processing**: Sharp 0.32.5
- **Validation**: Express-validator 7.0.1
- **Security**: Helmet 7.0.0, CORS, Compression

### Frontend
- **HTML/CSS/JavaScript**: Vanilla (No framework)
- **Session Management**: Browser localStorage + Express sessions
- **File Upload**: FormData API

### Dependencies
\`\`\`json
{
  "bcrypt": "^5.1.1",
  "bcryptjs": "^3.0.2",
  "compression": "^1.7.4",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "express": "^4.18.2",
  "express-session": "^1.17.3",
  "express-validator": "^7.0.1",
  "helmet": "^7.0.0",
  "mongoose": "^7.5.0",
  "morgan": "^1.10.0",
  "multer": "^1.4.5-lts.1",
  "sharp": "^0.32.5",
  "uuid": "^9.0.0"
}
\`\`\`

---

## Database Connection String

\`\`\`
mongodb://127.0.0.1:27017/secondhand_books
\`\`\`

**Config File**: `/config/db.js`

---

## Database Schema

### 1. User Model (`/models/User.js`)
\`\`\`javascript
{
  username: String (unique, required, 3-30 chars),
  email: String (unique, required, lowercase),
  password: String (hashed with bcryptjs, min 6 chars),
  role: String (default: 'user'),
  timestamps: true
}
\`\`\`

### 2. BookListing Model (`/models/BookListing.js`)
\`\`\`javascript
{
  title: String (required, max 200),
  author: String (required, max 100),
  description: String (required, max 1000),
  condition: String (enum: 'new', 'like-new', 'good', 'fair'),
  price: Number (required, min 1),
  category: String (enum: 'fiction', 'non-fiction', 'academic', 'children', 'comics', 'textbook', 'other'),
  isbn: String (optional),
  images: [String] (array of image paths),
  city: String (required, max 50),
  quantity: Number (required, min 1, default 1),
  sellerId: ObjectId (ref: User),
  sellerContact: {
    phone: String (required),
    email: String (required)
  },
  upiId: String (required),
  timestamps: true,
  indexes: [text search on title, author, description]
}
\`\`\`

### 3. Cart Model (`/models/Cart.js`)
\`\`\`javascript
{
  userId: ObjectId (ref: User, required),
  items: [{
    bookId: ObjectId (ref: BookListing),
    quantity: Number (min 1, default 1),
    price: Number,
    total: Number
  }],
  totalPrice: Number (default 0),
  totalItems: Number (default 0),
  timestamps: true
}
\`\`\`

### 4. PurchaseNotification Model (in `/routes/purchaseNotifications.js`)
\`\`\`javascript
{
  bookId: ObjectId (ref: BookListing),
  bookTitle: String,
  quantityPurchased: Number,
  buyerName: String (optional),
  buyerEmail: String (optional),
  buyerPhone: String (optional),
  transactionProof: String (file path),
  status: String (enum: 'pending', 'approved', 'rejected', default: 'pending'),
  rejectionReason: String (optional),
  approvedAt: Date (optional),
  rejectedAt: Date (optional),
  createdAt: Date,
  indexes: [createdAt, status+createdAt]
}
\`\`\`

---

## API Endpoints

### Authentication Routes (`/routes/auth.js`)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/check` - Check authentication status

### Listings Routes (`/routes/listings.js`)
- `GET /api/listings` - Get all listings (with search, filter, pagination)
- `GET /api/listings/:id` - Get single listing
- `POST /api/listings` - Create new listing (requires auth)
- `PUT /api/listings/:id` - Update listing (requires auth)
- `DELETE /api/listings/:id` - Delete listing (requires auth)
- `PUT /api/listings/:id/stock` - Update stock quantity (admin)
- `PATCH /api/listings/:id` - Patch update listing

### Cart Routes (`/routes/cart.js`)
- `GET /api/cart` - Get user's cart (requires auth)
- `POST /api/cart/add` - Add item to cart (requires auth, validates stock)
- `PUT /api/cart/update/:bookId` - Update cart item quantity (requires auth)
- `DELETE /api/cart/remove/:bookId` - Remove item from cart (requires auth)
- `DELETE /api/cart/clear` - Clear entire cart (requires auth)

### Purchase Notifications Routes (`/routes/purchaseNotifications.js`)
- `GET /api/purchase-notifications` - Get all notifications (admin)
- `GET /api/purchase-notifications/:id` - Get single notification
- `POST /api/purchase-notifications` - Create new notification (with file upload)
- `PUT /api/purchase-notifications/:id/approve` - Approve purchase (updates stock)
- `PUT /api/purchase-notifications/:id/reject` - Reject purchase
- `DELETE /api/purchase-notifications/:id` - Delete notification

### Uploads Routes (`/routes/uploads.js`)
- `POST /api/uploads` - Upload image (returns file path)

### Admin Stock Update Endpoints (in `/server.js`)
- `PUT /api/listings/:id/stock` - Update stock quantity
- `PUT /api/books/:id/stock` - Alternative endpoint for stock update
- `PATCH /api/listings/:id` - Patch update with quantity
- `GET /api/books` - Get all books (alternative to /api/listings)

---

## File Structure

\`\`\`
secondhand-books/
├── config/
│   └── db.js                          # MongoDB connection
├── controllers/
│   ├── authController.js              # Auth logic
│   ├── cartcontroller.js              # Cart logic
│   ├── listingsController.js          # Listings logic
│   └── uploadsController.js           # File upload logic
├── middleware/
│   ├── authGuard.js                   # Auth middleware
│   └── validators.js                  # Input validation
├── models/
│   ├── User.js                        # User schema
│   ├── BookListing.js                 # Book listing schema
│   └── Cart.js                        # Cart schema
├── routes/
│   ├── auth.js                        # Auth routes
│   ├── listings.js                    # Listings routes
│   ├── cart.js                        # Cart routes
│   ├── uploads.js                     # Upload routes
│   └── purchaseNotifications.js       # Purchase notification routes
├── public/
│   ├── index.html                     # Home page
│   ├── login.html                     # Login page
│   ├── register.html                  # Register page
│   ├── sell.html                      # Sell book page
│   ├── cart.html                      # Cart page
│   ├── purchase-notification.html     # Purchase notification form
│   ├── admin.html                     # Admin dashboard
│   ├── css/
│   │   ├── styles.css                 # Main styles
│   │   └── admin.css                  # Admin styles
│   ├── js/
│   │   ├── main.js                    # Main app logic
│   │   ├── auth.js                    # Auth functions
│   │   ├── cart.js                    # Cart functions
│   │   ├── admin.js                   # Admin functions
│   │   └── purchase-notification.js   # Purchase notification logic
│   └── uploads/                       # User uploaded files
├── server.js                          # Express server setup
├── package.json                       # Dependencies
└── .env                               # Environment variables
\`\`\`

---

## Environment Variables

\`\`\`env
PORT=3000
SESSION_SECRET=your_session_secret_key
MONGODB_URI=mongodb://127.0.0.1:27017/secondhand_books
NODE_ENV=development
\`\`\`

---

## Key Features

### 1. User Authentication
- Register with username, email, password
- Login with email/password
- Session-based authentication
- Password hashing with bcryptjs

### 2. Book Listings
- Create, read, update, delete listings
- Upload multiple images per listing
- Search by title, author, description
- Filter by category, condition, city
- Pagination support
- Stock quantity management

### 3. Shopping Cart
- Add books to cart (validates available stock)
- Update quantities (prevents exceeding available stock)
- Remove items
- Clear cart
- Calculate totals

### 4. Purchase Notifications
- Buyers submit purchase notifications with transaction proof
- Admin reviews pending notifications
- Approve purchases (automatically updates stock)
- Reject with reason
- Delete notifications

### 5. Admin Dashboard
- View all books and manage stock
- Review purchase notifications
- Approve/reject purchases
- View inventory statistics

---

## Validation Rules

### User Registration
- Username: 3-30 characters, unique
- Email: Valid email format, unique
- Password: Minimum 6 characters

### Book Listing
- Title: Required, max 200 characters
- Author: Required, max 100 characters
- Description: Required, max 1000 characters
- Price: Required, minimum 1
- Quantity: Required, minimum 1
- Category: Must be one of predefined categories
- Condition: Must be 'new', 'like-new', 'good', or 'fair'

### Cart
- Quantity: Cannot exceed available stock
- Minimum quantity: 1

### Purchase Notification
- Book ID: Required
- Quantity: 1-10 (or available stock, whichever is lower)
- Transaction Proof: Required (image file)
- Buyer details: Optional

---

## File Upload Configuration

- **Upload Directory**: `/public/uploads/`
- **Subdirectories**:
  - `/public/uploads/books/` - Book images
  - `/public/uploads/transaction-proofs/` - Transaction proof images
- **Max File Size**: 10MB
- **Allowed Types**: Images (jpg, jpeg, png, gif)
- **Image Processing**: Sharp for optimization

---

## Security Features

- **Helmet**: HTTP headers security
- **CORS**: Cross-origin resource sharing
- **Session Security**: HttpOnly cookies, secure session storage
- **Password Hashing**: bcryptjs with salt rounds
- **Input Validation**: Express-validator on all inputs
- **File Upload Validation**: Type and size checks
- **SQL Injection Prevention**: Using MongoDB (NoSQL)

---

## Running the Application

### Development
\`\`\`bash
npm install
npm run dev
\`\`\`

### Production
\`\`\`bash
npm install
npm start
\`\`\`

### Seed Database (Optional)
\`\`\`bash
npm run seed
\`\`\`

---

## Frontend Pages

### Public Pages
- **index.html** - Home page with book listings
- **login.html** - User login
- **register.html** - User registration

### Authenticated Pages
- **sell.html** - Create/edit book listings
- **cart.html** - Shopping cart
- **purchase-notification.html** - Submit purchase notification

### Admin Pages
- **admin.html** - Admin dashboard (manage books, review purchases)

---

## Key JavaScript Functions

### Authentication (auth.js)
- `checkAuthStatus()` - Check if user is logged in
- `login(email, password)` - Login user
- `register(username, email, password)` - Register user
- `logout()` - Logout user

### Cart (cart.js)
- `loadCart()` - Load user's cart
- `addToCart(bookId, quantity)` - Add book to cart
- `updateCartQuantity(bookId, quantity)` - Update quantity
- `removeFromCart(bookId)` - Remove item
- `clearCart()` - Clear entire cart

### Listings (main.js)
- `loadListings()` - Load all listings
- `searchListings(query)` - Search listings
- `filterListings(filters)` - Filter listings
- `createListing(formData)` - Create new listing

### Admin (admin.js)
- `loadPurchaseNotifications()` - Load pending notifications
- `approvePurchaseFromAPI(notificationId)` - Approve purchase
- `rejectPurchaseFromAPI(notificationId, reason)` - Reject purchase
- `deletePurchaseNotificationFromAPI(notificationId)` - Delete notification

---

## Common Issues & Solutions

### Cart asking for login when already logged in
- Ensure auth.js is loaded before cart.js in HTML
- Check session cookie is being set correctly
- Verify `checkAuthStatus()` function is working

### Purchase notifications not showing in admin
- Ensure notifications are saved to MongoDB
- Check API endpoint returns correct data
- Verify admin has proper permissions

### Stock not updating after approval
- Check if book ID is valid
- Verify quantity is a valid number
- Ensure MongoDB connection is active

### File uploads failing
- Check `/public/uploads/` directory exists
- Verify file size is under 10MB
- Ensure file type is supported image

---

## Next.js Migration Guide

When migrating to Next.js, consider:

1. **API Routes**: Convert Express routes to Next.js `/app/api/` routes
2. **Database**: Keep MongoDB connection, use Prisma or Mongoose ORM
3. **Authentication**: Use NextAuth.js or similar
4. **File Uploads**: Use Next.js API routes with multer
5. **Frontend**: Convert HTML pages to React components
6. **Styling**: Keep Tailwind CSS, add to Next.js
7. **Sessions**: Use secure cookies with Next.js middleware
8. **Environment Variables**: Use `.env.local` in Next.js

---

## Contact & Support

For issues or questions about this project, refer to the GitHub repository or contact the development team.
