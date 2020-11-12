const mongoose = require('mongoose');

const COLLECTION = 'tags';

const LangSchema = mongoose.Schema({
    lang: { type: String, required: true, trim: true, lowercase: true },
    value: { type: String, required: true, trim: true, lowercase: true },
}, { _id: false });

const TagSchema = mongoose.Schema({
    name: { type: String, required: true, lowercase: true, trim: true, unique: true },
    options: { type: [LangSchema], required: true },
    description: String,
});

TagSchema.statics.getAllTags = function (callback) {
    this.model(COLLECTION)
        .find({})
        .lean()
        .exec(callback);
}

module.exports = mongoose.model(COLLECTION, TagSchema);
