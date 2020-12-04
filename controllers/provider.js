const MaterialSchema = require('../models/material');
const TransactionSchema = require('../models/transaction');
const RequestSchema = require('../models/request');
const ProviderSchema = require('../models/users/provider');
const asyncLib = require('async');

const genericCtrl = require('./generic');
const {
    errorResponse,
    success,
    defaultHandler,
} = require('../helpers/response');

const ctrl = {};

ctrl.login = genericCtrl.adminProviderLogin;
ctrl.logout = genericCtrl.logout;

ctrl.updateProfile = function (req, res, next) {
    req.user.updateProfile(req.body, (err, provider) => {
        if (err) return errorResponse(err, res);
        provider.auth = undefined;
        return success(res, provider);
    });
}

ctrl.activateAccount = function (req, res, next) {
    req.user.activationUpdate(req.body, (err, provider) => {
        if (err) return errorResponse(err, res);
        provider.auth = undefined;
        return success(res, provider);
    });
}

ctrl.forgotPassword = function (req, res, next) { res.end('provider forgot password') }

// ----------------------- others -----------------------------------------
ctrl.initialData = function (req, res, next) {
    req.user.auth = undefined;

    const response = {
        user_info: req.user,
    };

    return success(res, response);
}

ctrl.createRequest = function (req, res, next) {
    req.body.provider = req.user._id;
    RequestSchema.createRequest(req.body, defaultHandler(res));
}

ctrl.getOwnRequests = function (req, res, next) {
    req.query.provider = req.user._id;
    RequestSchema.getRequests(req.query, defaultHandler(res));
}

ctrl.getOwnMaterials = function (req, res, next) {
    req.query.provider = req.user._id;
    MaterialSchema.search(req.query, defaultHandler(res));
}

ctrl.getMaterial = genericCtrl.getMaterial;

ctrl.getMaterialRatings = genericCtrl.getMaterialRatings;

ctrl.getEarningsByMaterials = function (req, res, next) {
    req.query.provider = req.user._id;

    MaterialSchema.minifiedSearch(req.query, (err, matResult) => {
        if (err) return errorResponse(err, res);
        if (!matResult.materials.length) return success(res, []);

        const matIds = matResult.materials.map((each) => each._id);
        TransactionSchema.earningsByMaterials(matIds, (err, earnings) => {
            if (err) return errorResponse(err, res);

            const earningsObj = {};
            earnings.forEach((earning) => earningsObj[earning._id] = earning);
            matResult.materials = matResult.materials.map((material) => {
                let earning = earningsObj[material._id];
                return {
                    _id: material._id,
                    title: material.title,
                    subtitle: material.subtitle,
                    total_earning: earning ? earning.amount : 0,
                    count: earning ? earning.count : 0,
                };
            });
            return success(res, matResult);
        });

    });

}

ctrl.getEarningsByMaterialsBnDays = function (req, res, next) {
    TransactionSchema.earningsByProviderBnDays(req.user._id, req.query, defaultHandler(res));
}

ctrl.getMaterialSellsReport = function (req, res, next) {
    TransactionSchema.earningByMaterialInDuration(req.params.id, req.query, defaultHandler(res));
}

ctrl.getTransactions = function (req, res, next) {
    TransactionSchema.getProviderTransactions(req.user._id, req.query, defaultHandler(res));
}

ctrl.uploadFile = genericCtrl.uploadFile;

module.exports = ctrl;