const mongoose = require('mongoose');
const luxon = require('luxon');
const asyncLib = require('async');
const _ = require('lodash');
const { failure } = require('../helpers/response');

const COLLECTION = 'ratings';
const LIMIT = 10;

const RatingSchema = mongoose.Schema({
    reader: { type: mongoose.Types.ObjectId, required: true, ref: 'readers' },
    material: { type: mongoose.Types.ObjectId, required: true, ref: 'materials', index: true },
    description: { type: String, default: "", maxlength: 200 },
    value: { type: Number, required: true, min: 1, max: 5 },
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        currentTime: () => luxon.DateTime.utc().valueOf()
    }
});

RatingSchema.index({ created_at: 1 });
RatingSchema.index({ user: 1, material: 1 });

RatingSchema.statics.updateRating = function (matId, userId, ratingInfo, callback) {
    if (!_.isFinite(Number(ratingInfo.value)))
        return callback({ custom: 'Invalid rating', status: 400 });

    let value = Math.floor(Number(ratingInfo.value));
    const description = ratingInfo.description || "";

    this.model(COLLECTION)
        .findOneAndUpdate(
            { reader: userId, material: matId },
            {
                $set: {
                    description: description,
                    value: value,
                }
            },
            {
                upsert: true,
                runValidators: true
            })
        .exec((err, result) => {
            if (err) return callback(err);

            if (!result) return callback(null, { isNew: true, newRating: value });
            return callback(null, { isNew: false, oldRating: result.value, newRating: value });
        });
}

RatingSchema.statics.getReadersCommentOnMaterial = function (readerId, matId, callback) {
    if (!mongoose.isValidObjectId(matId) ||
        !mongoose.isValidObjectId(readerId)) {
        return callback({ custom: 'Invalid ObjectId', status: 400 });
    }

    this.model(COLLECTION)
        .findOne({ reader: readerId, material: matId })
        .select('__v')
        .lean()
        .exec(callback);

}

RatingSchema.statics.getRatingsByMaterial = function (matId, filters, callback) {
    if (!mongoose.isValidObjectId(matId)) return failure({ custom: 'Invalid ObjectId', status: 400 });

    const page = isNaN(Number(filters.page)) ? 0 : Math.abs(Number(filters.page));
    const query = {
        material: matId,
    };

    const that = this;
    asyncLib.parallel({
        ratings: function (asyncCallback) {
            that.model(COLLECTION)
                .find(query)
                .select('-__v')
                .sort({ created_at: -1 })
                .populate('reader', { firstname: 1, lastname: 1 })
                .skip(page * LIMIT)
                .limit(LIMIT)
                .lean()
                .exec(asyncCallback);
        },
        total_ratings: function (asyncCallback) {
            that.model(COLLECTION)
                .countDocuments(query)
                .exec(asyncCallback);
        }
    }, callback);
}

module.exports = mongoose.model(COLLECTION, RatingSchema);
