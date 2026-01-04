// Configuration handling for different environments
// Define helper
const getApiBaseUrl = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000/api';
    }
    return '/api';
};

// Expose config
window.APP_CONFIG = {
    API_URL: getApiBaseUrl()
};

// Legacy support
window.API_BASE_URL = window.APP_CONFIG.API_URL;
}) ();

