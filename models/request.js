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

    amount: {
        type: Number,
        min: 0,
        required: function () { return this.category === categories_obj.PAYMENT; }
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
    console.log(filters);
    const startRow = isNaN(Number(filters.startRow)) ?
        0 : Math.abs(Number(filters.startRow));

    let size = isNaN(Number(filters.size)) ?
        LIMIT : Math.abs(Number(filters.size));

    if (size > LIMIT) size = LIMIT;


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
                .populate('provider', { legal_name: 1, display_name: 1 })
                .populate('material', { title: 1, subtitle: 1 })
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

RequestSchema.statics.countRequestsByStatus = function (filters, callback) {
    const aggregation = [];

    if (filters.provider && mongoose.isValidObjectId(filters.provider)) {
        aggregation.push = {
            $match: {
                provider: mongoose.Types.ObjectId(filters.provider),
            }
        };
    }

    aggregation.push({
        $group: {
            _id: "$status",
            count: { $sum: 1 },
        }
    })

    this.model(COLLECTION).aggregate(aggregation).exec((err, results) => {
        if (err) return callback(err);
        return callback(null, results);
        // results.forEach((group) => {

        // });
    });
}

module.exports = mongoose.model(COLLECTION, RequestSchema);
