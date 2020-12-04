const mongoose = require('mongoose');
const asyncLib = require('async');
const luxon = require('luxon');
const _ = require('lodash');

const COLLECTION = 'requests';
const LIMIT = 10;

const request_status_obj = {
    ALL: 'all', PENDING: 'pending',
    DENIED: 'denied', COMPLETED: 'completed',
};

const categories_obj = {
    PAYMENT: 'payment',
    MATERIAL_REMOVAL: 'material_removal',
    DELETE_ACCOUNT: 'delete_account',
}

const request_status = Object.values(request_status_obj);
const categories = Object.values(categories_obj);

const RequestSchema = mongoose.Schema({
    provider: { type: mongoose.Types.ObjectId, required: true, ref: 'providers', index: true },
    status: {
        type: String, required: true,
        default: request_status_obj.PENDING,
        enum: request_status, index: true
    },
    category: { type: String, required: true, enum: categories, index: true },
    description: { type: String, default: "" },

    amount: {
        type: Number,
        min: 0,
        required: function () { return this.category === categories_obj.PAYMENT; }
    },

    material: {
        type: mongoose.Types.ObjectId,
        ref: 'materials',
        sparse: true,
        required: function () { return this.kind === types.MATERIAL_REMOVAL; },
    },
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        currentTime: () => luxon.DateTime.utc().valueOf()
    }
});

RequestSchema.index({ created_at: 1 });

RequestSchema.pre('save', function (next) {
    if (this.category !== categories_obj.PAYMENT) {
        this.amount = undefined;
    }

    if (this.category !== categories_obj.MATERIAL_REMOVAL) {
        this.amount = undefined;
    }

    return next();
});

RequestSchema.statics.createRequest = function (requestData, callback) {
    requestData.status = undefined;
    this.model(COLLECTION).create(requestData, callback);
}

RequestSchema.statics.getRequests = function (filters, callback) {
    const page = isNaN(Number(filters.page)) ? 0 : Math.abs(Number(filters.page));

    const query = {};

    if (filters.provider && mongoose.isValidObjectId(filters.provider)) {
        query.provider = filters.provider;
    }

    if (filters.material && mongoose.isValidObjectId(filters.material)) {
        query.material = filters.material;
    }

    if (_.isString(filters.category)) {
        const category = _.toUpper(filters.category.trim());
        if (categories_obj[category]) {
            query.category = kind;
        }
    }

    if (_.isString(filters.status)) {
        const status = _.toUpper(filters.status.trim());
        if (request_status_obj[status]) {
            query.status = status;
        }
    }

    const that = this;
    asyncLib.parallel({
        requests: function (asyncCallback) {
            that.model(COLLECTION)
                .find(query)
                .select('-__v')
                .sort({ created_at: -1 })
                .populate('reader', { firstname: 1, lastname: 1 })
                .skip(page * LIMIT)
                .limit(LIMIT)
                .lean()
                .exec(asyncCallback);
        },
        total_requests: function (asyncCallback) {
            that.model(COLLECTION)
                .countDocuments(query)
                .exec(asyncCallback);
        }
    }, callback);


}

module.exports = mongoose.model(COLLECTION, RequestSchema);
