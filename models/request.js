const mongoose = require('mongoose');
const asyncLib = require('async');
const luxon = require('luxon');
const _ = require('lodash');

const settings = require('../defaults/settings');

const COLLECTION = 'requests';
const LIMIT = 10;

const request_status_obj = settings.REQUEST_STATUS;
const categories_obj = settings.REQUEST_CATEGORIES;

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
    notes: { type: String, default: "", trim: true },

    amount: {
        type: Number,
        min: 0,
        required: function () {
            return this.category === categories_obj.WITHDRAWAL;
        }
    },

    material: {
        type: mongoose.Types.ObjectId,
        ref: 'materials',
        sparse: true,
        required: function () { return this.category === categories_obj.MATERIAL_REMOVAL; },
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
    if (this.category !== categories_obj.WITHDRAWAL) {
        this.amount = undefined;
    }

    return next();
});

RequestSchema.statics.createRequest = function (requestData, callback) {
    requestData.status = undefined;
    this.model(COLLECTION).create(requestData, callback);
}

RequestSchema.statics.getRequest = function (oId, callback) {
    if (!mongoose.isValidObjectId(oId)) return callback({ custom: 'Invalid Id', status: 400 });

    this.model(COLLECTION)
        .findOne({ _id: oId })
        .populate('provider', { phone: 1, legal_name: 1, display_name: 1, email: 1, _id: 1 })
        .populate('material', { title: 1, subtitle: 1, _id: 1 })
        .exec(callback);
}

RequestSchema.statics.getRequests = function (filters, callback) {
    const startRow = isNaN(Number(filters.startRow)) ?
        0 : Math.abs(Number(filters.startRow));

    let size = isNaN(Number(filters.size)) ?
        LIMIT : Math.abs(Number(filters.size));

    const query = {};

    if (filters.provider && mongoose.isValidObjectId(filters.provider)) {
        query.provider = filters.provider;
    }

    if (filters.material && mongoose.isValidObjectId(filters.material)) {
        query.material = filters.material;
    }

    if (_.isString(filters.category) && filters.category.trim()) {
        const category = _.toUpper(filters.category.trim());
        query.category = category;
    }

    if (_.isString(filters.status) && filters.status.trim()) {
        const status = _.toUpper(filters.status.trim());
        query.status = status;
    }

    const that = this;
    asyncLib.parallel({
        requests: function (asyncCallback) {
            that.model(COLLECTION)
                .find(query)
                .select('-__v')
                .sort({ created_at: -1 })
                .populate('provider', { phone: 1, legal_name: 1, display_name: 1, email: 1, _id: 1 })
                .populate('material', { title: 1, subtitle: 1, _id: 1 })
                .skip(startRow)
                .limit(size)
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

RequestSchema.statics.getPendingRequestsCount = function (callback) {
    this.model(COLLECTION).countDocuments({ status: request_status_obj.PENDING }).exec(callback);
}

RequestSchema.statics.countRequestsByCategory = function (filters, callback) {
    const aggregations = [];
    // if (mongoose.isValidObjectId(filters.provider)) {
    //     aggregations.push({
    //         $match: {
    //             provider: mongoose.Types.ObjectId(filters.provider),
    //         }
    //     });
    // }

    aggregations.push({
        $group: {
            _id: "$status",
            total: { $sum: 1 },
        }
    });

    this.model(COLLECTION).aggregate(aggregations).exec((err, results) => {
        if (err) return callback(err);

        const toObj = {};
        for (let key of Object.keys(request_status_obj)) {
            toObj[key] = 0;
        }
        console.log(results);
        for (let result of results) {
            toObj[result._id] = result.total;
        }
        return callback(null, toObj);
    });
}

module.exports = mongoose.model(COLLECTION, RequestSchema);
