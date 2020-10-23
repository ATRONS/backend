const { runInContext } = require("lodash");

const AdminSchema = require('../models/users/admin');
const genericCtrl = require('./generic');

const ctrl = {};

ctrl.login = function (req, res, next) {
    const secret = process.env.ENCR_SECRET_ADMIN;
    genericCtrl.login(req, res, next, secret, AdminSchema);
}

ctrl.logout = genericCtrl.logout;

ctrl.forgotPassword = function (req, res, next) { res.end('admin forgot password') }

ctrl.updateProfile = function (req, res, next) { res.end('admin update profile') }

// ----------------------- others -----------------------------------------
ctrl.initialData = function (req, res, next) {
    req.user.auth = undefined;

    const response = {
        user_info: req.user,
    };

    success(res, response);
}

ctrl.createProvider = function (req, res, next) { res.end('create provider'); }

ctrl.addAdmin = function (req, res, next) { res.end('add admin'); }

module.exports = ctrl;