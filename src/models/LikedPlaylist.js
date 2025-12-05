import mongoose from 'mongoose';

const likedPlaylistSchema = new mongoose.Schema({
    // User identification
    userId: {
        type: String,
        required: true,
        index: true
    },

    // Playlist details from JioSaavn API
    playlistId: {
        type: String,
        required: true,
        index: true
    },

    playlistName: {
        type: String,
        required: true
    },

    description: {
        type: String,
        default: ''
    },

    image: [{
        quality: String,
        url: String
    }],

    songCount: {
        type: Number,
        default: 0
    },

    // Metadata
    likedAt: {
        type: Date,
        default: Date.now
    },

    // Source information
    source: {
        type: String,
        default: 'jiosaavn'
    }
}, {
    timestamps: true
});

// Compound index to prevent duplicate likes
likedPlaylistSchema.index({ userId: 1, playlistId: 1 }, { unique: true });

// Instance methods
likedPlaylistSchema.methods.toJSON = function () {
    const likedPlaylist = this.toObject();
    return {
        id: likedPlaylist._id,
        playlistId: likedPlaylist.playlistId,
        playlistName: likedPlaylist.playlistName,
        description: likedPlaylist.description,
        image: likedPlaylist.image,
        songCount: likedPlaylist.songCount,
        likedAt: likedPlaylist.likedAt,
        source: likedPlaylist.source
    };
};

// Static methods
likedPlaylistSchema.statics.findByUser = function (userId) {
    return this.find({ userId }).sort({ likedAt: -1 });
};

likedPlaylistSchema.statics.isLiked = function (userId, playlistId) {
    return this.findOne({ userId, playlistId });
};

likedPlaylistSchema.statics.toggleLike = async function (userId, playlistData) {
    const existingLike = await this.findOne({ userId, playlistId: playlistData.id });

    if (existingLike) {
        // Unlike the playlist
        await this.deleteOne({ userId, playlistId: playlistData.id });
        return { liked: false, message: 'Playlist removed from favorites' };
    } else {
        // Like the playlist
        const likedPlaylist = new this({
            userId,
            playlistId: playlistData.id,
            playlistName: playlistData.name || playlistData.title,
            description: playlistData.description || '',
            image: playlistData.image,
            songCount: playlistData.songCount || playlistData.song_count || 0
        });

        await likedPlaylist.save();
        return { liked: true, message: 'Playlist added to favorites' };
    }
};

const LikedPlaylist = mongoose.models.LikedPlaylist || mongoose.model('LikedPlaylist', likedPlaylistSchema);

export default LikedPlaylist;