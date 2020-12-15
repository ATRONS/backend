const mongoose = require('mongoose');
const _ = require('lodash');
const luxon = require('luxon');

const COLLECTION = 'wishlists';

const WishListSchema = mongoose.Schema({
    reader: { type: mongoose.Types.ObjectId, required: true, ref: 'readers', index: true },
    material: { type: mongoose.Types.ObjectId, required: true, ref: 'materials', index: true },
}, {
    timeStamp: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        currentTime: () => luxon.DateTime.utc().valueOf()
    }
});

WishListSchema.index({ reader: 1, material: 1 }, { unique: true });

WishListSchema.statics.createWishlist = function (wishlistInfo, callback) {
    this.model(COLLECTION).create(wishlistInfo, callback);
}

WishListSchema.statics.removeFromWishlist = function (userId, wishlistId, callback) {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(wishlistId)) {
        return callback({ custom: 'Invalid ObjectIds', status: 400 });
    }
    this.model(COLLECTION).remove({ reader: userId, _id: wishlistId }).exec(callback);
}

WishListSchema.statics.getWishListByUserAndMaterial = function (userId, matId, callback) {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(matId)) {
        return callback({ custom: 'Invalid ObjectIds', status: 400 });
    }
    this.model(COLLECTION).findOne({ reader: userId, material: matId }).exec(callback);
}

WishListSchema.statics.getWishListByUser = function (userId, callback) {
    if (!mongoose.isValidObjectId(userId)) {
        return callback({ custom: 'Invalid ObjectId', status: 400 });
    }

    this.model(COLLECTION)
        .find({ reader: userId })
        .populate('material')
        .exec(callback);
}

module.exports = mongoose.model(COLLECTION, WishListSchema);
