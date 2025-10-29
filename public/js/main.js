let currentPage = 1;

document.addEventListener('DOMContentLoaded', function() {
    loadListings();
    updateCartCount(); // Load cart count on page load
    
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            currentPage = 1;
            loadListings();
        });
    }
    
    // Add filter event listeners
    const filters = ['categoryFilter', 'conditionFilter', 'cityFilter', 'minPriceFilter', 'maxPriceFilter'];
    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', () => {
                currentPage = 1;
                loadListings();
            });
        }
    });

    // Initialize quantity controls after listings are loaded
    setTimeout(() => {
        document.querySelectorAll('.qty-input').forEach(input => {
            const bookId = input.id.replace('qty-', '');
            const minQty = parseInt(input.min);
            const maxQty = parseInt(input.max);
            updateQuantityButtons(bookId, 1, minQty, maxQty);
        });
    }, 1000);
});

async function loadListings() {
    const grid = document.getElementById('listingsGrid');
    grid.innerHTML = '<div class="loading">Loading amazing books...</div>';
    
    try {
        const params = new URLSearchParams();
        
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value) {
            params.append('search', searchInput.value);
        }
        
        const filters = {
            category: document.getElementById('categoryFilter')?.value,
            condition: document.getElementById('conditionFilter')?.value,
            city: document.getElementById('cityFilter')?.value,
            minPrice: document.getElementById('minPriceFilter')?.value,
            maxPrice: document.getElementById('maxPriceFilter')?.value
        };
        
        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                params.append(key, value);
            }
        });
        
        params.append('page', currentPage);
        params.append('limit', 12);
        
        const response = await fetch(`/api/listings?${params}`);
        const data = await response.json();
        
        if (response.ok) {
            displayListings(data.listings);
            displayPagination(data.pagination);
        } else {
            console.error('Error loading listings:', data.error);
            grid.innerHTML = '<div class="empty-state"><h3>Error loading books</h3><p>Please try again later.</p></div>';
        }
    } catch (error) {
        console.error('Error loading listings:', error);
        grid.innerHTML = '<div class="empty-state"><h3>Connection Error</h3><p>Please check your internet connection and try again.</p></div>';
    }
}

// Function to get quantity display with appropriate styling
function getQuantityHTML(quantity) {
    if (quantity === 0) {
        return `<div class="listing-quantity out-of-stock">❌ Out of Stock</div>`;
    } else if (quantity === 1) {
        return `<div class="listing-quantity low-stock">📦 Only 1 left!</div>`;
    } else if (quantity <= 3) {
        return `<div class="listing-quantity low-stock">📦 Only ${quantity} left!</div>`;
    } else {
        return `<div class="listing-quantity">📦 ${quantity} available</div>`;
    }
}

