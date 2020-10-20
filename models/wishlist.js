const mongoose = require('mongoose');

const COLLECTION = 'wishlists';

const WishListSchema = mongoose.Schema({
    user: { type: mongoose.Types.ObjectId, required: true, ref: 'users' },
    material: { type: mongoose.Types.ObjectId, required: true, ref: 'materials' },
}, { timeStamp: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model(COLLECTION, WishListSchema);
