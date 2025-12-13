import mongoose from 'mongoose';

const dailyActiveUserSchema = new mongoose.Schema({
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
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

// Unique index on date to prevent duplicate date documents
dailyActiveUserSchema.index({ date: 1 }, { unique: true });

// Compound index for efficient user lookup within dates
dailyActiveUserSchema.index({ date: 1, 'users.email': 1 });

// Static method to record user activity
dailyActiveUserSchema.statics.recordUserActivity = async function (userEmail, userName = null) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  try {
    // First, try to add user to existing document (if user doesn't already exist)
    const result = await this.findOneAndUpdate(
      {
        date: today,
        'users.email': { $ne: userEmail } // Only update if user email doesn't exist
      },
      {
        $push: {
          users: {
            email: userEmail,
            name: userName,
            firstSeenAt: new Date()
          }
        },
        $inc: { totalUsers: 1 }
      },
      { new: true }
    );

    if (result) {
      return { success: true, message: 'User activity recorded', isNew: true };
    }

    // If no result, either document doesn't exist or user already exists
    // Check if document exists for today
    const existingDoc = await this.findOne({ date: today });

    if (existingDoc) {
      // Document exists, so user must already be recorded
      return { success: true, message: 'User already recorded for today', isNew: false };
    }

    // Document doesn't exist, create it with this user
    const newDoc = await this.create({
      date: today,
      users: [{
        email: userEmail,
        name: userName,
        firstSeenAt: new Date()
      }],
      totalUsers: 1
    });

    return { success: true, message: 'User activity recorded', isNew: true };

  } catch (error) {
    // Handle duplicate key error for date (if two requests try to create same date document)
    if (error.code === 11000 && error.keyPattern?.date) {
      // Document was created by another request, try to add user to it
      const updateResult = await this.findOneAndUpdate(
        {
          date: today,
          'users.email': { $ne: userEmail }
        },
        {
          $push: {
            users: {
              email: userEmail,
              name: userName,
              firstSeenAt: new Date()
            }
          },
          $inc: { totalUsers: 1 }
        },
        { new: true }
      );

      if (updateResult) {
        return { success: true, message: 'User activity recorded', isNew: true };
      } else {
        return { success: true, message: 'User already recorded for today', isNew: false };
      }
    }

    console.error('Error recording user activity:', error);
    throw error;
  }
};

// Static method to get daily stats
dailyActiveUserSchema.statics.getDailyStats = async function (days = 30) {
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