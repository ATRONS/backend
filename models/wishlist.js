const mongoose = require('mongoose');
const luxon = require('luxon');

const COLLECTION = 'wishlists';

const WishListSchema = mongoose.Schema({
    user: { type: mongoose.Types.ObjectId, required: true, ref: 'users', index: true },
    material: { type: mongoose.Types.ObjectId, required: true, ref: 'materials' },
}, {
    timeStamp: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        currentTime: () => luxon.DateTime.utc().valueOf()
    }
});

module.exports = mongoose.model(COLLECTION, WishListSchema);
