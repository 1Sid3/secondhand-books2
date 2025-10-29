document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('purchaseNotificationForm');
    form.addEventListener('submit', handleSubmit);
    
    // File upload validation
    const fileInput = document.getElementById('transactionProof');
    fileInput.addEventListener('change', validateFile);
    
    // Remove the purchaseDate line since we removed that field
    // Set default quantity to 1
    const quantityInput = document.getElementById('quantityPurchased');
    if (quantityInput && !quantityInput.value) {
        quantityInput.value = 1;
    }
});

function validateFile(event) {
    const file = event.target.files[0];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (file) {
        if (file.size > maxSize) {
            showNotification(' File size too large! Please upload an image under 5MB.', 'error');
            event.target.value = '';
            return;
        }
        
        if (!file.type.startsWith('image/')) {
            showNotification(' Please upload only image files (JPG, PNG, etc.).', 'error');
            event.target.value = '';
            return;
        }
        
        showNotification(' Image selected successfully!', 'success');
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    // Validate required fields
    const bookTitle = formData.get('bookTitle').trim();
    const bookAuthor = formData.get('bookAuthor').trim();
    const quantity = parseInt(formData.get('quantityPurchased'));
    const transactionProof = formData.get('transactionProof');
    
    // Validation
    if (!bookTitle) {
        showNotification(' Please enter the book title!', 'error');
        document.getElementById('bookTitle').focus();
        return;
    }
    
    if (!bookAuthor) {
        showNotification(' Please enter the author name!', 'error');
        document.getElementById('bookAuthor').focus();
        return;
    }
    
    if (!quantity || quantity < 1 || quantity > 10) {
        showNotification(' Quantity must be between 1 and 10!', 'error');
        document.getElementById('quantityPurchased').focus();
        return;
    }
    
    if (!transactionProof || transactionProof.size === 0) {
        showNotification(' Please upload a transaction proof image!', 'error');
        document.getElementById('transactionProof').focus();
        return;
    }
    
    try {
        // Show loading state
        const originalText = submitButton.textContent;
        submitButton.textContent = '⏳ Submitting...';
        submitButton.disabled = true;
        
        // Create notification object for localStorage (simulating backend)
        const purchaseNotification = {
            id: Date.now().toString(),
            bookTitle: bookTitle,
            bookAuthor: bookAuthor,
            quantity: quantity,
            notes: formData.get('additionalNotes')?.trim() || '',
            status: 'pending',
            createdAt: new Date().toISOString(),
            purchaseDate: new Date().toISOString(), // Use current date
            buyerName: 'Anonymous Buyer', // Can be enhanced later with user auth
            // Convert image to base64 for localStorage (in real app, upload to server)
            transactionProof: await convertImageToBase64(transactionProof)
        };
        
        // Store in localStorage (simulate backend API call)
        const existingNotifications = JSON.parse(localStorage.getItem('purchaseNotifications') || '[]');
        existingNotifications.unshift(purchaseNotification);
        localStorage.setItem('purchaseNotifications', JSON.stringify(existingNotifications));
        
        // Show success message
        showNotification(' Purchase report submitted successfully!\n\n📋 Admin will review and update the inventory.\n\n🔄 Redirecting to homepage...', 'success');
        
        // Reset form
        e.target.reset();
        
        // Redirect after 3 seconds
        setTimeout(() => {
            window.location.href = '/';
        }, 3000);
        
    } catch (error) {
        console.error('Error submitting notification:', error);
        showNotification(' Error submitting report. Please try again.', 'error');
    } finally {
        // Reset button state
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
}

// Convert image file to base64 for localStorage storage
function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Enhanced notification system
function showNotification(message, type) {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(notif => notif.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Add icon based on type
    const icons = {
        success: '',
        error: '',
        info: 'ℹ️',
        warning: '⚠️'
    };
    
    notification.innerHTML = `
        <span class="notification-icon">${icons[type] || icons.info}</span>
        <span class="notification-text">${message}</span>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        max-width: 350px;
        white-space: pre-line;
        animation: slideIn 0.3s ease-out;
        display: flex;
        align-items: flex-start;
        gap: 10px;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove notification
    const duration = type === 'success' ? 5000 : 4000;
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => notification.remove(), 300);
        }
    }, duration);
}

// Add form enhancement: Auto-capitalize first letters
document.addEventListener('DOMContentLoaded', function() {
    const titleInput = document.getElementById('bookTitle');
    const authorInput = document.getElementById('bookAuthor');
    
    function capitalizeFirstLetter(input) {
        input.addEventListener('blur', function() {
            if (this.value) {
                this.value = this.value.split(' ').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                ).join(' ');
            }
        });
    }
    
    if (titleInput) capitalizeFirstLetter(titleInput);
    if (authorInput) capitalizeFirstLetter(authorInput);
});

// Add quantity controls enhancement
document.addEventListener('DOMContentLoaded', function() {
    const quantityInput = document.getElementById('quantityPurchased');
    
    if (quantityInput) {
        quantityInput.addEventListener('input', function() {
            let value = parseInt(this.value);
            
            if (isNaN(value) || value < 1) {
                this.value = 1;
            } else if (value > 10) {
                this.value = 10;
                showNotification('⚠️ Maximum 10 copies allowed per purchase report', 'warning');
            }
        });
        
        // Add +/- buttons for better UX
        const quantityGroup = quantityInput.parentElement;
        quantityInput.style.textAlign = 'center';
        quantityInput.style.fontWeight = 'bold';
        
        // You can uncomment this to add +/- buttons
        /*
        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-top: 10px;';
        btnGroup.innerHTML = `
            <button type="button" onclick="changeQuantity(-1)" class="qty-btn">−</button>
            <span>Quantity</span>
            <button type="button" onclick="changeQuantity(1)" class="qty-btn">+</button>
        `;
        quantityGroup.appendChild(btnGroup);
        */
    }
});

// Quantity change function (if using +/- buttons)
function changeQuantity(change) {
    const quantityInput = document.getElementById('quantityPurchased');
    let currentValue = parseInt(quantityInput.value) || 1;
    let newValue = currentValue + change;
    
    if (newValue >= 1 && newValue <= 10) {
        quantityInput.value = newValue;
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
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
        font-size: 1.2rem;
        flex-shrink: 0;
        margin-top: 2px;
    }
    
    .notification-text {
        flex: 1;
        line-height: 1.4;
    }
    
    .qty-btn {
        width: 35px;
        height: 35px;
        border: 2px solid #3498db;
        background: white;
        color: #3498db;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1.2rem;
        font-weight: bold;
        transition: all 0.3s ease;
    }
    
    .qty-btn:hover {
        background: #3498db;
        color: white;
        transform: scale(1.1);
    }
`;
document.head.appendChild(style);

// Log successful initialization
console.log(' Purchase notification form initialized with enhanced features');
