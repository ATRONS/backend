const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const luxon = require('luxon');
const validator = require('../../helpers/validator');
const asyncLib = require('async');
const _ = require('lodash');

const COLLECTION = 'providers';
const SALT_FACTOR = 10;
const LIMIT = 10;

const AuthSchema = require('./sub/auth');
const { filter } = require('lodash');

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
    display_name: { type: String, required: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    avatar_url: { type: String },

    is_company: { type: Boolean, required: true, },

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
        sparse: true,
    },

    about: { type: String, default: '' },

    auth: { type: AuthSchema, required: true },

    preferences: {
        language: { type: String, enum: ['ENGLISH', 'AMHARIC'] },
    },
}, {
    timestamps: {
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
ProviderSchema.statics.getProvider = function (oId, callback) {
    if (!mongoose.isValidObjectId(oId)) return callback({ custom: 'Invalid Id', status: 400 });

    this.model(COLLECTION)
        .findOne({ _id: oId })
        .select('-auth -__v')
        .lean()
        .exec(callback);
}

ProviderSchema.statics.search = function (filters, callback) {
    const page = isNaN(Number(filters.page)) ? 0 : Math.abs(Number(filters.page));
    const query = {};
    if (filters.display_name) {
        query.display_name = RegExp(`^${filters.display_name}`, 'i');
    }
    if (filters.type) {
        const type = _.toLower(_.trim(filters.type));
        if (type !== 'author' && type !== 'company') {
            return callback({ custom: 'unknown provider type', status: 400 });
        }
        query.is_company = type == 'company';
    }
    query['auth.deleted'] = false;

    const that = this;
    asyncLib.parallel({
        providers: function (asyncCallback) {
            that.model(COLLECTION)
                .find(query)
                .select('display_name avatar_url')
                .skip(page * LIMIT)
                .limit(LIMIT)
                .lean()
                .exec((err, providers) => {
                    if (err) return asyncCallback(err);
                    return asyncCallback(null, providers);
                });
        },
        total_providers: function (asyncCallback) {
            that.model(COLLECTION)
                .countDocuments(query)
                .exec((err, count) => {
                    if (err) return asyncCallback(err);
                    return asyncCallback(null, count);
                });
        }
    }, function (err, results) {
        if (err) return callback(err);
        return callback(null, results);
    });
}

ProviderSchema.statics.updateProvider = function (oId, update, callback) {
    if (!mongoose.isValidObjectId(oId)) return callback({ custom: 'Invalid id', status: 400 });

    this.model(COLLECTION).
        findOne({ _id: oId }).
        select('-auth -__v').
        exec(function (err, provider) {
            if (err) return callback(err);
            if (!provider) return callback({ custom: 'Provider not found', status: 404 });

            provider.display_name = update.display_name || provider.display_name;
            provider.phone = update.phone || provider.phone;
            provider.avatar_url = update.avatar_url || provider.avatar_url;
            provider.author_info = update.author_info || provider.author_info;
            provider.company_info = update.company_info || provider.company_info;
            provider.about = update.about || provider.about;
            provider.preferences = update.preferences || provider.preferences;

            provider.save(callback);
        });
}

ProviderSchema.statics.softDelete = function (id, callback) {
    if (!mongoose.isValidObjectId(oId)) return callback({ custom: 'Invalid Id', status: 400 });

    this.model(COLLECTION).
        updateOne({ _id: id }, { $set: { 'auth.deleted': true } }).
        exec(callback);
}

module.exports = mongoose.model(COLLECTION, ProviderSchema);
