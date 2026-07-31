document.addEventListener('DOMContentLoaded', () => {
    // Check if we've already shown the notification in this session
    if (sessionStorage.getItem('flashNotificationShown')) {
        return;
    }

    const apiUrl = (window.APP_CONFIG && window.APP_CONFIG.API_URL) ? window.APP_CONFIG.API_URL : '/api';

    fetch(`${apiUrl}/settings`)
        .then(res => res.json())
        .then(data => {
            // Support both boolean true and string 'true'
            const isEnabled = data.flashEnabled === true || data.flashEnabled === 'true';
            if (!isEnabled) return;

            const content = {
                title: data.flashTitle || 'Exclusive Grand Offer',
                message: data.flashMessage || 'Enjoy a special discount on your next stay!',
                buttonText: data.flashButton || 'Book Now',
                link: data.flashLink || 'rooms.html'
            };

            showFlashNotification(content);
        })
        .catch(err => {
            console.error('Flash notification: Failed to load settings', err);
        });

    function showFlashNotification(content) {
        const flashStyles = `
            .flash-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.65);
                backdrop-filter: blur(8px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.4s ease, visibility 0.4s ease;
            }
            .flash-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            .flash-modal {
                background: linear-gradient(145deg, #ffffff, #fcfcfc);
                border-radius: 20px;
                padding: 45px 35px;
                max-width: 480px;
                width: 90%;
                text-align: center;
                box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.3);
                transform: translateY(30px) scale(0.9);
                opacity: 0;
                transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.5s ease;
                position: relative;
                border: 1px solid rgba(212, 175, 55, 0.3);
                overflow: hidden;
            }
            .flash-modal::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 6px;
                background: linear-gradient(90deg, #d4af37, #f3e5ab, #d4af37);
            }
            .flash-overlay.active .flash-modal {
                transform: translateY(0) scale(1);
                opacity: 1;
            }
            .flash-close {
                position: absolute;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.05);
                border: none;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                font-size: 20px;
                color: #666;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .flash-close:hover {
                background: rgba(139, 29, 48, 0.1);
                color: #8b1d30;
                transform: rotate(90deg);
            }
            .flash-icon {
                font-size: 54px;
                color: #d4af37;
                margin-bottom: 20px;
                animation: flash-pulse-glow 2.5s infinite;
                display: inline-block;
            }
            .flash-title {
                font-family: "Cinzel", serif;
                font-size: 2rem;
                color: #d4af37;
                margin-bottom: 15px;
                font-weight: 700;
                letter-spacing: 0.5px;
            }
            .flash-message {
                font-family: "Poppins", sans-serif;
                color: #555;
                font-size: 1.05rem;
                line-height: 1.6;
                margin-bottom: 35px;
            }
            .flash-btn {
                display: inline-block;
                background: #8b1d30;
                color: #fff !important;
                padding: 14px 35px;
                border-radius: 50px;
                text-decoration: none;
                font-family: "Poppins", sans-serif;
                font-weight: 600;
                font-size: 1rem;
                transition: all 0.3s ease;
                box-shadow: 0 10px 20px rgba(139, 29, 48, 0.2);
                border: none;
                cursor: pointer;
                letter-spacing: 0.5px;
            }
            .flash-btn:hover {
                background: #d4af37;
                transform: translateY(-4px);
                box-shadow: 0 15px 30px rgba(212, 175, 55, 0.35);
            }
            @keyframes flash-pulse-glow {
                0%   { transform: scale(1);    filter: drop-shadow(0 0 0 rgba(212, 175, 55, 0.4)); }
                50%  { transform: scale(1.08); filter: drop-shadow(0 0 15px rgba(212, 175, 55, 0.8)); }
                100% { transform: scale(1);    filter: drop-shadow(0 0 0 rgba(212, 175, 55, 0.4)); }
            }
            @media (max-width: 480px) {
                .flash-modal { padding: 40px 25px 35px; }
                .flash-title { font-size: 1.7rem; }
                .flash-message { font-size: 0.95rem; }
            }
        `;

        const styleEl = document.createElement('style');
        styleEl.innerHTML = flashStyles;
        document.head.appendChild(styleEl);

        const overlay = document.createElement('div');
        overlay.className = 'flash-overlay';

        const iconHtml = document.querySelector('link[href*="font-awesome"]')
            ? '<i class="fas fa-gift"></i>'
            : '✨';

        overlay.innerHTML = `
            <div class="flash-modal">
                <button class="flash-close" aria-label="Close">&times;</button>
                <div class="flash-icon">${iconHtml}</div>
                <h2 class="flash-title">${content.title}</h2>
                <p class="flash-message">${content.message}</p>
                <a href="${content.link}" class="flash-btn">${content.buttonText}</a>
            </div>
        `;

        document.body.appendChild(overlay);

        const closeModal = () => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 500);
            sessionStorage.setItem('flashNotificationShown', 'true');
        };

        overlay.querySelector('.flash-close').addEventListener('click', closeModal);
        overlay.addEventListener('click', e => {
            if (e.target === overlay) closeModal();
        });

        setTimeout(() => overlay.classList.add('active'), 1500);
    }
});
