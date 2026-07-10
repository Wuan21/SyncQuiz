const jwt = require('jsonwebtoken');
const { CognitoJwtVerifier } = require('aws-jwt-verify');
const User = require('../models/User');

let cognitoVerifier = null;
const useCognito = !!(process.env.AWS_COGNITO_USER_POOL_ID && process.env.AWS_COGNITO_CLIENT_ID);

if (useCognito) {
  try {
    cognitoVerifier = CognitoJwtVerifier.create({
      userPoolId: process.env.AWS_COGNITO_USER_POOL_ID,
      tokenUse: process.env.AWS_COGNITO_TOKEN_USE || 'id',
      clientId: process.env.AWS_COGNITO_CLIENT_ID,
    });
    console.log(`[AuthMiddleware] AWS Cognito verification enabled (tokenUse: ${process.env.AWS_COGNITO_TOKEN_USE || 'id'}).`);
  } catch (err) {
    console.error('[AuthMiddleware] Failed to initialize Cognito verifier:', err);
  }
} else {
  console.warn('[AuthMiddleware] AWS Cognito environment variables not found. Falling back to local JWT verification.');
}

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.slice(7);

  if (useCognito && cognitoVerifier) {
    try {
      const payload = await cognitoVerifier.verify(token);
      const cognitoId = payload.sub;
      const email = payload.email || '';
      const fullName = payload.name || payload['custom:fullName'] || email.split('@')[0] || 'Cognito User';
      
      const groups = payload['cognito:groups'] || [];
      const role = groups.includes('admin') ? 'admin' : 'user';

      let user = await User.findOne({ $or: [{ cognitoId }, { email }] });
      if (!user) {
        user = await User.create({
          cognitoId,
          email,
          fullName,
          role,
        });
      } else if (!user.cognitoId) {
        user.cognitoId = cognitoId;
        await user.save();
      }

      req.user = { id: user._id.toString(), email: user.email, role: user.role, cognitoId };
      return next();
    } catch (err) {
      console.error('[AuthMiddleware] Cognito verification failed:', err.message);
      return res.status(401).json({ message: 'Invalid or expired Cognito token' });
    }
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

const optionalAuth = async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();
  const token = authHeader.slice(7);

  if (useCognito && cognitoVerifier) {
    try {
      const payload = await cognitoVerifier.verify(token);
      const cognitoId = payload.sub;
      const email = payload.email || '';
      
      let user = await User.findOne({ $or: [{ cognitoId }, { email }] });
      if (user) {
        req.user = { id: user._id.toString(), email: user.email, role: user.role, cognitoId };
      }
    } catch (_) {
      // silently fail
    }
    return next();
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
  } catch (_) {
    // silently fail
  }
  next();
};

module.exports = { authenticate, authorize, optionalAuth };
