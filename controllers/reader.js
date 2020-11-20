const ReaderSchema = require('../models/users/reader');
const MaterialSchema = require('../models/material');
const TagSchema = require('../models/tag');
const TransactionSchema = require('../models/transaction');
const jwtCtrl = require('../auth/jwt');
const genericCtrl = require('./generic');
const luxon = require('luxon');
const asyncLib = require('async');
const emailer = require('../emailer/emailer');
const _ = require('lodash');
const {
    success,
    failure,
    errorResponse,
} = require('../helpers/response');
const tag = require('../models/tag');
const { result } = require('lodash');
const response = require('../helpers/response');

const logger = global.logger;

const ctrl = {};

// ----------------------- account related --------------------------
ctrl.signup = function (req, res, next) {
    const now = luxon.DateTime.utc();
    const inFifteenMinutes = now.plus(luxon.Duration.fromObject({ minutes: 15 }));

    const user = new ReaderSchema({
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email,
        gender: req.body.gender,
        auth: {
            password: req.body.password,
            verify_email_hash: jwtCtrl.getRandomBytes(),
            verify_email_expire: inFifteenMinutes.valueOf(),
        },
        preferences: req.body.preferences,
    });

    const secret = process.env.ENCR_SECRET_READER;
    jwtCtrl.createToken({ userId: user._id }, secret, (err, token) => {
        if (err) return errorResponse(err, res);

        user.addSessionId(token.sessionId);
        user.save((err, savedUser) => {
            if (err) return errorResponse(err, res);

            savedUser.auth = undefined;
            const response = {
                user_info: savedUser,
                token: token.token,
            };

            return success(res, response);
        });
    });
}

ctrl.login = function (req, res, next) {
    const secret = process.env.ENCR_SECRET_READER;
    genericCtrl.login(req, res, next, secret, ReaderSchema);
}

ctrl.logout = genericCtrl.logout;

ctrl.forgotPassword = function (req, res, next) { res.end('reader forgot password') }

ctrl.changePassword = function (req, res, next) { res.end('reader change password'); }

ctrl.updateProfile = function (req, res, next) { res.end('reader update profile') }

ctrl.deleteAccount = function (req, res, next) { res.end('reader delete account'); }

ctrl.getWishList = function (req, res, next) { res.end('reader get wishlist'); }

ctrl.addToWishlist = function (req, res, next) { res.end('reader add to wishlist'); }

ctrl.removeFromWishlist = function (req, res, next) { res.end('reader remove from wishlist'); }

ctrl.getSuggestions = function (req, res, next) { res.end('reader get suggestions'); }

ctrl.getOwnedMaterials = function (req, res, next) { res.end('reader get owned materials'); }

ctrl.getFeaturedMaterials = function (req, res, next) { res.end('reader get featured materials'); }

ctrl.searchMaterials = genericCtrl.searchMaterials;

ctrl.getMaterial = genericCtrl.getMaterial;

ctrl.purchaseMaterial = function (req, res, next) {
    MaterialSchema.getMaterial(req.params.id, (err, material) => {
        if (err) return errorResponse(err, res);
        if (!material) return failure(res, 'Material not found', 404);

        const transaction = TransactionSchema({
            provider: material.provider._id,
            material: material._id,
            amount: material.price.selling,
        });

        transaction.save((err, saved) => {
            if (err) return errorResponse(err, res);
            return success(res, saved);
        });
    });
}

ctrl.searchProviders = genericCtrl.searchProviders;

ctrl.getProvider = genericCtrl.getProvider;

ctrl.getAllTags = genericCtrl.getAllTags;

ctrl.initialData = function (req, res, next) {
    asyncLib.parallel({
        generes: function (callback) {
            TagSchema.getAllTags(function (err, tags) {
                if (err) return callback(err, null);
                return callback(null, tags);
            });
        },
        popular: function (callback) {
            MaterialSchema.search(req.query, 0, function (err, materials) {
                if (err) return callback(err, null);
                return callback(null, materials);
            });
        }
    }, function (err, results) {
        if (err) return errorResponse(err, res);

        const generes = results.generes;
        const popular = {};

        generes.forEach((genere, index) => {
            if (index > 3) return;
            popular[genere._id.toHexString()] = results.popular;
        });

        const response = { generes, popular };
        return success(res, response);
    });
}

ctrl.getRepMaterials = function (req, res, next) {
    MaterialSchema.getMaterialsInEachTag(null, function (err, result) {
        if (err) return errorResponse(err, res);
        return success(res, result);
    });
}

ctrl.uploadFile = genericCtrl.uploadFile;

module.exports = ctrl;