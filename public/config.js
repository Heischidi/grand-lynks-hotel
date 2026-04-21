// Configuration handling for different environments
// Define helper
const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    
    // Check for localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5000/api';
    }
    
    // Check for local network IPs (e.g., accessing from mobile device on same WiFi)
    if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
        return `http://${hostname}:5000/api`;
    }
    
    return '/api';
};

// Expose config
window.APP_CONFIG = {
    API_URL: getApiBaseUrl()
};

// Legacy support
window.API_BASE_URL = window.APP_CONFIG.API_URL;


