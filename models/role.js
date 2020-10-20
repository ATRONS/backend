const mongoose = require('mongoose');

const COLLECTION = 'roles';

const RoleSchema = mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    description: String,
    grants: [{ type: String, required: true }]
});

module.exports = mongoose.model(COLLECTION, RoleSchema);
