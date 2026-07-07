const { CognitoJwtVerifier } = require('aws-jwt-verify');
const User = require('../models/User');

let accessTokenVerifier = null;

const getRequiredEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
};

const getVerifier = () => {
  if (!accessTokenVerifier) {
    accessTokenVerifier = CognitoJwtVerifier.create({
      userPoolId: getRequiredEnv('COGNITO_USER_POOL_ID'),
      tokenUse: 'id',
      clientId: getRequiredEnv('COGNITO_CLIENT_ID'),
    });
  }
  return accessTokenVerifier;
};

const parseName = (payload) => {
  return (
    payload.name ||
    payload['custom:fullName'] ||
    payload.given_name ||
    payload.email?.split('@')[0] ||
    'SyncQuiz User'
  );
};

const syncLocalUser = async (payload) => {
  const cognitoSub = payload.sub;
  const email = payload.email?.toLowerCase();
  const fullName = parseName(payload);

  let user = await User.findOne({
    $or: [{ cognitoSub }, ...(email ? [{ email }] : [])],
  }).select('+passwordHash +refreshToken');

  if (!user) {
    user = await User.create({
      cognitoSub,
      email,
      fullName,
      passwordHash: null,
      refreshToken: null,
    });
  } else {
    let changed = false;
    if (!user.cognitoSub) {
      user.cognitoSub = cognitoSub;
      changed = true;
    }
    if (email && user.email !== email) {
      user.email = email;
      changed = true;
    }
    if (fullName && user.fullName !== fullName) {
      user.fullName = fullName;
      changed = true;
    }
    if (changed) {
      await user.save();
    }
  }

  return user;
};

const verifyAccessToken = async (token) => {
  const payload = await getVerifier().verify(token);
  const user = await syncLocalUser(payload);
  return { payload, user };
};

module.exports = { verifyAccessToken };
