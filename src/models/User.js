const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required() { return !this.googleSubject; }, select: false },
  googleSubject: { type: String, unique: true, sparse: true },
  phone: { type: String, default: '' },
  avatar: { type: String, default: '' },
  addresses: [{
    label: { type: String, required: true },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String, default: '' },
    city: { type: String, required: true },
    region: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true }
  }],
  passwordReset: {
    type: new mongoose.Schema({
      hash: String, expiresAt: Date, sentAt: Date,
      attempts: { type: Number, default: 0 }
    }, { _id: false }),
    select: false
  },
  emailChange: {
    type: new mongoose.Schema({
      email: String, oldHash: String, newHash: String,
      expiresAt: Date, sentAt: Date,
      attempts: { type: Number, default: 0 },
      version: Number
    }, { _id: false }),
    select: false
  },
  referralId: { type: String, default: '' },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  emailVerified: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },
  sessionVersion: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
