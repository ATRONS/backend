const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const luxon = require('luxon');
const validator = require('../../helpers/validator');
const convert = require('../../helpers/convert');
const asyncLib = require('async');
const _ = require('lodash');

const COLLECTION = 'providers';
const SALT_FACTOR = 10;
const LIMIT = 10;

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
    // first creation phase fields
    legal_name: { type: String, required: true, trim: true, index: true },
    display_name: { type: String, required: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    is_company: { type: Boolean, required: true, },
    auth: { type: AuthSchema, required: true },

    // provider populated fields
    avatar_url: { type: String, required: function () { return this.auth.verified; } },
    company_info: {
        type: CompanySchema,
        required: function () { return this.auth.verified && this.is_company; }
    },
    author_info: {
        type: AuthorSchema,
        required: function () { return this.auth.verified && !this.is_company; }
    },
    provides: {
        type: String,
        enum: ['BOOK', 'MAGAZINE', 'NEWSPAPER'],
        index: true,
        required: function () { return this.auth.verified }
    },

    about: {
        type: String,
        default: '',
        required: function () { return this.auth.verified; }
    },

    // defaults
    balance: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: false },
    preferences: {
        language: { type: String, enum: ['ENGLISH', 'AMHARIC'], default: 'ENGLISH' },
    },
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        currentTime: () => luxon.DateTime.utc().valueOf()
    }
});

ProviderSchema.index({ created_at: 1 });

ProviderSchema.path('email').validate(validator.isEmail, 'Email invalid');
ProviderSchema.path('phone').validate(validator.isPhoneNumber, 'Phone invalid');

ProviderSchema.pre('save', function (next) {
    const user = this;

    if (user.is_company) user.author_info = undefined;
    else user.company_info = undefined;
    if (user.isModified('phone')) {
        user.phone = convert.fromLocalToInternational(user.phone);
    }
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

ProviderSchema.methods.activationUpdate = function (additionalInfo, callback) {
    this.active = true;
    this.auth.verified = true;
    this.auth.password = additionalInfo.password;
    this.avatar_url = additionalInfo.avatar_url;
    this.company_info = additionalInfo.company_info;
    this.author_info = additionalInfo.author_info;
    this.provides = additionalInfo.provides;
    this.preferences = additionalInfo.preferences;
    this.about = additionalInfo.about;
    this.save(callback);
}

ProviderSchema.methods.updateProfile = function (update, callback) {
    this.display_name = update.display_name || this.display_name;
    this.phone = update.phone || this.phone;
    this.avatar_url = update.avatar_url || this.avatar_url;
    this.author_info = update.author_info || this.author_info;
    this.company_info = update.company_info || this.company_info;
    this.about = update.about || this.about;
    this.preferences = update.preferences || this.preferences;
    this.save(callback);
}

// --------------------------------------------------------------------------
ProviderSchema.statics.createProvider = function (providerInfo, callback) {
    providerInfo.password = undefined;
    providerInfo.active = false;
    providerInfo.balance = 0;

    this.model(COLLECTION).create(providerInfo, callback);
}

ProviderSchema.statics.getProvider = function (oId, callback) {
    if (!mongoose.isValidObjectId(oId)) return callback({ custom: 'Invalid Id', status: 400 });

    this.model(COLLECTION)
        .findOne({ _id: oId })
        .select('-auth -__v')
        .lean()
        .exec(callback);
}

ProviderSchema.statics.search = function (filters, callback) {
    const startRow = isNaN(Number(filters.startRow)) ?
        0 : Math.abs(Number(filters.startRow));

    let size = isNaN(Number(filters.size)) ?
        LIMIT : Math.abs(Number(filters.size));

    const query = {};

    if (_.isString(filters.legal_name) && filters.legal_name.trim()) {
        query.legal_name = RegExp(`^${filters.legal_name}`, 'i');
    }

    if (_.isString(filters.type) && filters.type.trim()) {
        const type = _.toLower(_.trim(filters.type));
        if (type !== 'author' && type !== 'company') {
            return callback({ custom: 'unknown provider type', status: 400 });
        }
        query.is_company = type == 'company';
    }

    if (_.isString(filters.provides) && filters.provides.trim()) {
        query.provides = _.toUpper(filters.provides).trim();
    }

    if (_.isString(filters.active) && filters.active.trim()) {
        query.active = true;
    }

    query['auth.deleted'] = false;

    const that = this;
    asyncLib.parallel({
        providers: function (asyncCallback) {
            that.model(COLLECTION)
                .find(query)
                .select('display_name legal_name avatar_url about')
                .sort({ created_at: 1 })
                .skip(startRow)
                .limit(size)
                .lean()
                .exec(asyncCallback);
        },
        total_providers: function (asyncCallback) {
            that.model(COLLECTION)
                .countDocuments(query)
                .exec(asyncCallback);
        }
    }, callback);
}

ProviderSchema.statics.softDelete = function (id, callback) {
    if (!mongoose.isValidObjectId(id)) return callback({ custom: 'Invalid Id', status: 400 });

    this.model(COLLECTION).
        updateOne({ _id: id, 'auth.deleted': false }, { $set: { 'auth.deleted': true } }).
        exec((err, result) => {
            if (err) return callback(err);
            if (!result.nModified) return callback({ custom: 'Provider not deleted', status: 400 });
            return callback(null, { message: 'Provider successfully deleted' });
        });
}

ProviderSchema.statics.addBalance = function (oId, amount, callback) {
    if (!mongoose.isValidObjectId(oId)) return callback({ custom: 'Invalid Id', status: 400 });
    if (!_.isFinite(Number(amount))) return callback({ custom: 'Invalid amount', status: 400 });
    if (Number(amount) < 0) return callback({ custom: 'Negative amount not allowed', status: 400 });

    this.model(COLLECTION).updateOne({ _id: oId }, { $inc: { balance: Number(amount) } }).exec(callback);
}

ProviderSchema.statics.deductBalance = function (oId, amount, callback) {
    if (!mongoose.isValidObjectId(oId)) return callback({ custom: 'Invalid Id', status: 400 });
    if (!_.isFinite(Number(amount))) return callback({ custom: 'Invalid amount', status: 400 });
    if (Number(amount) < 0) return callback({ custom: 'Negative amount not allowed', status: 400 });

    this.model(COLLECTION).updateOne({ _id: oId }, { $inc: { balance: -Number(amount) } }).exec(callback);
}

ProviderSchema.statics.countProviders = function (callback) {
    this.model(COLLECTION).countDocuments({}).exec(callback);
}

module.exports = mongoose.model(COLLECTION, ProviderSchema);
