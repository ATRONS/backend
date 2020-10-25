const ProviderSchema = require('../models/users/provider');
const genericCtrl = require('./generic');

const ctrl = {};

ctrl.login = function (req, res, next) {
    const secret = process.env.ENCR_SECRET_PROVIDER;
    genericCtrl.login(req, res, next, secret, ProviderSchema);
}

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

ctrl.uploadFile = genericCtrl.uploadFile;

module.exports = ctrl;