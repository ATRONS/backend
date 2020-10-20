const mongoose = require('mongoose');

const COLLECTION = 'ratings';

const RatingSchema = mongoose.Schema({
    user: { type: mongoose.Types.ObjectId, required: true, ref: 'users' },
    material: { type: mongoose.Types.ObjectId, required: true, ref: 'materials' },
    value: { type: Number, required: true, min: 1, max: 5 },
}, { timeStamp: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model(COLLECTION, RatingSchema);
