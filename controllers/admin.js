const { failure, success, errorResponse, defaultHandler } = require("../helpers/response");
const ProviderSchema = require('../models/users/provider');
const ReaderSchema = require('../models/users/reader');
const MaterialSchema = require('../models/material');
const TransactionSchema = require('../models/transaction');
const InvoiceSchema = require('../models/invoice');
const RequestSchema = require('../models/request');
const AtronsSchema = require('../models/atrons');
const genericCtrl = require('./generic');
const jwtCtrl = require('../auth/jwt');
const hellocashCtrl = require('./payment/hellocash');
const asyncLib = require('async');
const uuid = require('uuid');
const _ = require('lodash');
const luxon = require('luxon');
const ObjectId = require("mongoose").Types.ObjectId;
const settings = require("../defaults/settings");
const emailer = require("../emailer/emailer");
const material = require("../models/material");

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

ctrl.dashboardReport = function (req, res, next) {
    asyncLib.parallel({
        total_materials: function (callback) {
            MaterialSchema.countMaterials(callback);
        },
        total_providers: function (callback) {
            ProviderSchema.countProviders(callback);
        },
        total_readers: function (callback) {
            ReaderSchema.countReaders(callback);
        },
        company_info: function (callback) {
            AtronsSchema.getCompany(callback);
        },
        top_selling: function (callback) {
            TransactionSchema.getLastWeekTopSelling((err, topSelling) => {
                if (err) return callback(err);

                const topSellingToObj = {};
                topSelling.forEach(mat => {
                    const id = mat._id.toHexString();
                    topSellingToObj[id] = mat;
                });
                const matIds = topSelling.map((each) => each._id);

                MaterialSchema.getMaterialsInIds(matIds, (err, materials) => {
                    if (err) return callback(err);
                    for (let material of materials) {
                        const id = material._id.toHexString();
                        topSellingToObj[id].title = material.title;
                        topSellingToObj[id].subtitle = material.subtitle;
                        topSellingToObj[id].price = material.price;
                    }
                    return callback(null, Object.values(topSellingToObj));
                });
            });
        }
    }, defaultHandler(res));
}

