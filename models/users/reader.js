const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const luxon = require('luxon');
const validator = require('../../helpers/validator');
const _ = require('lodash');

const COLLECTION = 'readers';
const SALT_FACTOR = 10;

const AuthSchema = require('./sub/auth');

const ReaderSchema = mongoose.Schema({
    firstname: { type: String, required: true, trim: true },
    lastname: { type: String, required: true, trim: true },
    gender: { type: String, required: true, enum: ['MALE', 'FEMALE'] },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    avatar_url: { type: String },

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

ReaderSchema.path('email').validate(validator.isEmail, 'Email invalid');

ReaderSchema.pre('save', function (next) {
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
ReaderSchema.methods.isPasswordCorrect = function (password) {
    return bcrypt.compareSync(password, this.auth.password);
}

ReaderSchema.methods.addSessionId = function (sessionId) {
    this.auth.tokens.push(sessionId);
}

// --------------------------------------------------------------------------
ReaderSchema.statics.getUser = function (oId, callback) {
    if (!_.isString(oId)) return callback('Invalid ObjectId', null);

    this.model(COLLECTION).findOne({ _id: oId }, callback);
}

ReaderSchema.statics.getUserByToken = function (token, callback) {
    if (!_.isString(token)) return callback('Invalid token', null);

    this.model(COLLECTION).findOne({ 'auth.tokens': token }, callback);
}


module.exports = mongoose.model(COLLECTION, ReaderSchema);
