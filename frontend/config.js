export const CONFIG = {
    // During local development, this defaults to localhost.
    // When deployed, you must update the production URL below or ensure this logic works for your setup.
    // If you know your backend URL, put it here.
    API_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:8000'
        : 'https://learnpath-h0m1.onrender.com' // TODO: Replace with your actual Render Backend URL after deployment
};
