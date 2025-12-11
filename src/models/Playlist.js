import mongoose from 'mongoose';

const playlistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  songIds: [{
    type: String, // Store only song IDs as strings
    required: true
  }],
  isPublic: {
    type: Boolean,
    default: true // Default to public playlist
  },
  description: {
    type: String,
    default: '',
    trim: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
playlistSchema.index({ userId: 1, createdAt: -1 });

// Static method to create playlist with automatic naming
playlistSchema.statics.createPlaylist = async function(userId) {
  try {
    // Count existing playlists for this user to generate next number
    const playlistCount = await this.countDocuments({ userId });
    const playlistNumber = playlistCount + 1;
    
    // Generate automatic name
    const automaticName = `My Playlist #${playlistNumber}`;
    
    // Create new playlist
    const playlist = new this({
      name: automaticName,
      userId,
      songIds: [],
      isPublic: true,
      description: ''
    });
    
    await playlist.save();
    return playlist;
    
  } catch (error) {
    console.error('Error creating playlist:', error);
    throw error;
  }
};

// Instance method to add song ID
playlistSchema.methods.addSong = async function(songId) {
  if (!this.songIds.includes(songId)) {
    this.songIds.push(songId);
    await this.save();
    return { success: true, message: 'Song added to playlist' };
  }
  return { success: false, message: 'Song already in playlist' };
};

// Instance method to remove song ID
playlistSchema.methods.removeSong = async function(songId) {
  const index = this.songIds.indexOf(songId);
  if (index > -1) {
    this.songIds.splice(index, 1);
    await this.save();
    return { success: true, message: 'Song removed from playlist' };
  }
  return { success: false, message: 'Song not found in playlist' };
};

// Instance method to get song count
playlistSchema.methods.getSongCount = function() {
  return this.songIds.length;
};

// Static method to find user's playlists
playlistSchema.statics.findByUser = async function(userId) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .lean();
};

const Playlist = mongoose.models.Playlist || mongoose.model('Playlist', playlistSchema);

export default Playlist;