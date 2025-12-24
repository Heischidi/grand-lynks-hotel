// Configuration handling for different environments
if (typeof getApiBaseUrl === 'undefined') {
    const getApiBaseUrl = () => {
        // If running on localhost (dev), use the local backend port
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:5000/api';
        }
        // Otherwise (production), use the relative path /api (served by the same origin)
        return '/api';
    };

    window.APP_CONFIG = {
        API_URL: getApiBaseUrl(),
        // Add other config variables here if needed
    };

    // For backward compatibility with existing code that might expect API_BASE_URL on window
    window.API_BASE_URL = window.APP_CONFIG.API_URL;
}

window.APP_CONFIG = {
    API_URL: getApiBaseUrl(),
    // Add other config variables here if needed
};

// For backward compatibility with existing code that might expect API_BASE_URL on window
window.API_BASE_URL = window.APP_CONFIG.API_URL;
