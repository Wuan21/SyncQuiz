const express = require('express');
const session = require('express-session');
const { Issuer, generators } = require('openid-client');
const path = require('path');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

let client;
// Initialize OpenID Client
async function initializeClient() {
    // Dynamically discover issuer from Cognito User Pool
    const issuer = await Issuer.discover('https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_xQu6eB8nL');
    client = new issuer.Client({
        client_id: '2a9v8o98261sil337s7rq1t4ld',
        // In Cognito, public clients (like Single Page Apps or standard test clients) might not have a client secret.
        // If a client secret is configured in Cognito, replace '<client secret>' with the actual secret.
        client_secret: process.env.COGNITO_CLIENT_SECRET || undefined,
        redirect_uris: ['http://localhost:5173'],
        response_types: ['code']
    });
    console.log('[Cognito Demo] OpenID Client initialized successfully.');
}
initializeClient().catch(err => {
    console.error('[Cognito Demo] Failed to discover Cognito issuer. Check internet connection or User Pool ID.');
    console.error(err);
});

// Configure session middleware
app.use(session({
    secret: 'some secret key for session',
    resave: false,
    saveUninitialized: false
}));

// Auth checking middleware
const checkAuth = (req, res, next) => {
    if (!req.session.userInfo) {
        req.isAuthenticated = false;
    } else {
        req.isAuthenticated = true;
    }
    next();
};

// Home route
app.get('/', checkAuth, (req, res) => {
    res.render('home', {
        isAuthenticated: req.isAuthenticated,
        userInfo: req.session.userInfo
    });
});

// Login route directing to Cognito hosted UI
app.get('/login', (req, res) => {
    if (!client) {
        return res.status(500).send('OpenID Client not initialized. Please refresh in a moment.');
    }
    const nonce = generators.nonce();
    const state = generators.state();

    req.session.nonce = nonce;
    req.session.state = state;

    const authUrl = client.authorizationUrl({
        scope: 'phone openid email profile',
        state: state,
        nonce: nonce,
    });

    res.redirect(authUrl);
});

// Helper function to get the path from the URL. Example: "http://localhost/hello" returns "/hello"
function getPathFromURL(urlString) {
    try {
        const url = new URL(urlString);
        return url.pathname;
    } catch (error) {
        console.error('Invalid URL:', error);
        return null;
    }
}

// Redirect URI Callback handler
const callbackPath = getPathFromURL('http://localhost:5173') || '/';
app.get(callbackPath, async (req, res) => {
    // If there is no code in the query, it is just a normal access to the home page route
    if (!req.query.code) {
        return res.redirect('/');
    }

    try {
        if (!client) {
            return res.status(500).send('OpenID Client not initialized.');
        }
        const params = client.callbackParams(req);
        const tokenSet = await client.callback(
            'http://localhost:5173',
            params,
            {
                nonce: req.session.nonce,
                state: req.session.state
            }
        );

        const userInfo = await client.userinfo(tokenSet.access_token);
        req.session.userInfo = userInfo;

        res.redirect('/');
    } catch (err) {
        console.error('Callback error:', err);
        res.redirect('/');
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy();
    
    // Replace with your Cognito User Pool Domain if configured
    // For Cognito custom domains or Cognito prefix domains (e.g. prefix.auth.ap-southeast-1.amazoncognito.com)
    const userPoolDomain = process.env.COGNITO_DOMAIN || 'ap-southeast-1_xQu6eB8nL.auth.ap-southeast-1.amazoncognito.com';
    const logoutUrl = `https://${userPoolDomain}/logout?client_id=2a9v8o98261sil337s7rq1t4ld&logout_uri=http://localhost:5173`;
    res.redirect(logoutUrl);
});

const PORT = process.env.PORT || 5173;
app.listen(PORT, () => {
    console.log(`[Cognito Demo Server] Running on http://localhost:${PORT}`);
});
