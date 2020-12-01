const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const luxon = require('luxon');
const validator = require('../../helpers/validator');
const _ = require('lodash');

const COLLECTION = 'admins';
const SALT_FACTOR = 10;

const AuthSchema = require('./sub/auth');

const AdminSchema = mongoose.Schema({
    firstname: { type: String, required: true, trim: true },
    lastname: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    avatar_url: { type: String },

    auth: { type: AuthSchema, required: true },
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        currentTime: () => luxon.DateTime.utc().valueOf()
    }
});

AdminSchema.path('email').validate(validator.isEmail, 'Email invalid');

AdminSchema.pre('save', function (next) {
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
AdminSchema.methods.isPasswordCorrect = function (password) {
    return bcrypt.compareSync(password, this.auth.password);
}

AdminSchema.methods.addSessionId = function (sessionId) {
    this.auth.tokens.push(sessionId);
}

// --------------------------------------------------------------------------
AdminSchema.statics.getUserByVerifyEmailHash = function (hash, callback) {
    if (!_.isString(hash)) return callback('Invalid verify hash', null);

    this.model(COLLECTION).findOne({ verify_email_hash: hash }, callback);
}

AdminSchema.statics.getUser = function (oId, callback) {
    if (!_.isString(oId)) return callback('Invalid ObjectId', null);

    this.model(COLLECTION).findOne({ _id: oId }, callback);
}

AdminSchema.statics.getUserByToken = function (token, callback) {
    if (!_.isString(token)) return callback('Invalid token', null);

    this.model(COLLECTION).findOne({ 'auth.tokens': token }, callback);
}


module.exports = mongoose.model(COLLECTION, AdminSchema);
