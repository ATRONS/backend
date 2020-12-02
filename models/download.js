const mongoose = require('mongoose');
const luxon = require('luxon');

const COLLECTION = 'downloads';

const DownloadSchema = mongoose.Schema({
    user: { type: mongoose.Types.ObjectId, required: true, ref: 'users', index: true },
    material: { type: mongoose.Types.ObjectId, required: true, ref: 'materials', index: true },
    provider: { type: mongoose.Types.ObjectId, required: true, ref: 'providers', index: true },
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        currentTime: () => luxon.DateTime.utc().valueOf()
    }
});

module.exports = mongoose.model(COLLECTION, DownloadSchema);