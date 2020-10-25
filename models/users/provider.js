const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const luxon = require('luxon');
const validator = require('../../helpers/validator');
const _ = require('lodash');

const COLLECTION = 'providers';
const SALT_FACTOR = 10;

const AuthSchema = require('./sub/auth');

const AuthorSchema = mongoose.Schema({
    dob: { type: Date, required: true },
    active_from: {
        type: Date,
        default: luxon.DateTime.utc().valueOf(),
    },
}, { _id: false });

const CompanySchema = mongoose.Schema({
    hq_address: { type: String, required: true, trim: true },
    founded_date: { type: Date, required: true },
}, { _id: false });

const ProviderSchema = mongoose.Schema({
    legal_name: { type: String, required: true, trim: true },
    display_name: { type: String, required: true, trim: true, },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    avatar_url: { type: String, required: true },

    is_company: { type: Boolean, required: true },

    company_info: {
        type: CompanySchema,
        required: function () { return this.is_company; },
    },

    author_info: {
        type: AuthorSchema,
        required: function () { return !this.is_company; }
    },

    provides: {
        type: String,
        enum: ['BOOK', 'MAGAZINE', 'NEWSPAPER'],
        required: true
    },

    about: { type: String, required: true },

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

    if (user.is_company) user.author_info = undefined;
    else user.company_info = undefined;

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
    return bcrypt.compareSync(password, this.auth.password);
}

ProviderSchema.methods.addSessionId = function (sessionId) {
    this.auth.tokens.push(sessionId);
}

// --------------------------------------------------------------------------

module.exports = mongoose.model(COLLECTION, ProviderSchema);
