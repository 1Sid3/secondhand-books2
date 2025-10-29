const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const BookListing = require('../models/BookListing');

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        
        // Clear existing data
        await User.deleteMany({});
        await BookListing.deleteMany({});
        console.log('Cleared existing data');
        
        // Create users
        const users = await User.create([
            {
                username: 'john_doe',
                email: 'john@example.com',
                password: 'password123'
            },
            {
                username: 'jane_smith',
                email: 'jane@example.com',
                password: 'password123'
            }
        ]);
        
        console.log('Created users');
        
        // Create listings
        const listings = [
            {
                title: 'The Great Gatsby',
                author: 'F. Scott Fitzgerald',
                description: 'Classic American novel in excellent condition. A timeless story of love, wealth, and the American Dream.',
                condition: 'good',
                price: 299,
                category: 'fiction',
                isbn: '9780743273565',
                city: 'Mumbai',
                sellerId: users[0]._id,
                sellerContact: {
                    phone: '9876543210',
                    email: 'john@example.com'
                },
                upiId: 'john@paytm'
            },
            {
                title: 'JavaScript: The Good Parts',
                author: 'Douglas Crockford',
                description: 'Essential reading for JavaScript developers. Covers the best features of JavaScript and how to use them effectively.',
                condition: 'like-new',
                price: 450,
                category: 'academic',
                isbn: '9780596517748',
                city: 'Bangalore',
                sellerId: users[1]._id,
                sellerContact: {
                    phone: '9123456789',
                    email: 'jane@example.com'
                },
                upiId: 'jane@phonepe'
            },
            {
                title: 'Harry Potter and the Philosopher\'s Stone',
                author: 'J.K. Rowling',
                description: 'First book in the Harry Potter series. Perfect for young readers or adults who want to relive the magic.',
                condition: 'good',
                price: 199,
                category: 'children',
                city: 'Delhi',
                sellerId: users[0]._id,
                sellerContact: {
                    phone: '9876543210',
                    email: 'john@example.com'
                },
                upiId: 'john@paytm'
            },
            {
                title: 'Sapiens: A Brief History of Humankind',
                author: 'Yuval Noah Harari',
                description: 'Fascinating exploration of human history and evolution. Thought-provoking and well-researched.',
                condition: 'new',
                price: 399,
                category: 'non-fiction',
                city: 'Pune',
                sellerId: users[1]._id,
                sellerContact: {
                    phone: '9123456789',
                    email: 'jane@example.com'
                },
                upiId: 'jane@phonepe'
            }
        ];
        
        await BookListing.create(listings);
        console.log('Created sample listings');
        
        console.log('\n🎉 Database seeded successfully!');
        console.log('Sample login credentials:');
        console.log('📧 Email: john@example.com | 🔑 Password: password123');
        console.log('📧 Email: jane@example.com | 🔑 Password: password123');
        console.log('\n🌐 Visit: http://localhost:3000');
        
    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        mongoose.disconnect();
    }
}

seedDatabase();
