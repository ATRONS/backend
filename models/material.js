const mongoose = require('mongoose');
const luxon = require('luxon');
const asyncLib = require('async');
const _ = require('lodash');

const COLLECTION = 'materials';
const LIMIT = 10;

const FileSchema = mongoose.Schema({
    id: { type: mongoose.Types.ObjectId, required: true, index: true },
    size: { type: Number, required: true, min: 1 },
    mimetype: { type: String, required: true },
    contentType: { type: String, required: true },
    url: { type: String, required: true },
}, { _id: false });

const MaterialSchema = mongoose.Schema({
    type: {
        type: String,
        required: true,
        trim: true,
        enum: ['BOOK', 'MAGAZINE', 'NEWSPAPER'],
        index: true,
    },
    title: { type: String, required: true, trim: true, index: true },
    subtitle: { type: String, default: "", trim: true, sparse: true },

    file: { type: FileSchema, required: true },
    cover_img_url: { type: String, required: true },

    published_date: { type: Date, required: true },
    display_date: { type: String, trim: true },
    language: { type: String, trim: true, lowercase: true, enum: ["english", "amharic"] },

    // Book related fields
    ISBN: { type: String, trim: true, sparse: true },
    synopsis: {
        type: String,
        trim: true,
        required: function () { return this.type === 'BOOK' }
    },
    review: { type: String, trim: true },
    tags: {
        type: [{ type: mongoose.Schema.ObjectId, ref: 'tags' }],
        index: true,
    },

    pages: { type: Number, required: true, min: 1 },
    edition: { type: Number, required: true, min: 1 },
    provider: {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: 'providers',
        index: true,
    },

    price: {
        free: { type: Boolean, default: false },
        selling: { type: Number, default: 0, min: 0 },
        rent: {
            value: { type: Number, default: 0, min: 0 },
            per: { type: Number, default: 1 },
        }
    },

    rating: {
        value: { type: Number, default: 0, index: true },
        voters: { type: Number, default: 0 },
        groups: { type: [Number], default: [0, 0, 0, 0, 0] },
    },

    deleted: { type: Boolean, default: false },
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        currentTime: () => luxon.DateTime.utc().valueOf()
    }
});

MaterialSchema.index({ title: 'text', subtitle: 'text', ISBN: 'text' });
MaterialSchema.index({ created_at: 1 });

MaterialSchema.statics.getMaterial = function (oId, callback) {
    if (!mongoose.isValidObjectId(oId)) return callback({ custom: 'Invalid Id', status: 400 });

    this.model(COLLECTION)
        .findOne({ _id: oId })
        .select('-__v -deleted')
        .populate('tags', { __v: 0 })
        .populate("provider", { display_name: 1 })
        .lean()
        .exec(callback);
}

MaterialSchema.statics.getMaterialByFileId = function (fileId, callback) {
    if (!mongoose.isValidObjectId(fileId)) return callback({ custom: 'Invalid Id', status: 400 });

    this.model(COLLECTION)
        .findOne({ 'file.id': fileId })
        .select('_id provider')
        .lean()
        .exec(callback);
}

MaterialSchema.statics.updateMaterial = function (oId, update, callback) {
    if (!mongoose.isValidObjectId(oId)) return callback({ custom: 'Invalid Id', status: 400 });

    this.model(COLLECTION)
        .findOne({ _id: oId })
        .exec(function (err, material) {
            if (err) return callback(err);
            if (!material) return callback({ custom: 'Material not found', status: 404 });

            material.type = update.type || material.type;
            material.title = update.title || material.title;
            material.subtitle = update.subtitle || material.subtitle;
            material.file = update.file || material.file;
            material.price = update.price || material.price;
            material.cover_img_url = update.cover_img_url || material.cover_img_url;
            material.published_date = update.published_date || material.published_date;
            material.display_date = update.published_date || material.published_date;
            material.language = update.language || material.language;
            material.ISBN = update.ISBN || material.ISBN;
            material.synopsis = update.synopsis || material.synopsis;
            material.review = update.review || material.review;
            material.tags = update.tags || material.tags;
            material.pages = update.pages || material.pages;
            material.edition = update.edition || material.edition;
            material.provider = update.provider || material.provider;

            material.save(callback);
        });
}

MaterialSchema.statics.updateRating = function (matId, ratingInfo, callback) {
    if (!mongoose.isValidObjectId(matId)) return callback({ custom: 'Invalid Id', status: 400 });

    const { isNew, oldRating, newRating } = ratingInfo;

    this.model(COLLECTION)
        .findOne({ _id: matId })
        .exec((err, material) => {
            if (err) return callback(err);
            if (!material) return callback({ custom: 'Material Not found', status: 404 });

            const ratingObj = material.toObject().rating;
            if (isNew) {
                let voteSum = (ratingObj.value * ratingObj.voters) + newRating;
                ratingObj.voters += 1;

                if (ratingObj.voters > 0) {
                    ratingObj.value = voteSum / ratingObj.voters;
                    ratingObj.groups[newRating - 1] += 1;
                }

            } else {
                let voteSum = (ratingObj.value * ratingObj.voters) - oldRating + newRating;
                if (ratingObj.voters > 0) {
                    ratingObj.value = voteSum / ratingObj.voters;
                    ratingObj.groups[oldRating - 1] -= 1;
                    ratingObj.groups[newRating - 1] += 1;
                }
            }
            material.rating = ratingObj;
            material.save((err, savedMat) => {
                if (err) return callback(err);
                return callback(null, savedMat.rating);
            });
        });
}

