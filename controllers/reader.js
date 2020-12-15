const ReaderSchema = require('../models/users/reader');
const ProviderSchema = require('../models/users/provider');
const MaterialSchema = require('../models/material');
const TagSchema = require('../models/tag');
const RatingSchema = require('../models/rating');
const InvoiceSchema = require('../models/invoice');
const TransactionSchema = require('../models/transaction');
const WishlistSchema = require('../models/wishlist');
const convert = require('../helpers/convert');

const uuid = require('uuid');
const _ = require('lodash');

const jwtCtrl = require('../auth/jwt');
const genericCtrl = require('./generic');
const emailer = require('../emailer/emailer');
const helloCashCtrl = require('./payment/hellocash');
const validator = require('../helpers/validator');
const settings = require('../defaults/settings');
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
            otp_key: jwtCtrl.getRandom6DigitsString(),
            otp_expire: inFifteenMinutes.valueOf(),
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
            emailer.sendVerifyEmail(savedUser.email, savedUser.auth.otp_key);

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
                if (err) {
                    logger.error(err);
                    return failure(res, 'Internal Error', 500);
                }
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

ctrl.verifyEmail = function (req, res, next) {
    const otp_key = req.body.otp;
    if (!_.isString(otp_key)) return failure(res, 'otp key required');
    const now = luxon.DateTime.utc().valueOf();

    if (req.user.auth.otp_key !== otp_key.trim()) {
        return failure(res, 'Invalid otp key');
    }

    if (now > req.user.auth.otp_expire) return failure(res, 'OTP expired');

    req.user.auth.verified = true;
    req.user.save((err, savedUser) => {
        if (err) return errorResponse(err, res);
        return success(res, { message: 'Email validated' });
    })
}

ctrl.resendVerification = function (req, res, next) {
    const now = luxon.DateTime.utc();
    const inFifteenMinutes = now.plus(luxon.Duration.fromObject({ minutes: 15 }));

    req.user.auth.otp_key = jwtCtrl.getRandom6DigitsString();
    req.user.auth.otp_expire = inFifteenMinutes.valueOf();

    req.user.save((err, savedUser) => {
        if (err) return errorResponse(err, res);
        emailer.sendVerifyEmail(savedUser.email, savedUser.auth.otp_key);
        return success(res, { message: 'Verification code sent' });
    })
}

ctrl.logout = genericCtrl.logout;

ctrl.forgotPassword = function (req, res, next) { res.end('reader forgot password') }

ctrl.changePassword = function (req, res, next) { res.end('reader change password'); }

ctrl.updateProfile = function (req, res, next) { res.end('reader update profile') }

ctrl.deleteAccount = function (req, res, next) { res.end('reader delete account'); }

ctrl.getWishList = function (req, res, next) {
    WishlistSchema.getWishListByUser(req.user._id, (err, wishlist) => {
        if (err) return errorResponse(err, res);
        const materials = wishlist.map((each) => each.material).filter((each) => each !== null);
        return success(res, materials);
    });
}

ctrl.addToWishlist = function (req, res, next) {
    const wishlistInfo = {
        reader: req.user._id,
        material: req.body.material,
    };
    WishlistSchema.createWishlist(wishlistInfo, defaultHandler(res));
}

ctrl.removeFromWishlist = function (req, res, next) {
    WishlistSchema.removeFromWishlist(req.user._id, req.params.id, defaultHandler(res));
}

ctrl.getSuggestions = function (req, res, next) { res.end('reader get suggestions'); }

ctrl.getOwnedMaterials = function (req, res, next) {
    TransactionSchema.getReaderOwnedMaterials(req.user._id, (err, transactions) => {
        if (err) return errorResponse(err, res);
        const materials = transactions.map((each) => {
            each.material.tags = [];
            return each.material;
        });
        return success(res, materials);
    });
}

ctrl.getFeaturedMaterials = function (req, res, next) { res.end('reader get featured materials'); }

ctrl.searchMaterials = genericCtrl.searchMaterials;

