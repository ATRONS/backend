const ProviderSchema = require('../models/users/provider');
const MaterialSchema = require('../models/material');
const TransactionSchema = require('../models/transaction');
const genericCtrl = require('./generic');
const asyncLib = require('async');
const { errorResponse, success, defaultHandler } = require('../helpers/response');

const ctrl = {};

ctrl.login = genericCtrl.adminProviderLogin;
ctrl.logout = genericCtrl.logout;

ctrl.forgotPassword = function (req, res, next) { res.end('provider forgot password') }

ctrl.updateProfile = function (req, res, next) { res.end('provider update profile') }

// ----------------------- others -----------------------------------------
ctrl.initialData = function (req, res, next) {
    req.user.auth = undefined;

    const response = {
        user_info: req.user,
    };

    success(res, response);
}

ctrl.getOwnMaterials = function (req, res, next) {
    req.query.provider = req.user._id;
    MaterialSchema.minifiedSearch(req.query, defaultHandler(res));
}

ctrl.getMaterial = function (req, res, next) {
    asyncLib.parallel({
        materialDetail: function (callback) {
            MaterialSchema.getMaterial(req.params.id, callback);
        },
        sells: function (callback) {
            TransactionSchema.earningByMaterial(req.params.id, callback);
        },
        downloads: function (callback) {
            return callback(null, 15);
        }
    }, function (err, results) {
        if (err) return errorResponse(err, res);

        const response = results.materialDetail;
        response.reports = results.sells.length ?
            results.sells[0] :
            {
                total_earnings: 0,
                total_sells: 0,
            };
        response.reports.downloads = results.downloads;

        success(res, response);
    });
}

ctrl.getEarningsByMaterials = function (req, res, next) {
    req.query.provider = "5fb7ec05faf68e1b00fe7f3c"; //Bealu Girma's Id.

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
                    amount: earning ? earning.amount : 0,
                    count: earning ? earning.count : 0,
                };
            });
            return success(res, matResult);
        });

    });

}

ctrl.uploadFile = genericCtrl.uploadFile;

module.exports = ctrl;