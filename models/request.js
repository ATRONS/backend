const mongoose = require('mongoose');
const asyncLib = require('async');
const luxon = require('luxon');
const _ = require('lodash');

const COLLECTION = 'requests';
const LIMIT = 10;

const types = { WITHDRAWAL: 'WITHDRAWAL', DELETE_MATERIAL: 'DELETE_MATERIAL' };

const RequestSchema = mongoose.Schema({
    provider: { type: mongoose.Types.ObjectId, required: true, ref: 'providers', index: true },
    kind: { type: String, required: true, enum: Object.keys(types) },
    description: { type: String, default: "" },
    amount: {
        type: Number,
        min: 0,
        required: () => this.kind === types.WITHDRAWAL
    },
    material: {
        type: mongoose.Types.ObjectId,
        ref: 'materials',
        sparse: true,
        required: () => this.kind === types.DELETE_MATERIAL,
    },
    closed: { type: Boolean, default: false },
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        currentTime: () => luxon.DateTime.utc().valueOf()
    }
});

RequestSchema.index({ created_at: 1 });

RequestSchema.statics.createRequest = function (requestData, callback) {
    requestData.closed = false;
    this.model(COLLECTION).create(requestData, (err, result) => {
        console.log(err);
        return callback(err, result);
    });
}

RequestSchema.statics.getRequests = function (filters, callback) {
    const page = isNaN(Number(filters.page)) ? 0 : Math.abs(Number(filters.page));

    const query = {};

    if (mongoose.isValidObjectId(filters.provider)) {
        query.provider = filters.provider;
    }

    if (mongoose.isValidObjectId(filters.material)) {
        query.material = filters.material;
    }

    if (_.isString(filters.kind)) {
        const kind = _.toUpper(filters.kind.trim());
        if (types[kind]) {
            query.kind = kind;
        }
    }

    query.closed = false;
    if (_.isBoolean(filters.closed)) {
        query.closed = filters.closed;
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
