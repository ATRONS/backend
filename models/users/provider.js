const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const luxon = require('luxon');
const validator = require('../../helpers/validator');
const _ = require('lodash');

const COLLECTION = 'providers';
const SALT_FACTOR = 10;

const AuthSchema = require('./sub/auth');

const ProviderSchema = mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    avatar_url: { type: String, required: true },
    // is_company: { type: Boolean, required: true },

    auth: { type: AuthSchema, required: true },

    preferences: {
        language: { type: String, required: true, enum: ['ENGLISH', 'AMHARIC'] },
    },
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

    if (!user.isModified('auth.password')) return next();

    bcrypt.genSalt(SALT_FACTOR, function (err, salt) {
        if (err) return next(err);

        bcrypt.hash(user.auth.password, salt, function (err, hash) {
            if (err) return next(err);

            user.auth.password = hash;
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
