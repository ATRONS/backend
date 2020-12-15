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

WishListSchema.statics.createWishlist = function (wishlistInfo, callback) {
    this.model(COLLECTION).create(wishlistInfo, callback);
}

WishListSchema.statics.getWishListByUser = function (userId, callback) {
    if (!_.isString(userId) || !mongoose.isValidObjectId(userId)) {
        return callback({ custom: 'Invalid ObjectId', status: 400 });
    }

    this.model(COLLECTION)
        .find({ reader: userId })
        .populate('material', { title: 1, subtitle: 1, _id: 1, cover_img_url: 1, provider: 1 })
        .populate('material.provider', { display_name: 1, _id: 1 })
        .exec(callback);
}

module.exports = mongoose.model(COLLECTION, WishListSchema);
