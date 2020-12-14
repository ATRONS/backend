const { failure, success, errorResponse, defaultHandler } = require("../helpers/response");
const ProviderSchema = require('../models/users/provider');
const MaterialSchema = require('../models/material');
const TransactionSchema = require('../models/transaction');
const RequestSchema = require('../models/request');
const genericCtrl = require('./generic');
const jwtCtrl = require('../auth/jwt');
const asyncLib = require('async');
const _ = require('lodash');
const ObjectId = require("mongoose").Types.ObjectId;
const settings = require("../defaults/settings");

const ctrl = {};

ctrl.login = genericCtrl.adminProviderLogin;
ctrl.logout = genericCtrl.logout;

ctrl.forgotPassword = function (req, res, next) { res.end('admin forgot password') }

ctrl.updateProfile = function (req, res, next) { res.end('admin update profile') }

// ----------------------- others -----------------------------------------
ctrl.initialData = function (req, res, next) {
    asyncLib.parallel({
        pending_requests_count: function (callback) {
            RequestSchema.getPendingRequestsCount(callback);
        },
        user_info: function (callback) {
            req.user.auth = undefined;
            return callback(null, req.user);
        }
    }, defaultHandler(res));
}

ctrl.createProvider = function (req, res, next) {
    req.body.auth = {
        // password : jwtCtrl.getRandomBytes(10),
        password: 'password',
    }

    ProviderSchema.createProvider(req.body, (err, result) => {
        if (err) return errorResponse(err, res);
        result.auth = undefined;
        return success(res, result);
    });
}

ctrl.updateProviderInfo = function (req, res, next) {
    ProviderSchema.updateProvider(req.params.id, req.body, function (err, updated) {
        if (err) return errorResponse(err, res);
        return success(res, updated);
    });
}

ctrl.deleteProvider = function (req, res, next) {
    ProviderSchema.softDelete(req.params.id, function (err, result) {
        if (err) return errorResponse(err, res);

        return result.nModified === 1 ?
            success(res, 'Provider deleted') :
            failure(res, 'Could not delete provider');
    });
}

ctrl.getProvider = function (req, res, next) {
    asyncLib.parallel({
        provider: function (callback) {
            ProviderSchema.getProvider(req.params.id, function (err, provider) {
                if (err) return callback(err);
                if (!provider) return callback({ custom: 'Provider not found', status: 404 });
                return callback(null, provider);
            });
        },
        bestSellers: function (callback) {
            TransactionSchema.getBestSellersByProvider(req.params.id, callback);
        },
        sellsReport: function (callback) {
            const ofLastXDays = 7;
            TransactionSchema.getSellsReportByProvider(req.params.id, ofLastXDays, callback);
        },
        totalMaterialsCount: function (callback) {
            const objIds = [ObjectId(req.params.id)];
            MaterialSchema.countMaterialsForProviders(objIds, callback);
        },
        totalSells: function (callback) {
            TransactionSchema.getTotalSellsByProvider(req.params.id, callback);
        }
    }, function (err, results) {
        if (err) return errorResponse(err, res);
        const response = results.provider;

        response.best_sellers = results.bestSellers;
        response.sells_report = results.sellsReport;

        response.report = {
            available_balance: 100,
            total_sells: results.totalSells.total_sells,
            total_earnings: results.totalSells.total_earnings,
            total_materials: results.totalMaterialsCount.length ?
                results.totalMaterialsCount[0].count : 0,
        }

        return success(res, response);
    });
}

ctrl.searchProviders = function (req, res, next) {
    ProviderSchema.search(req.query, function (err, result) {
        if (err) return errorResponse(err, res);
        if (!result.providers.length) return success(res, result);

        const ids = result.providers.map(provider => provider._id);
        MaterialSchema.countMaterialsForProviders(ids, (err, counts) => {
            if (err) return errorResponse(err, res);
            const countObj = {};
            counts.forEach((count) => countObj[count._id] = count);
            result.providers = result.providers.map((provider) => {
                const count = countObj[provider._id];
                if (count) provider.total_materials = count.count;
                else provider.total_materials = 0;
                return provider;
            })
            return success(res, result);
        });
    });
}

ctrl.uploadFile = genericCtrl.uploadFile;

ctrl.createMaterial = function (req, res, next) {
    const material = new MaterialSchema({
        type: req.body.type,
        title: req.body.title,
        subtitle: req.body.subtitle,
        file: req.body.file,
        cover_img_url: req.body.cover_img_url,
        published_date: req.body.published_date,
        display_date: req.body.display_date,
        language: req.body.language,
        ISBN: req.body.ISBN,
        synopsis: req.body.synopsis,
        review: req.body.review,
        tags: req.body.tags,
        pages: req.body.pages,
        edition: req.body.edition,
        provider: req.body.provider,
        price: req.body.price,
    });

    material.save((err, material) => {
        if (err) return errorResponse(err, res);
        material
            .populate('tags')
            .populate('provider', { display_name: 1 })
            .execPopulate(defaultHandler(res));
    });
}

ctrl.updateMaterial = function (req, res, next) {
    MaterialSchema.updateMaterial(req.params.id, req.body, function (err, updated) {
        if (err) return errorResponse(err, res);
        return success(res, updated);
    });
}

ctrl.deleteMaterial = function (req, res, next) {
    MaterialSchema.softDelete(req.params.id, function (err, result) {
        if (err) return errorResponse(err, res);

        return result.nModified === 1 ?
            success(res, 'Material deleted') :
            failure(res, 'Could not delete material');
    });
}

ctrl.getMaterial = genericCtrl.getMaterial;

ctrl.getMaterialRatings = genericCtrl.getMaterialRatings;

ctrl.searchMaterials = genericCtrl.searchMaterials;

ctrl.getAllTags = genericCtrl.getAllTags;
// ---------------------------------------------------------

ctrl.getRequests = function (req, res, next) {
    RequestSchema.getRequests(req.query, defaultHandler(res));
}

ctrl.completeRequest = function (req, res, next) {
    if (!_.isString(req.body.status)) return failure(res, 'Invalid status');
    let status = _.toUpper(req.body.status.trim());
    if (!settings.REQUEST_STATUS[status]) return failure(res, 'Unknown status');
    if (status === settings.REQUEST_STATUS.PENDING) return failure(res, 'change to PENDING not allowed');

    RequestSchema.getRequest(req.params.id, (err, request) => {
        if (err) return errorResponse(err, res);
        if (!request) return failure(res, 'Request not found', 404);

        if (status === settings.REQUEST_STATUS.ACCEPTED) {
            if (request.category === settings.REQUEST_CATEGORIES.WITHDRAWAL) {
                const providerPhone = request.provider.phone;
                const amount = request.amount;
                return success(res, 'not implemented yet');
                // create an invoice here and handle it on the webhook.
            } else if (request.category === settings.REQUEST_CATEGORIES.MATERIAL_REMOVAL) {
                const materialId = request.material;
                const providerId = request.provider._id;
                MaterialSchema.softDeleteWithProviderCheck(materialId, providerId, defaultHandler(res));
            } else if (request.category === settings.REQUEST_CATEGORIES.DELETE_ACCOUNT) {
            }
        } else if (status === settings.REQUEST_STATUS.DENIED) {
            request.notes = req.body.reason || "Request denied";
            request.status = settings.REQUEST_STATUS.DENIED;
            request.save(defaultHandler(res));
        } else return failure(res, 'Something went wrong', 500);

    });
}

module.exports = ctrl;