ctrl.getMaterial = function (req, res, next) {
    asyncLib.parallel({
        material: function (callback) {
            MaterialSchema.getMaterial(req.params.id, callback);
        },
        readerRating: function (callback) {
            RatingSchema.getReadersCommentOnMaterial(req.user._id, req.params.id, callback);
        },
        ratings: function (callback) {
            RatingSchema.getRatingsByMaterial(req.params.id, req.query, callback);
        },
        owned: function (callback) {
            TransactionSchema.readerOwnsMaterial(req.user._id, req.params.id, callback);
        },
        favorite: function (callback) {
            WishlistSchema.getWishListByUserAndMaterial(req.user._id, req.params.id, callback);
        }
    }, function (err, results) {
        if (err) return errorResponse(err, res);

        const query = { provider: results.material.provider._id };
        MaterialSchema.search(query, (err, moreFromProvider) => {
            if (err) return errorResponse(err, res);
            const response = results.material;
            response.more_from_provider = moreFromProvider;
            response.more_from_provider.materials = moreFromProvider.materials
                .filter((each) => each._id.toHexString() !== req.params.id);;
            response.material_ratings = results.ratings;
            response.readers_last_rating = results.readerRating || { value: 0, description: '' };
            response.owned = results.owned;
            response.favorite = results.favorite !== null;
            success(res, response);
        });
    });
}

ctrl.purchaseMaterial = function (req, res, next) {
    if (!validator.isPhoneNumber(req.body.phone)) {
        return failure(res, 'Invaild phone number');
    }

    TransactionSchema.readerOwnsMaterial(req.user._id, req.params.id, (err, owned) => {
        if (err) return errorResponse(err, res);
        if (owned) return failure(res, { message: 'You already own this material' });

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
                from: convert.fromLocalToInternational(req.body.phone),
            };

            helloCashCtrl.createInvoice(invoiceInfo, (err, invoice) => {
                if (err) {
                    logger.error(err);
                    return failure(res, 'Could not create Invoice', 500);
                }

                InvoiceSchema.createInvoice({
                    kind: settings.INVOICE_TYPES.PURCHASE,
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
                    tracenumber: invoice.tracenumber,
                    status: invoice.status,

                    invoice_dump: invoice,
                }, (err, savedInvoice) => {
                    if (err) return errorResponse(err, res);
                    return success(res, { code: invoice.code });
                });
            });
        });
    });
}

ctrl.rateMaterial = function (req, res, next) {
    asyncLib.waterfall([
        function (callback) {
            TransactionSchema.readerOwnsMaterial(req.user._id, req.params.id, callback);
        },
        function (readerOwnsMaterial, callback) {
            if (!readerOwnsMaterial) {
                return callback({ custom: 'You do not own this material', status: 400 });
            }
            RatingSchema.updateRating(req.params.id, req.user._id, req.body, callback);
        },
        function (ratinginfo, callback) {
            MaterialSchema.updateRating(req.params.id, ratinginfo, callback);
        }
    ], defaultHandler(res));
}

ctrl.getMaterialRatings = function (req, res, next) {
    asyncLib.parallel({
        previousComment: function (callback) {
            RatingSchema.getReadersCommentOnMaterial(req.user._id, req.params.id, callback);
        },
        pagedRatings: function (callback) {
            RatingSchema.getRatingsByMaterial(req.params.id, req.query, callback);
        }
    }, defaultHandler(res));
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
            MaterialSchema.search({ type: 'BOOK' }, callback);
        },
        newspapers: function (callback) {
            ProviderSchema.search({ provides: 'NEWSPAPER' }, callback);
        },
        magazines: function (callback) {
            ProviderSchema.search({ provides: 'MAGAZINE' }, callback);
        }
    }, function (err, results) {
        if (err) return errorResponse(err, res);

        const generes = results.generes;
        const popular = {};

        generes.forEach((genere, index) => {
            if (index > 3) return;
            popular[genere._id.toHexString()] = results.popular;
        });

        const response = {
            generes,
            popular,
            newspapers: results.newspapers,
            magazines: results.magazines,
        };
        return success(res, response);
    });
}

ctrl.uploadFile = genericCtrl.uploadFile;

module.exports = ctrl;