ctrl.createProvider = function (req, res, next) {
    const password = jwtCtrl.getRandomBytes(10);
    req.body.auth = {
        password: password,
    }

    ProviderSchema.createProvider(req.body, (err, provider) => {
        if (err) return errorResponse(err, res);
        provider.auth = undefined;
        const recepientInfo = {
            email: provider.email,
            legal_name: provider.legal_name,
        };
        const url = 'http://ec2-3-126-51-124.eu-central-1.compute.amazonaws.com/api/v1'
        emailer.sendProviderDefaultPassword(recepientInfo, password, url);
        return success(res, provider);
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

        return success(res, { message: 'Provider deleted' });
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
            available_balance: results.provider.balance,
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
            });
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

ctrl.getLast7DaysMaterialSells = genericCtrl.getLast7DaysMaterialSells;

ctrl.getMaterial = genericCtrl.getMaterial;

ctrl.getMaterialRatings = genericCtrl.getMaterialRatings;

ctrl.searchMaterials = genericCtrl.searchMaterials;

ctrl.getAllTags = genericCtrl.getAllTags;
// ---------------------------------------------------------

ctrl.getRequests = function (req, res, next) {
    asyncLib.parallel({
        counts: function (callback) {
            RequestSchema.countRequestsByCategory({}, callback);
        },
        requests: function (callback) {
            RequestSchema.getRequests(req.query, callback);
        }
    }, defaultHandler(res));
}

ctrl.completeRequest = function (req, res, next) {
    if (!_.isString(req.body.status)) return failure(res, 'Invalid status');
    let status = _.toUpper(req.body.status.trim());
    if (!settings.REQUEST_STATUS[status]) return failure(res, 'Unknown status');
    if (status === settings.REQUEST_STATUS.PENDING) return failure(res, 'change to PENDING not allowed');

    RequestSchema.getRequest(req.params.id, (err, request) => {
        if (err) return errorResponse(err, res);
        if (!request) return failure(res, 'Request not found', 404);

        if (request.status === settings.REQUEST_STATUS.ACCEPTED) {
            return failure(res, 'Request already Completed');
        }

        if (request.status === settings.REQUEST_STATUS.IN_PROCESSING) {
            return failure(res, 'Request already in processing');
        }

        if (status === settings.REQUEST_STATUS.ACCEPTED) {
            if (request.category === settings.REQUEST_CATEGORIES.WITHDRAWAL) {
                const providerId = request.provider._id;
                const providerPhone = request.provider.phone;
                const amount = request.amount;

                ProviderSchema.getProvider(providerId, (err, provider) => {
                    if (err) return errorResponse(err, res);
                    if (!provider) return failure(res, 'Provider not found');

                    if (provider.balance < settings.MINIMUM_WITHDRAWABLE_AMOUNT ||
                        amount > provider.balance) {
                        return failure(res, 'Can not pay provider, balance insufficient for transfer');
                    }

                    let expiresOn = luxon.DateTime.utc();
                    expiresOn = expiresOn.plus(luxon.Duration.fromObject({ days: 1 }));
                    expiresOn = expiresOn.toISO();

                    const transferInfo = {
                        amount: amount,
                        description: 'Payment to ' + provider.legal_name,
                        to: providerPhone,
                        tracenumber: uuid.v4(),
                    };
                    hellocashCtrl.transfer(transferInfo, (err, invoice) => {
                        if (err) return failure(res, 'Could not transfer');
                        const authorizeInfo = { transferids: [invoice.id] };
                        hellocashCtrl.authorizeTransfer(authorizeInfo, (err, authorized) => {
                            if (err) return failure(res, 'Transfer not authorized');

                            InvoiceSchema.createInvoice({
                                kind: settings.INVOICE_TYPES.WITHDRAWAL,
                                provider: provider._id,

                                amount: invoice.amount,
                                currency: invoice.currency,
                                payer: invoice.from,
                                receiver: invoice.to,
                                date: invoice.date,
                                expires: expiresOn,

                                invoice_id: invoice.id,
                                tracenumber: invoice.tracenumber,
                                status: invoice.status,

                                invoice_dump: invoice,
                            }, (err, createdInvoice) => {
                                if (err) return errorResponse(err, res);
                                request.status = settings.REQUEST_STATUS.IN_PROCESSING;
                                request.save((err, savedRequest) => {
                                    if (err) return errorResponse(err, res);
                                    const response = savedRequest.toObject();
                                    response.code = authorized.code;
                                    return success(res, response);
                                });
                            });
                        });
                    });
                });
            } else if (request.category === settings.REQUEST_CATEGORIES.MATERIAL_REMOVAL) {
                if (!request.material) return failure(res, 'Material not found');
                const materialId = request.material._id;
                const providerId = request.provider._id;
                MaterialSchema.softDeleteWithProviderCheck(materialId, providerId, (err, result) => {
                    if (err) return errorResponse(err, res);
                    request.status = settings.REQUEST_STATUS.ACCEPTED;
                    request.save((err, savedRequest) => {
                        if (err) return errorResponse(err, res);

                        const providerInfo = {
                            email: request.provider.email,
                            legal_name: request.provider.legal_name,
                        };
                        const materialInfo = {
                            title: request.material.title,
                            subtitle: request.material.subtitle
                        };
                        emailer.sendMaterialRemovedEmail(providerInfo, materialInfo);
                        return success(res, savedRequest);
                    });
                });

            } else if (request.category === settings.REQUEST_CATEGORIES.DELETE_ACCOUNT) {
                ProviderSchema.softDelete(request.provider._id, (err, result) => {
                    if (err) return errorResponse(err, res);

                    request.status = settings.REQUEST_STATUS.ACCEPTED;
                    request.save(defaultHandler(res));
                });
            }
        } else if (status === settings.REQUEST_STATUS.DENIED) {
            request.notes = req.body.reason || "Request denied";
            request.status = settings.REQUEST_STATUS.DENIED;
            request.save((err, savedRequest) => {
                if (err) return errorResponse(err, res);
                let message = '';
                switch (request.category) {
                    case settings.REQUEST_CATEGORIES.DELETE_ACCOUNT:
                        message = 'deleting your Atrons account';
                        break;
                    case settings.REQUEST_CATEGORIES.MATERIAL_REMOVAL:
                        message = 'removing A material from Atrons';
                        break;
                    default:
                        message = `withdrawing ${request.amount} from your Atrons account`;
                        break;
                }
                const recepientInfo = {
                    email: request.provider.email,
                    legal_name: request.provider.legal_name,
                };
                emailer.sendRequestDeniedEmail(recepientInfo, message);
                return success(res, savedRequest);
            });
        } else return failure(res, 'Something went wrong', 500);
    });
}

module.exports = ctrl;