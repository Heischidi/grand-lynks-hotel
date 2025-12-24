// Review Integration with Backend
class ReviewIntegration {
    constructor() {
        this.API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_URL) || 'http://localhost:5000/api';
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Review form submission
        const reviewForm = document.getElementById('reviewForm');
        if (reviewForm) {
            reviewForm.addEventListener('submit', (e) => this.handleReviewSubmission(e));
        }

        // Rating stars interaction
        this.setupRatingStars();
    }

    setupRatingStars() {
        const ratingInputs = document.querySelectorAll('input[name="rating"]');
        const ratingLabels = document.querySelectorAll('.rating-input label');

        ratingInputs.forEach((input, index) => {
            input.addEventListener('change', () => {
                // Update visual feedback
                ratingLabels.forEach((label, labelIndex) => {
                    if (labelIndex < index + 1) {
                        label.style.color = '#FFD700'; // Gold color for selected stars
                    } else {
                        label.style.color = '#ccc'; // Gray for unselected stars
                    }
                });
            });
        });
    }

    async handleReviewSubmission(event) {
        event.preventDefault();

        const form = event.target;
        const submitButton = form.querySelector('button[type="submit"]');
        
        // Show loading state
        this.showLoading(submitButton, 'Submitting Review...');

        try {
            // Collect form data
            const formData = this.collectFormData(form);
            
            // Validate form data
            if (!this.validateReviewData(formData)) {
                this.showError('Please fill in all required fields');
                return;
            }

            // Submit to backend
            const response = await fetch(`${this.API_URL}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Failed to submit review');
            }

            const result = await response.json();
            
            // Show success message
            this.showSuccess('Thank you! Your review has been submitted successfully.');
            
            // Close modal and reset form
            this.closeReviewModal();
            this.resetReviewForm(form);

        } catch (error) {
            console.error('Error submitting review:', error);
            this.showError('Failed to submit review. Please try again.');
        } finally {
            this.hideLoading(submitButton, 'Submit Review');
        }
    }

    collectFormData(form) {
        const formData = new FormData(form);
        const data = {};

        // Convert FormData to object
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        // Add timestamp
        data.submittedAt = new Date().toISOString();
        data.status = 'pending'; // For admin approval

        return data;
    }

    validateReviewData(data) {
        const required = ['reviewerName', 'rating', 'reviewText'];
        return required.every(field => data[field] && data[field].trim() !== '');
    }

    showLoading(button, text) {
        if (button) {
            button.disabled = true;
            button.innerHTML = `<span class="loading-spinner"></span> ${text}`;
        }
    }

    hideLoading(button, text) {
        if (button) {
            button.disabled = false;
            button.innerHTML = text;
        }
    }

    showError(message) {
        // Create or update error message
        let errorDiv = document.getElementById('review-error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'review-error-message';
            errorDiv.className = 'error-message';
            const modalContent = document.querySelector('.modal-content');
            if (modalContent) {
                modalContent.insertBefore(errorDiv, modalContent.querySelector('.review-form'));
            }
        }
        
        errorDiv.innerHTML = `<p>${message}</p>`;
        errorDiv.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    showSuccess(message) {
        // Create or update success message
        let successDiv = document.getElementById('review-success-message');
        if (!successDiv) {
            successDiv = document.createElement('div');
            successDiv.id = 'review-success-message';
            successDiv.className = 'success-message';
            const modalContent = document.querySelector('.modal-content');
            if (modalContent) {
                modalContent.insertBefore(successDiv, modalContent.querySelector('.review-form'));
            }
        }
        
        successDiv.innerHTML = `<p>${message}</p>`;
        successDiv.style.display = 'block';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    }

    closeReviewModal() {
        const modal = document.getElementById('reviewModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    resetReviewForm(form) {
        if (form) {
            form.reset();
            
            // Reset rating stars
            const ratingLabels = document.querySelectorAll('.rating-input label');
            ratingLabels.forEach(label => {
                label.style.color = '#ccc';
            });
        }
    }
}

// Initialize review integration when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ReviewIntegration();
});
