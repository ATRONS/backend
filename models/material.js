const mongoose = require('mongoose');
const _ = require('lodash');

const COLLECTION = 'materials';

const BookSchema = mongoose.Schema({
    ISBN: { type: String, required: true, trim: true },
    synopsis: { type: String, required: true, trim: true },
    review: String,
    generes: { type: [mongoose.Types.ObjectId], required: true },
});

const MagazineSchema = mongoose.Schema({
    founded_date: { type: Date, required: true },
});

const NewspaperSchema = mongoose.Schema({
    founded_date: { type: Date, required: true },
});

const MaterialSchema = mongoose.Schema({
    title: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ['BOOK', 'MAGAZINE', 'NEWSPAPER'] },
    file_id: { type: mongoose.Types.ObjectId, required: true },
    cover_img_url: { type: String, required: true },
    published_date: { type: Date, required: true },

    pages: { type: Number, required: true, min: 1 },
    edition: { type: Number, required: true, min: 1 },
    owners: { type: [mongoose.Types.ObjectId], required: true },

    price: {
        free: { type: Boolean, default: false },
        selling: { type: Number, default: 0, min: 0 },
        rent: {
            value: { type: Number, default: 0, min: 0 },
            per: { type: Number, default: 1 },
        }
    },

    rating: {
        value: { type: Number, default: 0 },
        voters: { type: Number, default: 0 },
        groups: { type: [Number], default: [0, 0, 0, 0, 0] },
    }
}, { timeStamp: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const autoPopulateRole = function (next) {
    this.populate('owners', 'firstname lastname _id');
    next();
}

MaterialSchema.pre('findOne', autoPopulateRole).pre('find', autoPopulateRole);

MaterialSchema.statics.getMaterial = function (oId, callback) {
    if (_.isUndefined(oId)) return callback('Invalid ObjectId', null);

    this.model(COLLECTION).findOne({ _id: oId }, callback);
}

MaterialSchema.statics.getByType = function (type, page, callback) {
    if (!_.isString(type)) return callback('Invalid type', null);
    if (!_.isFinite(page)) page = 0;

    type = type.trim().toUpperCase();
    const limit = 10;

    this.model(COLLECTION)
        .find({ type })
        .limit(limit)
        .exec(callback);
}

module.exports = mongoose.model(COLLECTION, MaterialSchema);
