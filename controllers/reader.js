const ReaderSchema = require('../models/users/reader');
const MaterialSchema = require('../models/material');
const TagSchema = require('../models/tag');
const InvoiceSchema = require('../models/invoice');
const uuid = require('uuid');
const _ = require('lodash');

const jwtCtrl = require('../auth/jwt');
const genericCtrl = require('./generic');
const helloCashCtrl = require('./payment/hellocash');
const validator = require('../helpers/validator');

const luxon = require('luxon');
const asyncLib = require('async');
const {
    success,
    failure,
    errorResponse,
    defaultHandler,
} = require('../helpers/response');

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
        key: jwtCtrl.getRandomBytes(32),
        iv: jwtCtrl.getRandomBytes(16),
        auth: {
            password: req.body.password,
            verify_email_hash: jwtCtrl.getRandomBytes(),
            verify_email_expire: inFifteenMinutes.valueOf(),
        },
        preferences: req.body.preferences,
    });

    const secret = process.env.ENCR_SECRET;
    const tokenInfo = { userId: user._id, role: 'reader' };
    jwtCtrl.createToken(tokenInfo, secret, (err, token) => {
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
    const required = ['email', 'password'];

    for (let key of required) {
        if (!req.body[key] || !_.isString(req.body[key])) {
            return failure(res, `${key} required`);
        }
    }

    const email = req.body.email.trim().toLowerCase();
    const password = req.body.password.trim();

    ReaderSchema.findOne({ email: email }, (err, user) => {
        if (err) return errorResponse(err, res);
        if (!user) return failure(res, 'Email or password incorrect');

        const passwordCorrect = user.isPasswordCorrect(password);
        if (!passwordCorrect) return failure(res, 'Email or password incorrect');

        const secret = process.env.ENCR_SECRET;
        const tokenInfo = { userId: user._id, role: 'reader' };
        jwtCtrl.createToken(tokenInfo, secret, (err, token) => {
            if (err) return errorResponse(err, res);

            user.addSessionId(token.sessionId);
            user.save((err, saved) => {
                if (err) return failure(res, 'Internal Error', 500);
                const user_info = saved.toObject();
                user_info.auth = undefined;
                user_info.__v = undefined;
                user_info.role = tokenInfo.role;
                const response = { token: token.token, user_info: user_info };
                success(res, response);
            });
        });
    });
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

ctrl.getMaterial = function (req, res, next) {
    MaterialSchema.getMaterial(req.params.id, defaultHandler(res));
}

ctrl.purchaseMaterial = function (req, res, next) {
    if (!validator.isPhoneNumber(req.body.phone)) {
        return failure(res, 'Invaild phone number');
    }

    MaterialSchema.getMaterial(req.params.id, (err, material) => {
        if (err) return errorResponse(err, res);
        if (!material) return failure(res, 'Material not found', 404);

        let expiresOn = luxon.DateTime.utc();
        expiresOn = expiresOn.plus(luxon.Duration.fromObject({ days: 1 }));
        expiresOn = expiresOn.toISO();

        const invoiceInfo = {
            amount: material.price.selling,
            description: `Invoice from Atrons for ${material.title}`,
            currency: "ETB",
            expires: expiresOn,
            tracenumber: uuid.v4(),
            notifyfrom: true,
            notifyto: true,
            from: req.body.phone.trim(),
        };

        helloCashCtrl.createInvoice(invoiceInfo, (err, invoice) => {
            if (err) {
                console.log(err);
                return failure(res, 'Could not create Invoice', 500);
            }

            const newInvoice = InvoiceSchema({
                reader: req.user._id,
                provider: material.provider._id,
                material: material._id,

                amount: material.price.selling,
                currency: invoice.currency,
                payer: invoice.from,
                receiver: invoice.to,
                date: invoice.date,
                expires: invoice.expires,

                invoice_id: invoice.id,
                invoice_code: invoice.code,
                tracenumber: invoice.tracenumber,
                status: invoice.status,

                invoice_dump: invoice,
            });

            newInvoice.save(defaultHandler(res));
        });
    });
}

ctrl.searchProviders = genericCtrl.searchProviders;

ctrl.getProvider = genericCtrl.getProvider;

ctrl.getAllTags = genericCtrl.getAllTags;

ctrl.initialData = function (req, res, next) {
    asyncLib.parallel({
        generes: function (callback) {
            TagSchema.getAllTags(callback);
        },
        popular: function (callback) {
            MaterialSchema.search(req.query, callback);
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

ctrl.uploadFile = genericCtrl.uploadFile;

module.exports = ctrl;