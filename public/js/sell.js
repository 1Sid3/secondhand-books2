document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    checkAuthStatus().then(user => {
        if (!user) {
            alert('Please login to sell books');
            window.location.href = '/login.html';
        }
    });
    
    // Image upload handler
    const imageInput = document.getElementById('images');
    const imagePreview = document.getElementById('imagePreview');
    
    if (imageInput) {
        imageInput.addEventListener('change', function() {
            imagePreview.innerHTML = '';
            
            const files = Array.from(this.files);
            if (files.length > 5) {
                alert('Maximum 5 images allowed');
                this.value = '';
                return;
            }
            
            files.forEach(file => {
                if (file.size > 5 * 1024 * 1024) {
                    alert(`File ${file.name} is too large. Maximum 5MB per file.`);
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'preview-image';
                    imagePreview.appendChild(img);
                };
                reader.readAsDataURL(file);
            });
        });
    }
    
    // Form submission
    const sellForm = document.getElementById('sellForm');
    if (sellForm) {
        sellForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            
            // Show loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Creating Listing...';
            submitBtn.disabled = true;
            
            try {
                const response = await fetch('/api/listings', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    showSuccess('Listing created successfully! Redirecting...');
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 2000);
                } else {
                    showError(result.error || 'Failed to create listing. Please try again.');
                    console.error('Server response:', result);
                }
            } catch (error) {
                console.error('Error creating listing:', error);
                showError('Network error. Please check your connection and try again.');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    
    if (successDiv) successDiv.style.display = 'none';
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth' });
    }
}

function showSuccess(message) {
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        successDiv.scrollIntoView({ behavior: 'smooth' });
    }
}
