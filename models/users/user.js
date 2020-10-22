const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const luxon = require('luxon');
const validator = require('../../helpers/validator');
const _ = require('lodash');

const COLLECTION = 'users';
const SALT_FACTOR = 10;

const UserSchema = mongoose.Schema({
    firstname: { type: String, required: true, trim: true },
    lastname: { type: String, required: true, trim: true },
    gender: { type: String, required: true, enum: ['MALE', 'FEMALE'] },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    avatar_url: { type: String },

    role: { type: mongoose.Schema.Types.ObjectId, ref: 'roles', required: true },
    password: { type: String, required: true, min: 8, select: false },
    tokens: { type: [String], select: false },

    verify_email_hash: { type: String, select: false },
    verify_email_expire: { type: String, select: false },
    reset_pass_hash: { type: String, select: false },
    reset_pass_expire: { type: Date, select: false },
    otp_key: { type: String, select: false },
    otp_expire: { type: Number, select: false },

    verified: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    deleted: { type: Boolean, default: false },
}, {
    timeStamp: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        currentTime: () => luxon.DateTime.utc().valueOf()
    }
});

UserSchema.path('email').validate(validator.isEmail, 'Email invalid');

const autoPopulateRole = function (next) {
    this.populate('role', 'name description _id');
    next();
}

UserSchema.pre('findOne', autoPopulateRole).pre('find', autoPopulateRole);

UserSchema.pre('save', function (next) {
    const user = this;

    if (!user.isModified('password')) return next();

    bcrypt.genSalt(SALT_FACTOR, function (err, salt) {
        if (err) return next(err);

        bcrypt.hash(user.password, salt, function (err, hash) {
            if (err) return next(err);

            user.password = hash;
            return next();
        });
    });
});

// --------------------------------------------------------------------------
UserSchema.methods.isPasswordCorrect = function (password) {
    return bcrypt.compareSync(password, this.password);
}

UserSchema.methods.addSessionId = function (sessionId) {
    this.tokens.push(sessionId);
}

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
