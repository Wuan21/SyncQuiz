const User = require('../models/User');

exports.register = async (req, res, next) => {
  try {
    return res.status(501).json({
      message: 'Registration is handled by AWS Cognito. Use the frontend Cognito flow instead.',
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    return res.status(501).json({
      message: 'Login is handled by AWS Cognito. Use the frontend Cognito flow instead.',
    });
  } catch (err) {
    next(err);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    return res.status(501).json({
      message: 'Token refresh is handled by AWS Cognito. Use the frontend Cognito session refresh instead.',
    });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
};
