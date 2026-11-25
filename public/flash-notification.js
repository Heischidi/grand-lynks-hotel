/**
 * Grand Lynks Homes & Apartments — Flash Sale Notification Popup
 * Shows promotional popup once per session when enabled in Site Settings
 */
(function () {
    if (window.__GrandLynksFlashLoaded) return;
    window.__GrandLynksFlashLoaded = true;

    function initFlashNotification() {
        let apiUrl = '/api';
        if (window.APP_CONFIG && window.APP_CONFIG.API_URL) {
            apiUrl = window.APP_CONFIG.API_URL.replace(/\/$/, "");
        } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            apiUrl = 'http://localhost:5000/api';
        }

        fetch(`${apiUrl}/settings`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (!data) return;

                // Validate if flash sale is enabled
                const isEnabled = data.flashEnabled === 'true' || 
                                  data.flashEnabled === true || 
                                  data.flashEnabled === '1' || 
                                  data.flashEnabled === 1;

                if (!isEnabled) return;

                const content = {
                    title: (data.flashTitle || '').trim() || 'Exclusive Grand Offer',
                    message: (data.flashMessage || '').trim() || 'Enjoy a special discount on your next stay at Grand Lynks!',
                    buttonText: (data.flashButton || '').trim() || 'Book Now',
                    link: (data.flashLink || '').trim() || 'rooms.html'
                };

                // Check session storage so users aren't spammed after dismissing
                const sessionKey = 'gl_flash_dismissed_' + encodeURIComponent(content.title);
                try {
                    if (sessionStorage.getItem(sessionKey)) {
                        return;
                    }
                } catch (e) {}

                showFlashNotification(content, sessionKey);
            })
            .catch(err => {
                console.warn('Flash notification: could not load settings', err.message);
            });
    }

    function showFlashNotification(content, sessionKey) {
        // Prevent duplicate overlays
        if (document.querySelector('.gl-flash-overlay')) return;

        const flashStyles = `
            .gl-flash-overlay {
                position: fixed;
                inset: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(7, 17, 13, 0.72);
                backdrop-filter: blur(6px);
                -webkit-backdrop-filter: blur(6px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999999;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.35s ease, visibility 0.35s ease;
                padding: 16px;
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            .gl-flash-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            .gl-flash-modal {
                background: linear-gradient(145deg, #ffffff 0%, #fdfdfd 100%);
                border-radius: 24px;
                padding: 42px 32px 36px;
                max-width: 480px;
                width: 100%;
                text-align: center;
                box-shadow: 0 25px 60px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(212, 175, 55, 0.25);
                transform: translateY(25px) scale(0.94);
                opacity: 0;
                transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.25), opacity 0.4s ease;
                position: relative;
                overflow: hidden;
                box-sizing: border-box;
            }
            .gl-flash-modal::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 6px;
                background: linear-gradient(90deg, #064E3B, #00A86B, #d4af37, #064E3B);
            }
            .gl-flash-overlay.active .gl-flash-modal {
                transform: translateY(0) scale(1);
                opacity: 1;
            }
            .gl-flash-close {
                position: absolute;
                top: 16px;
                right: 16px;
                background: rgba(0, 0, 0, 0.05);
                border: none;
                width: 34px;
                height: 34px;
                border-radius: 50%;
                font-size: 20px;
                color: #555;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                line-height: 1;
                outline: none;
            }
            .gl-flash-close:hover {
                background: rgba(139, 29, 48, 0.12);
                color: #8b1d30;
                transform: scale(1.1);
            }
            .gl-flash-icon {
                font-size: 50px;
                margin-bottom: 16px;
                display: inline-block;
                animation: glFlashPulse 2.4s infinite ease-in-out;
            }
            @keyframes glFlashPulse {
                0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(212, 175, 55, 0.3)); }
                50% { transform: scale(1.1); filter: drop-shadow(0 0 14px rgba(212, 175, 55, 0.8)); }
            }
            .gl-flash-title {
                font-family: "Cinzel", "Playfair Display", Georgia, serif;
                font-size: 1.85rem;
                color: #064E3B;
                margin: 0 0 12px;
                font-weight: 700;
                letter-spacing: 0.3px;
                line-height: 1.25;
            }
            .gl-flash-message {
                font-family: inherit;
                color: #4b5563;
                font-size: 1.02rem;
                line-height: 1.6;
                margin: 0 0 28px;
            }
            .gl-flash-btn {
                display: inline-block;
                background: linear-gradient(135deg, #00A86B 0%, #064E3B 100%);
                color: #ffffff !important;
                padding: 13px 36px;
                border-radius: 50px;
                text-decoration: none !important;
                font-weight: 700;
                font-size: 1rem;
                transition: all 0.25s ease;
                box-shadow: 0 8px 20px rgba(6, 78, 59, 0.3);
                border: none;
                cursor: pointer;
                letter-spacing: 0.4px;
            }
            .gl-flash-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 26px rgba(0, 168, 107, 0.45);
                filter: brightness(1.08);
            }
            @media (max-width: 480px) {
                .gl-flash-modal { padding: 34px 22px 28px; }
                .gl-flash-title { font-size: 1.5rem; }
                .gl-flash-message { font-size: 0.94rem; margin-bottom: 22px; }
                .gl-flash-btn { width: 100%; box-sizing: border-box; text-align: center; }
            }
        `;

        const styleEl = document.createElement('style');
        styleEl.id = 'gl-flash-notification-styles';
        styleEl.innerHTML = flashStyles;
        document.head.appendChild(styleEl);

        const overlay = document.createElement('div');
        overlay.className = 'gl-flash-overlay';

        const iconHtml = document.querySelector('link[href*="font-awesome"]')
            ? '<i class="fas fa-gift" style="color:#d4af37;"></i>'
            : '✨';

        overlay.innerHTML = `
            <div class="gl-flash-modal" role="dialog" aria-modal="true" aria-labelledby="glFlashTitle">
                <button class="gl-flash-close" aria-label="Close promotion">&times;</button>
                <div class="gl-flash-icon">${iconHtml}</div>
                <h2 class="gl-flash-title" id="glFlashTitle">${content.title}</h2>
                <div class="gl-flash-message">${content.message}</div>
                <a href="${content.link}" class="gl-flash-btn">${content.buttonText}</a>
            </div>
        `;

        document.body.appendChild(overlay);

        const dismiss = () => {
            try {
                if (sessionKey) sessionStorage.setItem(sessionKey, 'true');
            } catch (e) {}
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.remove();
                styleEl.remove();
            }, 400);
        };

        const closeBtn = overlay.querySelector('.gl-flash-close');
        if (closeBtn) closeBtn.addEventListener('click', dismiss);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) dismiss();
        });

        const actionBtn = overlay.querySelector('.gl-flash-btn');
        if (actionBtn) {
            actionBtn.addEventListener('click', () => {
                try {
                    if (sessionKey) sessionStorage.setItem(sessionKey, 'true');
                } catch (e) {}
            });
        }

        // Show popup smoothly after 750ms
        setTimeout(() => overlay.classList.add('active'), 750);
    }

    // Run when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFlashNotification);
    } else {
        initFlashNotification();
    }
})();
