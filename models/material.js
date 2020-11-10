const mongoose = require('mongoose');
const luxon = require('luxon');
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
    title: { type: String, required: true, trim: true, },
    subtitle: { type: String, trim: true },

    file: { type: FileSchema, required: true },
    cover_img_url: { type: String, required: true },

    published_date: { type: Date, required: true },
    display_date: { type: String, required: true, trim: true },

    // Book related fields
    ISBN: { type: String, trim: true, sparse: true },
    synopsis: {
        type: String,
        trim: true,
        required: function () { return this.type === 'BOOK' }
    },
    review: { type: String, trim: true },
    tags: { type: [String], default: [], index: true },

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
    timeStamp: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        currentTime: () => luxon.DateTime.utc().valueOf()
    }
});

MaterialSchema.index({ title: 'text', subtitle: 'text' });

MaterialSchema.pre('save', function (next) {
    // do price validation in here.
    console.log('material schema pre save called');
    return next();
});

MaterialSchema.statics.getMaterial = function (oId, callback) {
    if (_.isUndefined(oId)) return callback('Invalid ObjectId', null);

    this.model(COLLECTION)
        .findOne({ _id: oId })
        .lean()
        .exec(callback);
}

MaterialSchema.statics.getByType = function (type, page, callback) {
    if (!_.isString(type)) return callback('Invalid type', null);
    if (!_.isFinite(page)) page = 0;

    type = type.trim().toUpperCase();

    this.model(COLLECTION)
        .find({ type })
        .skip(page * LIMIT)
        .limit(LIMIT)
        .lean()
        .exec(callback);
}

MaterialSchema.statics.getByTag = function (tag, page, callback) {
    if (!_.isString(tag)) return callback('Invalid tag', null);
    if (!_.isFinite(page)) page = 0;

    this.model(COLLECTION)
        .find({ tags: tag })
        .skip(page * LIMIT)
        .limit(LIMIT)
        .lean()
        .exec(callback);
}

MaterialSchema.statics.search = function (text, page, callback) {
    if (!_.isString(text)) return callback('Invalid text', null);
    if (!_.isFinite(page)) page = 0;

    this.model(COLLECTION)
        .find({
            $text: {
                $search: text,
                $caseSensitive: false,
            }
        })
        .skip(page * LIMIT)
        .limit(LIMIT)
        .lean()
        .exec(callback);
}

module.exports = mongoose.model(COLLECTION, MaterialSchema);
