const mongoose = require('mongoose');
const luxon = require('luxon');
const asyncLib = require('async');
const _ = require('lodash');

const COLLECTION = 'materials';
const LIMIT = 10;

const FileSchema = mongoose.Schema({
    id: { type: mongoose.Types.ObjectId, required: true },
    size: { type: Number, required: true, min: 1 },
    mimetype: { type: String, required: true },
    contentType: { type: String, required: true },
    url: { type: String, required: true },
});

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

MaterialSchema.pre('save', function (next) {
    // do price validation in here.
    console.log('material schema pre save called');
    return next();
});

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

MaterialSchema.statics.search = function (filters, callback) {
    const page = isNaN(Number(filters.page)) ? 0 : Math.abs(Number(filters.page));

    const query = {};

    if (filters.search) {
        query.$text = { $search: filters.search, $caseSensitive: false };
    }
    if (filters.type) query.type = filters.type.trim().toUpperCase();

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
                .select('type title subtitle cover_img_url ISBN')
                .populate('provider', { legal_name: 1, display_name: 1 })
                .skip(page * LIMIT)
                .limit(LIMIT)
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
    const page = isNaN(Number(filters.page)) ? 0 : Math.abs(Number(filters.page));

    const query = {};

    if (filters.search) {
        query.$text = { $search: filters.search, $caseSensitive: false };
    }
    if (filters.type) query.type = filters.type.trim().toUpperCase();

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
                .select('type title subtitle cover_img_url ISBN')
                .skip(page * LIMIT)
                .limit(LIMIT)
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

MaterialSchema.statics.countMaterialsForProviders = function (ids, callback) {
    this.model(COLLECTION).aggregate([
        { $match: { provider: { $in: ids } } },
        { $group: { _id: "$provider", count: { $sum: 1 } } }
    ]).exec(callback);
}

MaterialSchema.statics.softDelete = function (oId, callback) {
    if (!mongoose.isValidObjectId(oId)) return callback({ custom: 'Invalid Id', status: 400 });

    this.model(COLLECTION)
        .updateOne({ _id: oId }, { $set: { deleted: true } })
        .exec(callback);
}

module.exports = mongoose.model(COLLECTION, MaterialSchema);
