const mongoose = require('mongoose');

const COLLECTION = 'generes';

const GenereSchema = mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    description: String,
});

module.exports = mongoose.model(COLLECTION, GenereSchema);
