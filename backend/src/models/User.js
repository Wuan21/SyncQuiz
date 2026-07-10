const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    passwordHash: { type: String, select: false, default: null },
    cognitoId: { type: String, unique: true, sparse: true },
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    avatarUrl: { type: String, default: null },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: true },
    refreshToken: { type: String, select: false, default: null },
    totalQuizzesCreated: { type: Number, default: 0 },
    totalGamesHosted: { type: Number, default: 0 },
    totalGamesPlayed: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.refreshToken;
        return ret;
      },
    },
  },
);

const User = mongoose.model('User', userSchema);
module.exports = User;
