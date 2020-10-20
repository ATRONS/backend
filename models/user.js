const mongoose = require('mongoose');
const validator = require('../helpers/validator');
const _ = require('lodash');

const COLLECTION = 'users';

const UserSchema = mongoose.Schema({
    firstname: { type: String, required: true, trim: true },
    lastname: { type: String, required: true, trim: true },
    gender: { type: String, required: true, enum: ['MALE', 'FEMALE'] },
    email: { type: String, required: true, trim: true, lowercase: true },
    avatar_url: { type: String },

    role: { type: mongoose.Schema.Types.ObjectId, ref: 'roles', required: true },
    password: { type: String, required: true, select: false },
    tokens: { type: [String], select: false },

    verify_email_hash: { type: String, select: false },
    verify_email_expire: { type: String, select: false },
    reset_pass_hash: { type: String, select: false },
    reset_pass_expire: { type: Date, select: false },
    otp_key: { type: String, select: false },
    otp_expire: { type: Number, select: false },

    email_verified: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    deleted: { type: Boolean, default: false },
}, { timeStamp: { createdAt: 'created_at', updatedAt: 'updated_at' } });

UserSchema.path('email').validate(validator.isEmail, 'Email invalid');

const autoPopulateRole = function (next) {
    this.populate('role', 'name description _id');
    next();
}

UserSchema.pre('findOne', autoPopulateRole).pre('find', autoPopulateRole);

// --------------------------------------------------------------------------
UserSchema.statics.getUserByVerifyEmailHash = function (hash, callback) {
    if (!_.isString(hash)) return callback('Invalid verify hash', null);

    this.model(COLLECTION).findOne({ verify_email_hash: hash }, callback);
}

UserSchema.statics.getUser = function (oId, callback) {
    if (!_.isString(oId)) return callback('Invalid ObjectId', null);

    this.model(COLLECTION).findOne({ _id: oId }, callback);
}

UserSchema.statics.getUserByToken = function (token, callback) {
    if (!_.isString(token)) return callback('Invalid token', null);

    this.model(COLLECTION).findOne({ tokens: token }, callback);
}


module.exports = mongoose.model(COLLECTION, UserSchema);
