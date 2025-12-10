import mongoose from 'mongoose';

const dailyActiveUserSchema = new mongoose.Schema({
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true,
    index: true
  },
  users: [{
    email: {
      type: String,
      required: true
    },
    name: String,
    firstSeenAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalUsers: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
dailyActiveUserSchema.index({ date: 1, 'users.email': 1 });

// Unique index to prevent duplicate date documents
dailyActiveUserSchema.index({ date: 1 }, { unique: true });

// Static method to record user activity
dailyActiveUserSchema.statics.recordUserActivity = async function(userEmail, userName = null) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  try {
    // Step 1: Check if user already exists for today
    const existingRecord = await this.findOne({
      date: today,
      'users.email': userEmail
    });
    
    if (existingRecord) {
      return { success: true, message: 'User already recorded for today', isNew: false };
    }
    
    // Step 2: Find or create today's document
    let todayRecord = await this.findOne({ date: today });
    
    if (!todayRecord) {
      // Create new document for today
      todayRecord = new this({
        date: today,
        users: [],
        totalUsers: 0
      });
    }
    
    // Step 3: Add user if not already present (double-check)
    const userExists = todayRecord.users.some(user => user.email === userEmail);
    
    if (userExists) {
      return { success: true, message: 'User already recorded for today', isNew: false };
    }
    
    // Step 4: Add user and save
    todayRecord.users.push({
      email: userEmail,
      name: userName,
      firstSeenAt: new Date()
    });
    todayRecord.totalUsers = todayRecord.users.length;
    
    await todayRecord.save();
    
    return { success: true, message: 'User activity recorded', isNew: true };
  } catch (error) {
    console.error('Error recording user activity:', error);
    throw error;
  }
};

// Static method to get daily stats
dailyActiveUserSchema.statics.getDailyStats = async function(days = 30) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const stats = await this.find({
      date: {
        $gte: startDateStr,
        $lte: endDateStr
      }
    })
    .select('date totalUsers')
    .sort({ date: 1 })
    .lean();
    
    return stats;
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    throw error;
  }
};

const DailyActiveUser = mongoose.models.DailyActiveUser || mongoose.model('DailyActiveUser', dailyActiveUserSchema);

export default DailyActiveUser;