import mongoose from 'mongoose';

const likedArtistSchema = new mongoose.Schema({
    // User reference
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    // Artist ID from JioSaavn API - we'll fetch other details using this ID
    artistId: {
        type: String,
        required: true,
        index: true
    },

    // Metadata
    likedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index to prevent duplicate likes
likedArtistSchema.index({ userId: 1, artistId: 1 }, { unique: true });

// Instance methods
likedArtistSchema.methods.toJSON = function () {
    const likedArtist = this.toObject();
    return {
        id: likedArtist._id,
        artistId: likedArtist.artistId,
        likedAt: likedArtist.likedAt
    };
};

// Static methods
likedArtistSchema.statics.findByUser = function (userId) {
    return this.find({ userId }).sort({ likedAt: -1 });
};

likedArtistSchema.statics.isLiked = function (userId, artistId) {
    return this.findOne({ userId, artistId });
};

likedArtistSchema.statics.toggleLike = async function (userId, artistId) {
    const existingLike = await this.findOne({ userId, artistId });

    if (existingLike) {
        // Unlike the artist
        await this.deleteOne({ userId, artistId });
        return { liked: false, message: 'Artist removed from favorites' };
    } else {
        // Like the artist
        const likedArtist = new this({
            userId,
            artistId
        });

        await likedArtist.save();
        return { liked: true, message: 'Artist added to favorites' };
    }
};

const LikedArtist = mongoose.models.LikedArtist || mongoose.model('LikedArtist', likedArtistSchema);

export default LikedArtist;