// UPDATED displayListings function with quantity controls
function displayListings(listings) {
    const grid = document.getElementById('listingsGrid');
    
    if (listings.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <h3>📚 No Books Found</h3>
                <p>Be the first to sell a book in this category!</p>
                <a href="/sell.html" class="btn btn-primary" style="margin-top: 1rem;">Sell Your Books</a>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = listings.map(listing => `
        <div class="listing-card">
            ${listing.images && listing.images.length > 0 
                ? `<img src="/uploads/${listing.images[0]}" alt="${listing.title}" class="listing-image">`
                : `<div class="listing-image" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 3rem;">📖</div>`
            }
            <div class="listing-content">
                <h3 class="listing-title">${listing.title}</h3>
                <p class="listing-author">by ${listing.author}</p>
                <div class="listing-price">₹${listing.price.toLocaleString()}</div>
                <div class="listing-meta">
                    <span class="listing-condition condition-${listing.condition}">${listing.condition.replace('-', ' ')}</span>
                    <div class="listing-city">📍 ${listing.city}</div>
                    ${getQuantityHTML(listing.quantity || 1)}
                </div>
                <div class="card-actions">
                    <button class="view-details-btn" onclick="viewDetails('${listing._id}')" style="margin-bottom: 0.5rem;">
                        View Details
                    </button>
                    
                    ${listing.quantity > 0 ? `
                        <div class="quantity-controls">
                            <label for="qty-${listing._id}" class="qty-label">Quantity:</label>
                            <div class="qty-input-group">
                                <button type="button" class="qty-btn qty-decrease" onclick="changeQuantity('${listing._id}', -1)">-</button>
                                <input type="number" id="qty-${listing._id}" class="qty-input" value="1" min="1" max="${listing.quantity}" readonly />
                                <button type="button" class="qty-btn qty-increase" onclick="changeQuantity('${listing._id}', 1)">+</button>
                            </div>
                            <button class="add-to-cart-btn" onclick="addToCartWithQty('${listing._id}')">
                                Add to Cart
                            </button>
                        </div>
                    ` : `
                        <button class="add-to-cart-btn" disabled style="opacity: 0.5; cursor: not-allowed;">
                            Out of Stock
                        </button>
                    `}
                </div>
            </div>
        </div>
    `).join('');
    
    // Initialize quantity buttons after DOM is updated
    setTimeout(() => {
        listings.forEach(listing => {
            if (listing.quantity > 0) {
                updateQuantityButtons(listing._id, 1, 1, listing.quantity);
            }
        });
    }, 100);
}

// Function to change quantity with validation
function changeQuantity(bookId, change) {
    const qtyInput = document.getElementById(`qty-${bookId}`);
    let currentQty = parseInt(qtyInput.value);
    let newQty = currentQty + change;
    
    const maxQty = parseInt(qtyInput.max);
    const minQty = parseInt(qtyInput.min);
    
    // Enforce min and max limits
    if (newQty > maxQty) {
        newQty = maxQty;
        showNotification(`Maximum ${maxQty} items available for this book`, 'error');
    } else if (newQty < minQty) {
        newQty = minQty;
    }
    
    qtyInput.value = newQty;
    
    // Update button states
    updateQuantityButtons(bookId, newQty, minQty, maxQty);
}

// Function to update quantity button states
function updateQuantityButtons(bookId, currentQty, minQty, maxQty) {
    const qtyInput = document.getElementById(`qty-${bookId}`);
    if (!qtyInput) return;
    
    const decreaseBtn = qtyInput.previousElementSibling;
    const increaseBtn = qtyInput.nextElementSibling;
    
    if (decreaseBtn && decreaseBtn.classList.contains('qty-decrease')) {
        // Disable decrease button at minimum
        if (currentQty <= minQty) {
            decreaseBtn.disabled = true;
            decreaseBtn.style.opacity = '0.5';
        } else {
            decreaseBtn.disabled = false;
            decreaseBtn.style.opacity = '1';
        }
    }
    
    if (increaseBtn && increaseBtn.classList.contains('qty-increase')) {
        // Disable increase button at maximum
        if (currentQty >= maxQty) {
            increaseBtn.disabled = true;
            increaseBtn.style.opacity = '0.5';
        } else {
            increaseBtn.disabled = false;
            increaseBtn.style.opacity = '1';
        }
    }
}

// Enhanced add to cart function with quantity validation
async function addToCartWithQty(bookId) {
    const qtyInput = document.getElementById(`qty-${bookId}`);
    let quantity = parseInt(qtyInput.value);
    const maxQuantity = parseInt(qtyInput.max);
    const minQuantity = parseInt(qtyInput.min);
    
    // Validate quantity bounds
    if (quantity > maxQuantity) {
        quantity = maxQuantity;
        qtyInput.value = maxQuantity;
        showNotification(`Only ${maxQuantity} items available. Adding ${maxQuantity} to cart.`, 'error');
    }
    if (quantity < minQuantity) {
        quantity = minQuantity;
        qtyInput.value = minQuantity;
    }
    
    // Call existing addToCart function
    await addToCart(bookId, quantity);
    
    // Reset quantity input after successful add to cart
    qtyInput.value = 1;
    updateQuantityButtons(bookId, 1, minQuantity, maxQuantity);
}

function displayPagination(pagination) {
    const paginationDiv = document.getElementById('pagination');
    
    if (!pagination || pagination.pages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let html = '<div style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 2rem;">';
    
    // Previous button
    html += `<button onclick="changePage(${pagination.page - 1})" ${pagination.page <= 1 ? 'disabled' : ''} class="btn btn-secondary" style="opacity: ${pagination.page <= 1 ? '0.5' : '1'}">Previous</button>`;
    
    // Page numbers
    for (let i = 1; i <= pagination.pages; i++) {
        if (i === pagination.page) {
            html += `<button disabled class="btn btn-primary">${i}</button>`;
        } else if (i === 1 || i === pagination.pages || Math.abs(i - pagination.page) <= 2) {
            html += `<button onclick="changePage(${i})" class="btn btn-secondary">${i}</button>`;
        } else if (i === 2 && pagination.page > 4) {
            html += '<span style="color: white;">...</span>';
        } else if (i === pagination.pages - 1 && pagination.page < pagination.pages - 3) {
            html += '<span style="color: white;">...</span>';
        }
    }
    
    // Next button
    html += `<button onclick="changePage(${pagination.page + 1})" ${pagination.page >= pagination.pages ? 'disabled' : ''} class="btn btn-secondary" style="opacity: ${pagination.page >= pagination.pages ? '0.5' : '1'}">Next</button>`;
    
    html += '</div>';
    paginationDiv.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    loadListings();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function viewDetails(listingId) {
    window.location.href = `/listing.html?id=${listingId}`;
}

// Add to cart functionality
async function addToCart(bookId, quantity = 1) {
    try {
        const response = await fetch('/api/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bookId, quantity: parseInt(quantity) })
        });

        const result = await response.json();

        if (response.ok) {
            showNotification(`${quantity} book(s) added to cart!`, 'success');
            updateCartCount(result.totalItems);
        } else {
            if (response.status === 401) {
                alert('Please login to add items to cart');
                window.location.href = '/login.html';
            } else {
                showNotification(result.error || 'Failed to add to cart', 'error');
            }
        }
    } catch (error) {
        console.error('Add to cart error:', error);
        showNotification('Error adding to cart', 'error');
    }
}

// Update cart count in header
async function updateCartCount(count = null) {
    if (count === null) {
        try {
            const response = await fetch('/api/cart');
            if (response.ok) {
                const cart = await response.json();
                count = cart.totalItems || 0;
            } else {
                // If not logged in or cart doesn't exist, set count to 0
                count = 0;
            }
        } catch (error) {
            console.error('Error fetching cart count:', error);
            count = 0;
        }
    }
    
    const cartCountElement = document.getElementById('cartCount');
    if (cartCountElement) {
        cartCountElement.textContent = count;
    }
}

// Show notification
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        border-radius: 4px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Add dynamic loading animations and interactions
document.addEventListener('DOMContentLoaded', function() {
    // Stagger card animations
    const cards = document.querySelectorAll('.listing-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });

    // Add floating animation to search section
    const searchSection = document.querySelector('.search-section');
    if (searchSection) {
        searchSection.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        searchSection.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    }

    // Add ripple effect to buttons
    document.querySelectorAll('.btn, .view-details-btn, .add-to-cart-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            let ripple = document.createElement('span');
            ripple.classList.add('ripple');
            this.appendChild(ripple);

            let x = e.clientX - e.target.offsetLeft;
            let y = e.clientY - e.target.offsetTop;

            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;

            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });

    // Smooth scroll for better UX
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add parallax effect to background
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallax = document.querySelector('body::before');
        if (parallax) {
            const speed = scrolled * 0.5;
            document.body.style.backgroundPosition = `0 ${speed}px`;
        }
    });
});

// Enhanced notification function with better animations
function showNotification(message, type) {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(notif => notif.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'notificationSlide 0.5s ease-out reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 500);
    }, 4000);
}

// Add intersection observer for scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animationPlayState = 'running';
        }
    });
}, observerOptions);

// Observe all cards for scroll animations
document.querySelectorAll('.listing-card').forEach(card => {
    observer.observe(card);
});
