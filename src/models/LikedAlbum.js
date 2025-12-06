import mongoose from 'mongoose';

const likedAlbumSchema = new mongoose.Schema({
    // User reference
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    // Album ID from JioSaavn API - we'll fetch other details using this ID
    albumId: {
        type: String,
        required: true,
        index: true
    },

    // Album metadata for quick access
    albumData: {
        name: String,
        image: [{
            quality: String,
            url: String
        }],
        artists: {
            primary: [{
                id: String,
                name: String
            }]
        },
        year: String,
        songCount: Number
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
likedAlbumSchema.index({ userId: 1, albumId: 1 }, { unique: true });

// Instance methods
likedAlbumSchema.methods.toJSON = function () {
    const likedAlbum = this.toObject();
    return {
        id: likedAlbum._id,
        albumId: likedAlbum.albumId,
        albumData: likedAlbum.albumData,
        likedAt: likedAlbum.likedAt
    };
};

// Static methods
likedAlbumSchema.statics.findByUser = function (userId) {
    return this.find({ userId }).sort({ likedAt: -1 });
};

likedAlbumSchema.statics.isLiked = function (userId, albumId) {
    return this.findOne({ userId, albumId });
};

likedAlbumSchema.statics.toggleLike = async function (userId, albumData) {
    const existingLike = await this.findOne({ userId, albumId: albumData.id });

    if (existingLike) {
        // Unlike the album
        await this.deleteOne({ userId, albumId: albumData.id });
        return { liked: false, message: 'Album removed from favorites' };
    } else {
        // Like the album
        const likedAlbum = new this({
            userId,
            albumId: albumData.id,
            albumData: {
                name: albumData.name,
                image: albumData.image,
                artists: albumData.artists,
                year: albumData.year,
                songCount: albumData.songCount || albumData.songs?.length
            }
        });

        await likedAlbum.save();
        return { liked: true, message: 'Album added to favorites' };
    }
};

const LikedAlbum = mongoose.models.LikedAlbum || mongoose.model('LikedAlbum', likedAlbumSchema);

export default LikedAlbum;