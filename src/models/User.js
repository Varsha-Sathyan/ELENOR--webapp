const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required() { return !this.googleSubject; }, select: false },
  googleSubject: { type: String, unique: true, sparse: true },
  phone: { type: String, default: '' },
  avatar: { type: String, default: '' },
  referralId: { type: String, default: '' },
  emailVerified: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
