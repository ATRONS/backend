const { failure, success } = require("../helpers/response");

const AdminSchema = require('../models/users/admin');
const ProviderSchema = require('../models/users/provider');
const MaterialSchema = require('../models/material');
const genericCtrl = require('./generic');
const _ = require('lodash');
const { isValidObjectId } = require("mongoose");

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
        legal_name: req.body.legal_name,
        display_name: req.body.display_name,
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

ctrl.updateProviderInfo = function (req, res, next) {
    if (!isValidObjectId(req.params.id)) return failure(res, 'invalid id');

    ProviderSchema.updateProvider(req.params.id, req.body, function (err, result) {
        if (err) {
            if (err.errors) return failure(res, err);
            logger.error(err);
            return failure(res, 'Internal Error', 500);
        }
        if (!result) return failure(res, 'Provider not found', 404);
        return success(res, result);
    });
}

ctrl.deleteProvider = function (req, res, next) {
    if (!isValidObjectId(req.params.id)) return failure(res, 'invalid id');

    ProviderSchema.softDelete(req.params.id, function (err, result) {
        if (err) {
            if (err.errors) return failure(res, err);
            logger.error(err);
            return failure(res, 'Internal Error', 500);
        }

        return result.nModified === 1 ?
            success(res, 'Provider deleted') :
            failure(res, 'Could not delete provider');
    });
}

ctrl.getProviders = function (req, res, next) {
    if (!_.isString(req.query.type)) return failure(res, 'type query param is required');
    const type = _.toLower(_.trim(req.query.type));
    if (type !== 'author' && type !== 'company') return failure(res, 'unknown provider type');
    const isCompany = type == 'company';
    const page = isNaN(Number(req.query.page)) ? 0 : Math.abs(Number(req.query.page));

    ProviderSchema.getProviders(isCompany, page, function (err, providers) {
        if (err) {
            if (err.errors) return failure(res, err);
            logger.error(err);
            return failure(res, 'Internal Error', 500);
        }

        return success(res, providers);
    });
}

ctrl.searchProviders = function (req, res, next) {
    if (!_.isString(req.query.name)) return failure(res, 'name query param is required');
    const name = _.toLower(_.trim(req.query.name));
    const page = isNaN(Number(req.query.page)) ? 0 : Math.abs(Number(req.query.page));

    ProviderSchema.searchProvidersByName(name, page, function (err, providers) {
        if (err) {
            if (err.errors) return failure(res, err);
            logger.error(err);
            return failure(res, 'Internal Error', 500);
        }

        return success(res, providers);
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
        ISBN: req.body.ISBN,
        synopsis: req.body.synopsis,
        review: req.body.review,
        tags: req.body.tags,
        pages: req.body.pages,
        edition: req.body.edition,
        provider: req.body.provider,
        price: req.body.price,
    });

    material.save((err, result) => {
        if (err) {
            if (err.errors) return failure(res, err);

            logger.error(err);
            return failure(res, 'Internal Error', 500);
        }

        success(res, result);
    });
}

ctrl.addAdmin = function (req, res, next) { res.end('add admin'); }

module.exports = ctrl;