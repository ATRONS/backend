const { runInContext } = require("lodash");
const { loggers } = require("winston");
const { failure, success } = require("../helpers/response");

const AdminSchema = require('../models/users/admin');
const ProviderSchema = require('../models/users/provider');
const genericCtrl = require('./generic');

const logger = global.logger;

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

ctrl.createProvider = function (req, res, next) {
    const provider = new ProviderSchema({
        name: req.body.name,
        email: req.body.email,
        auth: {
            password: req.body.password,
        },
        avatar_url: req.body.avatar_url,
        is_company: req.body.is_company,
        company_info: req.body.company_info,
        author_info: req.body.author_info,
        provides: req.body.provides,
        about: req.body.about,
        preferences: req.body.preferences,
    });

    provider.save((err, result) => {
        if (err) {
            if (err.code) return failure(res, 'Email Already taken');
            if (err.errors) return failure(res, err);

            logger.error(err);
            return failure(res, 'Internal Error', 500);
        }

        success(res, result);
    });

}

ctrl.addAdmin = function (req, res, next) { res.end('add admin'); }

module.exports = ctrl;