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

// Static method to record user activity
dailyActiveUserSchema.statics.recordUserActivity = async function(userEmail, userName = null) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  try {
    // Use atomic operation to prevent duplicates
    const result = await this.findOneAndUpdate(
      { 
        date: today,
        'users.email': { $ne: userEmail } // Only update if email doesn't exist
      },
      {
        $push: {
          users: {
            email: userEmail,
            name: userName,
            firstSeenAt: new Date()
          }
        },
        $inc: { totalUsers: 1 } // Increment count atomically
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );
    
    // If result is null, it means the document exists but user already recorded
    if (!result) {
      return { success: true, message: 'User already recorded for today', isNew: false };
    }
    
    return { success: true, message: 'User activity recorded', isNew: true };
  } catch (error) {
    // Handle duplicate key error (if document is created simultaneously)
    if (error.code === 11000) {
      return { success: true, message: 'User already recorded for today', isNew: false };
    }
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