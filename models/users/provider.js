const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const luxon = require('luxon');
const validator = require('../../helpers/validator');
const _ = require('lodash');

const COLLECTION = 'providers';
const SALT_FACTOR = 10;

const ProviderSchema = mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    founded_date: Date,
    avatar_url: String,

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

ProviderSchema.path('email').validate(validator.isEmail, 'Email invalid');

ProviderSchema.pre('save', function (next) {
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
ProviderSchema.methods.isPasswordCorrect = function (password) {
    return bcrypt.compareSync(password, this.password);
}

ProviderSchema.methods.addSessionId = function (sessionId) {
    this.tokens.push(sessionId);
}

// --------------------------------------------------------------------------

module.exports = mongoose.model(COLLECTION, ProviderSchema);
