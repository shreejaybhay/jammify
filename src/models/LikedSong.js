import mongoose from 'mongoose';

const likedSongSchema = new mongoose.Schema({
    // User identification (you can use email, user ID, or session ID)
    userId: {
        type: String,
        required: true,
        index: true
    },

    // Song details from JioSaavn API
    songId: {
        type: String,
        required: true,
        index: true
    },

    songName: {
        type: String,
        required: true
    },

    artists: [{
        id: String,
        name: String,
        role: String
    }],

    album: {
        id: String,
        name: String
    },

    duration: {
        type: Number, // in seconds
        default: 0
    },

    image: [{
        quality: String,
        url: String
    }],

    releaseDate: {
        type: String
    },

    language: {
        type: String
    },

    // JioSaavn specific data
    playCount: {
        type: Number,
        default: 0
    },

    downloadUrl: [{
        quality: String,
        url: String
    }],

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
likedSongSchema.index({ userId: 1, songId: 1 }, { unique: true });

// Instance methods
likedSongSchema.methods.toJSON = function () {
    const likedSong = this.toObject();
    return {
        id: likedSong._id,
        songId: likedSong.songId,
        songName: likedSong.songName,
        artists: likedSong.artists,
        album: likedSong.album,
        duration: likedSong.duration,
        image: likedSong.image,
        releaseDate: likedSong.releaseDate,
        language: likedSong.language,
        playCount: likedSong.playCount,
        downloadUrl: likedSong.downloadUrl,
        likedAt: likedSong.likedAt,
        source: likedSong.source
    };
};

// Static methods
likedSongSchema.statics.findByUser = function (userId) {
    return this.find({ userId }).sort({ likedAt: -1 });
};

likedSongSchema.statics.isLiked = function (userId, songId) {
    return this.findOne({ userId, songId });
};

likedSongSchema.statics.toggleLike = async function (userId, songData) {
    const existingLike = await this.findOne({ userId, songId: songData.id });

    if (existingLike) {
        // Unlike the song
        await this.deleteOne({ userId, songId: songData.id });
        return { liked: false, message: 'Song removed from favorites' };
    } else {
        // Like the song
        const likedSong = new this({
            userId,
            songId: songData.id,
            songName: songData.name,
            artists: songData.artists?.primary || [],
            album: songData.album,
            duration: songData.duration,
            image: songData.image,
            releaseDate: songData.releaseDate,
            language: songData.language,
            playCount: songData.playCount,
            downloadUrl: songData.downloadUrl
        });

        await likedSong.save();
        return { liked: true, message: 'Song added to favorites' };
    }
};

const LikedSong = mongoose.models.LikedSong || mongoose.model('LikedSong', likedSongSchema);

export default LikedSong;