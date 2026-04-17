// Review Integration with Backend
class ReviewIntegration {
    constructor() {
        this.API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_URL) || 'http://localhost:5000/api';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.fetchReviews();
    }

    async fetchReviews() {
        const grid = document.getElementById('reviewsGrid');
        if (!grid) return;

        try {
            const response = await fetch(`${this.API_URL}/reviews?status=approved`);
            if (response.ok) {
                const reviews = await response.json();
                this.renderReviews(reviews);
            } else {
                throw new Error('Failed to load reviews');
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px;"><p>Unable to load reviews at the moment.</p></div>';
        }
    }

    renderReviews(reviews) {
        const grid = document.getElementById('reviewsGrid');
        if (!grid) return;

        grid.innerHTML = '';

        if (reviews.length === 0) {
            // Empty State
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px; background: #1a0505; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                    <h3 style="color: var(--gold); margin-bottom: 10px; font-family: 'Playfair Display', serif;">Be the first to say something!</h3>
                    <p style="color: #fff; font-size: 1.1rem; opacity: 0.9;">We'd love to hear about your experience.</p>
                </div>
            `;
            return;
        }

        reviews.forEach((review, index) => {
            const delay = (index % 3) * 100; // Stagger animation
            const stars = '⭐'.repeat(review.rating);

            const card = document.createElement('div');
            card.className = 'review-card';
            card.setAttribute('data-aos', 'fade-up');
            card.setAttribute('data-aos-delay', delay);

            card.innerHTML = `
                <div class="review-stars">${stars}</div>
                <p class="review-text">"${this.escapeHtml(review.content)}"</p>
                <div class="review-author">
                    <strong>${this.escapeHtml(review.guestName)}</strong>
                    <span class="review-location">${this.escapeHtml(review.guestType || 'Guest')}</span>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    setupEventListeners() {
        // Review form submission
        const reviewForm = document.getElementById('reviewForm');
        if (reviewForm) {
            reviewForm.addEventListener('submit', (e) => this.handleReviewSubmission(e));
        }
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

        // Map form fields to database schema
        data.guestName = formData.get('reviewerName');
        data.guestEmail = formData.get('reviewerEmail');
        data.guestType = formData.get('reviewerType');
        data.rating = parseInt(formData.get('rating'), 10);
        data.title = formData.get('reviewTitle');
        data.content = formData.get('reviewText');
        data.highlights = formData.get('reviewHighlights');
        data.suggestions = formData.get('reviewSuggestions');

        // Add metadata
        data.status = 'pending'; // For admin approval

        return data;
    }

    validateReviewData(data) {
        const required = ['guestName', 'rating', 'content'];
        return required.every(field => {
            if (field === 'rating') return data[field] && data[field] > 0;
            return data[field] && data[field].trim() !== '';
        });
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
