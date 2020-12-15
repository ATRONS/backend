const AdminSchema = require('../models/users/admin');
const ProviderSchema = require('../models/users/provider');
const MaterialSchema = require('../models/material');
const ReaderSchema = require('../models/users/reader');
const TagSchema = require('../models/tag');
const TransactionSchema = require('../models/transaction');
const DownloadSchema = require('../models/download');
const RatingSchema = require('../models/rating');

const mongoose = require('mongoose');
const jwtCtrl = require('../auth/jwt');
const luxon = require('luxon');
const emailer = require('../emailer/emailer');
const asyncLib = require('async');
const encrypt = require('../encryption/encryption');
const _ = require('lodash');
const {
    success,
    failure,
    errorResponse,
    defaultHandler,
} = require('../helpers/response');

const mongo = mongoose.mongo;
const db = mongoose.connection.db;

const materialsBucket = new mongo.GridFSBucket(db, {
    chunkSizeBytes: 1024,
    bucketName: 'materials',
});

const imagesBucket = new mongo.GridFSBucket(db, {
    chunkSizeBytes: 1024,
    bucketName: 'images',
});

const logger = global.logger;

const ctrl = {};

// implementation will need to change at some point. I don't like it.
ctrl.adminProviderLogin = function (req, res, next) {
    const required = ['email', 'password'];

    for (let key of required) {
        if (!req.body[key] || !_.isString(req.body[key])) {
            return failure(res, `${key} required`);
        }
    }

    const email = req.body.email.trim().toLowerCase();
    const password = req.body.password.trim();
    const secret = process.env.ENCR_SECRET;
    ProviderSchema.findOne({ email: email }, (err, provider) => {
        if (err) return errorResponse(err, res);
        if (provider) {
            const passwordCorrect = provider.isPasswordCorrect(password);
            if (!passwordCorrect) return failure(res, 'Email or password incorrect');

            const tokenInfo = { userId: provider._id, role: 'provider' };
            jwtCtrl.createToken(tokenInfo, secret, (err, token) => {
                if (err) return errorResponse(err, res);

                provider.addSessionId(token.sessionId);
                provider.save((err, saved) => {
                    if (err) return failure(res, 'Internal Error', 500);
                    const user_info = saved.toObject();
                    user_info.auth = undefined;
                    user_info.__v = undefined;
                    user_info.role = tokenInfo.role;
                    const response = { token: token.token, user_info: user_info };
                    success(res, response);
                });
            });
        } else {
            AdminSchema.findOne({ email: email }, (err, admin) => {
                if (err) return errorResponse(err, res);
                if (!admin) return failure(res, 'Email or password incorrect');

                const passwordCorrect = admin.isPasswordCorrect(password);
                if (!passwordCorrect) return failure(res, 'Email or password incorrect');

                const tokenInfo = { userId: admin._id, role: 'admin' };
                jwtCtrl.createToken(tokenInfo, secret, (err, token) => {
                    if (err) return errorResponse(err, res);

                    admin.addSessionId(token.sessionId);
                    admin.save((err, saved) => {
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
    });
}

ctrl.logout = async function (req, res, next) {
    req.user.auth.tokens = [];
    req.user.save((err, _) => {
        if (err) return errorResponse(err, res);
        success(res, { message: 'successfully logged out' });
    });
}

ctrl.uploadFile = function (req, res, next) {
    if (!req.file) return failure(res, 'Empty request');

    const response = {
        id: req.file.id,
        size: req.file.size,
        contentType: req.file.contentType,
        mimetype: req.file.mimetype,
        url: `/media/${req.file.bucketName}/${req.file.id}`,
    };
    return success(res, response);
}

ctrl.downloadFile = function (bucketName) {
    const bucket = bucketName === 'materials' ? materialsBucket : imagesBucket;

    return function (req, res, next) {
        let id = req.params.id.trim();
        if (!mongoose.isValidObjectId(id)) {
            return failure(res, 'Not found', 404);
        }

        id = mongoose.Types.ObjectId(id);
        const files = bucket.find({ _id: id });

        files.toArray((err, results) => {
            if (err) return failure(res, err);
            if (!results.length) return failure(res, 'Not found', 404);

            const fileStream = bucket.openDownloadStream(id);
            if (bucketName == 'materials') {
                const keyIvPair = { key: req.user.key, iv: req.user.iv };

                encrypt.encryptAndPipe(fileStream, res, keyIvPair, (err) => {
                    if (err) {
                        logger.error(err);
                        return failure(res, 'Internal Error', 500);
                    }
                }).on('error', (err) => {
                    logger.error(err);
                    return failure(res, 'Internal Error', 500);
                }).on('finish', () => {
                    MaterialSchema.getMaterialByFileId(id, (err, material) => {
                        if (material) {
                            const downloadInfo = {
                                user: req.user._id,
                                material: material._id,
                                provider: material.provider,
                            }
                            DownloadSchema.createDownload(downloadInfo, (err, result) => {
                                if (err) {
                                    logger.error(err);
                                    logger.error('could not record download for material ' + material._id);
                                }
                            })
                        }
                    });
                });
            } else {
                fileStream.pipe(res).on('error', function (error) {
                    logger.error(error);
                    failure(res, 'Internal Error', 500);
                });
            }

        });
    }
}

// ፟-፟------------------------------ provider mgmt commons ----------------------------
ctrl.searchProviders = function (req, res, next) {
    ProviderSchema.search(req.query, defaultHandler(res));
}

ctrl.getProvider = function (req, res, next) {
    ProviderSchema.getProvider(req.params.id, function (err, provider) {
        if (err) return errorResponse(err, res);
        if (!provider) return failure(res, 'Provider not found', 404);
        return success(res, provider);
    });
}

// ----------------------------- Material mgmt commons -----------------------------
ctrl.getMaterial = function (req, res, next) {
    asyncLib.parallel({
        materialDetail: function (callback) {
            MaterialSchema.getMaterial(req.params.id, callback);
        },
        sells: function (callback) {
            TransactionSchema.earningByMaterial(req.params.id, callback);
        },
        downloads: function (callback) {
            DownloadSchema.getMaterialDownloads(req.params.id, callback);
        }
    }, function (err, results) {
        if (err) return errorResponse(err, res);

        const response = results.materialDetail;
        response.reports = results.sells.length ?
            results.sells[0] :
            {
                _id: req.params.id,
                total_earnings: 0,
                total_sells: 0,
            };
        response.reports.downloads = results.downloads;

        success(res, response);
    });
}

ctrl.searchMaterials = function (req, res, next) {
    MaterialSchema.search(req.query, defaultHandler(res));
}

ctrl.getLast7DaysMaterialSells = function (req, res, next) {
    TransactionSchema.getSellsReportByMaterial(req.params.id, req.query.lastXDays, defaultHandler(res));
}

ctrl.getMaterialRatings = function (req, res, next) {
    RatingSchema.getRatingsByMaterial(req.params.id, req.query, defaultHandler(res));
}

// ---------------------------------------------------------------------------------
ctrl.getAllTags = function (req, res, next) {
    TagSchema.getAllTags(function (err, tags) {
        if (err) return errorResponse(err, res);
        return success(res, tags);
    });
}

module.exports = ctrl;