MaterialSchema.statics.search = function (filters, callback) {
    const startRow = isNaN(Number(filters.startRow)) ?
        0 : Math.abs(Number(filters.startRow));

    let size = isNaN(Number(filters.size)) ?
        LIMIT : Math.abs(Number(filters.size));

    const query = {};

    if (filters.search) {
        query.$text = { $search: filters.search, $caseSensitive: false };
    }
    if (filters.type) {
        const matTypes = [];
        for (eachType of filters.type.trim().toUpperCase().split('|')) {
            if (eachType) matTypes.push(eachType);
        }
        if (matTypes.length) query.type = { $in: matTypes };
    }

    if (filters.provider) {
        if (mongoose.isValidObjectId(filters.provider)) {
            query.provider = filters.provider;
        }
    }

    if (filters.tag) {
        if (mongoose.isValidObjectId(filters.tag)) {
            query.tags = filters.tag;
        }
    }

    query.deleted = false;
    const that = this;
    asyncLib.parallel({
        materials: function (asyncCallback) {
            that.model(COLLECTION)
                .find(query)
                .select('type title subtitle cover_img_url ISBN rating price edition created_at published_date')
                .sort({ created_at: -1 })
                .populate('provider', { legal_name: 1, display_name: 1 })
                .skip(startRow)
                .limit(size)
                .lean()
                .exec(asyncCallback);
        },
        total_materials: function (asyncCallback) {
            that.model(COLLECTION)
                .countDocuments(query)
                .exec(asyncCallback);
        }
    }, callback);
}

MaterialSchema.statics.minifiedSearch = function (filters, callback) {
    const startRow = isNaN(Number(filters.startRow)) ?
        0 : Math.abs(Number(filters.startRow));

    let size = isNaN(Number(filters.size)) ?
        LIMIT : Math.abs(Number(filters.size));

    const query = {};

    if (filters.search) {
        query.$text = { $search: filters.search, $caseSensitive: false };
    }

    if (filters.type) {
        const matTypes = [];
        for (eachType of filters.type.trim().toUpperCase().split('|')) {
            if (eachType) matTypes.push(eachType);
        }
        if (matTypes.length) query.type = { $in: matTypes };
    }

    if (filters.provider) {
        if (mongoose.isValidObjectId(filters.provider)) {
            query.provider = filters.provider;
        }
    }
    query.deleted = false;
    const that = this;
    asyncLib.parallel({
        materials: function (asyncCallback) {
            that.model(COLLECTION)
                .find(query)
                .select('type title subtitle cover_img_url ISBN created_at published_date')
                .skip(startRow)
                .limit(size)
                .lean()
                .exec(asyncCallback);
        },
        total_materials: function (asyncCallback) {
            that.model(COLLECTION)
                .countDocuments(query)
                .exec(asyncCallback);
        }
    }, callback);
}

MaterialSchema.statics.getMaterialsInIds = function (matIds, callback) {
    this.model(COLLECTION).find({ _id: { $in: matIds } }).exec(callback);
}

MaterialSchema.statics.getPopularMaterials = function (type, tag, callback) {
    this.model(COLLECTION).aggregate([
        {
            $match: {
                type: type,
                tags: {
                    $elemMatch: { $eq: mongoose.Types.ObjectId(tag) },
                },
            }
        },
        {
            $sort: {
                'rating.value': -1,
            }
        },
        {
            $limit: 10,
        }
    ]).exec(callback);
}

MaterialSchema.statics.countMaterialsForProviders = function (ids, callback) {
    this.model(COLLECTION).aggregate([
        { $match: { provider: { $in: ids } } },
        { $group: { _id: "$provider", count: { $sum: 1 } } }
    ]).exec(callback);
}

MaterialSchema.statics.countMaterials = function (callback) {
    this.model(COLLECTION).countDocuments({}).exec(callback);
}

MaterialSchema.statics.softDelete = function (oId, callback) {
    if (!mongoose.isValidObjectId(oId)) return callback({ custom: 'Invalid Id', status: 400 });

    this.model(COLLECTION)
        .updateOne({ _id: oId }, { $set: { deleted: true } })
        .exec((err, result) => {
            if (err) return callback(err);
            if (!result.nModified) return callback({ custom: 'Material not deleted', status: 400 });
            return callback(null, { message: 'Material successfully deleted' });
        });
}

MaterialSchema.statics.softDeleteWithProviderCheck = function (matId, providerId, callback) {
    if (!mongoose.isValidObjectId(matId) || !mongoose.isValidObjectId(providerId)) {
        return callback({ custom: 'Invalid Id', status: 400 });
    }

    this.model(COLLECTION)
        .updateOne({ _id: matId, provider: providerId }, { $set: { deleted: true } })
        .exec((err, result) => {
            if (err) return callback(err);
            if (!result.nModified) return callback({ custom: 'Material not deleted', status: 400 });
            return callback(null, { message: 'Material successfully deleted' });
        });
}

module.exports = mongoose.model(COLLECTION, MaterialSchema);
