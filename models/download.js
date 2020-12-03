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

DownloadSchema.statics.createDownload = function (downloadInfo, callback) {
    this.model(COLLECTION).create(downloadInfo, callback);
}

DownloadSchema.statics.getMaterialDownloads = function (matId, callback) {
    if (!mongoose.isValidObjectId(matId)) return callback({ custom: 'Invalid ObjectId', status: 400 });

    this.model(COLLECTION).countDocuments({ material: matId }).exec(callback);
}

module.exports = mongoose.model(COLLECTION, DownloadSchema);