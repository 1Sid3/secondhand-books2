document.addEventListener('DOMContentLoaded', function() {
    const adminLoginForm = document.getElementById('adminLoginForm');
    
    // Check if already logged in as admin
    if (isAdminLoggedIn()) {
        window.location.href = '/admin.html';
        return;
    }
    
    adminLoginForm.addEventListener('submit', handleAdminLogin);
});

async function handleAdminLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    
    // Admin credentials check
    if (username === 'ASR' && password === 'sid123') {
        // Set admin session
        localStorage.setItem('adminSession', JSON.stringify({
            username: 'ASR',
            isAdmin: true,
            loginTime: new Date().toISOString()
        }));
        
        showSuccessMessage('Admin login successful! Redirecting to dashboard...');
        
        // Redirect to admin dashboard after 1 second
        setTimeout(() => {
            window.location.href = '/admin.html';
        }, 1000);
    } else {
        showErrorMessage('Invalid admin credentials! Please check username and password.');
        
        // Clear form
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminUsername').focus();
    }
}

function isAdminLoggedIn() {
    try {
        const adminSession = localStorage.getItem('adminSession');
        if (!adminSession) return false;
        
        const session = JSON.parse(adminSession);
        
        // Check if session is valid (less than 24 hours old)
        const loginTime = new Date(session.loginTime);
        const now = new Date();
        const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
            localStorage.removeItem('adminSession');
            return false;
        }
        
        return session.isAdmin && session.username === 'ASR';
    } catch (error) {
        localStorage.removeItem('adminSession');
        return false;
    }
}

function showSuccessMessage(message) {
    showMessage(message, 'success');
}

function showErrorMessage(message) {
    showMessage(message, 'error');
}

function showMessage(message, type) {
    // Remove existing messages
    document.querySelectorAll('.message').forEach(msg => msg.remove());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 4px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 4000);
}

// Add CSS animation
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
`;
document.head.appendChild(style);
