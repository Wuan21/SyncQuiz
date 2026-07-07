const { verifyAccessToken } = require('../lib/cognito-auth');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.slice(7);
  try {
    const { payload, user } = await verifyAccessToken(token);
    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      cognitoSub: payload.sub,
      claims: payload,
    };
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
  try {
    const token = authHeader.slice(7);
    const { payload, user } = await verifyAccessToken(token);
    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      cognitoSub: payload.sub,
      claims: payload,
    };
  } catch (_) {
    // silently fail — route will handle unauthenticated state
  }
  next();
};

module.exports = { authenticate, authorize, optionalAuth };
