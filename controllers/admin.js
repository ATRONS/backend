const { failure, success, errorResponse } = require("../helpers/response");
const AdminSchema = require('../models/users/admin');
const ProviderSchema = require('../models/users/provider');
const MaterialSchema = require('../models/material');
const TransactionSchema = require('../models/transaction');
const genericCtrl = require('./generic');
const asyncLib = require('async');
const _ = require('lodash');
const ObjectId = require("mongoose").Types.ObjectId;

const logger = global.logger;

const ctrl = {};

ctrl.login = genericCtrl.adminProviderLogin;
ctrl.logout = genericCtrl.logout;

ctrl.forgotPassword = function (req, res, next) { res.end('admin forgot password') }

ctrl.updateProfile = function (req, res, next) { res.end('admin update profile') }

// ----------------------- others -----------------------------------------
ctrl.initialData = function (req, res, next) {
    req.user.auth = undefined;

    const response = {
        user_info: req.user,
    };

    return success(res, response);
}

ctrl.createProvider = function (req, res, next) {
    const provider = new ProviderSchema({
        legal_name: req.body.legal_name,
        display_name: req.body.display_name,
        email: req.body.email,
        phone: req.body.phone,
        about: req.body.about,
        auth: {
            password: req.body.password,
        },
        is_company: !!req.body.company_info,
        company_info: req.body.company_info,
        author_info: req.body.author_info,
    });

    provider.save((err, result) => {
        if (err) return errorResponse(err, res);
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

        const sells_info = results.totalSells.length ?
            results.totalSells[0] :
            {
                sells_amount: 0,
                sells_count: 0
            };
        response.total_sells_amount = sells_info.sells_amount;
        response.total_sells_count = sells_info.sells_count;
        response.total_materials_count = results.totalMaterialsCount.length ?
            results.totalMaterialsCount[0].count : 0;
        response.available_balance = 100;

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
            .execPopulate((err, doc) => {
                if (err) return errorResponse(err);
                return success(res, doc);
            });
        // return success(res, material);
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

ctrl.searchMaterials = genericCtrl.searchMaterials;

ctrl.getAllTags = genericCtrl.getAllTags;
// ---------------------------------------------------------
ctrl.addAdmin = function (req, res, next) { res.end('add admin'); }

module.exports = ctrl;