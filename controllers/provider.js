const MaterialSchema = require('../models/material');
const TransactionSchema = require('../models/transaction');
const RequestSchema = require('../models/request');
const ProviderSchema = require('../models/users/provider');
const asyncLib = require('async');
const _ = require('lodash');

const settings = require('../defaults/settings');

const genericCtrl = require('./generic');
const {
    errorResponse,
    success,
    defaultHandler,
    failure,
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
    if (!_.isString(req.body.category)) return failure(res, 'category required');
    const category = _.toUpper(req.body.category.trim());
    if (!settings.REQUEST_CATEGORIES[category]) return failure(res, 'Unknown category');

    const requestInfo = {
        provider: req.user._id,
        category: category,
        amount: req.body.amount,
        description: req.body.description,
        status: settings.REQUEST_STATUS.PENDING,
        material: req.body.material,
    };

    // special attention to withdrawal requests.
    if (category === settings.REQUEST_CATEGORIES.WITHDRAWAL) {
        if (isNaN(Number(requestInfo.amount))) return failure(res, 'Invalid amount');
        if (!_.isFinite(Number(requestInfo.amount))) return failure(res, 'Invalid amount');

        requestInfo.amount = Number(requestInfo.amount);
        if (requestInfo.amount < 0) return failure(res, 'Withdraw amount cannot be negative');
        if (requestInfo.amount < settings.MINIMUM_WITHDRAWABLE_AMOUNT) {
            return failure(res, 'Amount less than minimum withdrawable amount');
        }

        const balance = req.user.balance;
        if (requestInfo.amount > balance) return failure(res, 'Insufficient balance');
    }
    RequestSchema.createRequest(requestInfo, defaultHandler(res));
}

ctrl.getOwnRequests = function (req, res, next) {
    req.query.provider = req.user._id;
    asyncLib.parallel({
        counts: function (callback) {
            RequestSchema.countRequestsByCategory(req.query, callback);
        },
        requests: function (callback) {
            RequestSchema.getRequests(req.query, callback);
        }
    }, defaultHandler(res));
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
                    total_earning: earning ? earning.total_earnings : 0,
                    count: earning ? earning.total_sells : 0,
                };
            });
            return success(res, matResult);
        });

    });

}

ctrl.getLast7DaysMaterialSells = genericCtrl.getLast7DaysMaterialSells;

ctrl.getEarningsByMaterialsBnDays = function (req, res, next) {
    TransactionSchema.earningsByProviderBnDays(req.user._id, req.query, defaultHandler(res));
}

ctrl.getMaterialSellsReport = function (req, res, next) {
    TransactionSchema.earningByMaterialInDuration(req.params.id, req.query, defaultHandler(res));
}

ctrl.getTransactions = function (req, res, next) {
    asyncLib.parallel({
        balance: function (callback) {
            return callback(null, req.user.balance);
        },
        transactions: function (callback) {
            TransactionSchema.getProviderTransactions(req.user._id, req.query, callback);
        }
    }, defaultHandler(res));
}

ctrl.getWithdrawalInfo = function (req, res, next) {
    const response = {
        net_balance: req.user.balance,
        minimun_withdrawable_amount: settings.MINIMUM_WITHDRAWABLE_AMOUNT,
        service_fee: req.user.balance * settings.HELLOCASH_SERVICE_FEE_PERCENT,
    };

    return success(res, response);
}

ctrl.uploadFile = genericCtrl.uploadFile;

module.exports = ctrl;