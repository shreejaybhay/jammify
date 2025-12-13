import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: function () {
      return !this.googleId && !this.githubId;
    },
  },
  image: {
    type: String,
  },
  emailVerified: {
    type: Date,
  },
  // OAuth provider IDs
  googleId: {
    type: String,
    sparse: true,
  },
  githubId: {
    type: String,
    sparse: true,
  },
  // Account verification
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: {
    type: String,
  },
  verificationTokenExpires: {
    type: Date,
  },
  // Password reset
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  // OTP for email verification
  otpCode: {
    type: String,
  },
  otpExpires: {
    type: Date,
  },
  // Online status tracking
  lastActive: {
    type: Date,
    default: Date.now,
  },
  // Admin role
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
}, {
  timestamps: true,
});

// Performance optimization: Index for online user queries
UserSchema.index({ lastActive: -1 });
UserSchema.index({ email: 1, lastActive: -1 });

// Hash password before saving
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  if (this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate OTP
UserSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otpCode = otp;
  this.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return otp;
};

// Verify OTP
UserSchema.methods.verifyOTP = function (otp) {
  return this.otpCode === otp && this.otpExpires > new Date();
};

// Update user's last active timestamp
UserSchema.methods.updateLastActive = function () {
  this.lastActive = new Date();
  return this.save();
};



export default mongoose.models.User || mongoose.model('User', UserSchema);