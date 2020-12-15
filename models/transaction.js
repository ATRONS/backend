const mongoose = require('mongoose');
const _ = require('lodash');
const luxon = require('luxon');
const settings = require('../defaults/settings');

const COLLECTION = 'transactions';
const LIMIT = 10;

const invoice_types = settings.INVOICE_TYPES;

const TransactionSchema = mongoose.Schema({
    kind: {
        type: String,
        required: true,
        enum: Object.keys(invoice_types),
    },
    description: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },

    provider: {
        type: mongoose.Types.ObjectId,
        ref: 'providers',
        index: true,
        required: true,
    },

    reader: {
        type: mongoose.Types.ObjectId,
        ref: 'readers',
        sparse: true,
        required: function () { return this.kind === invoice_types.PURCHASE; }
    },

    material: {
        type: mongoose.Types.ObjectId,
        ref: 'materials',
        sparse: true,
        required: function () { return this.kind === invoice_types.PURCHASE; }
    },

    tracenumber: { type: String, required: true, index: true },
    currency: { type: String, default: 'ETB' },
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        currentTime: () => luxon.DateTime.utc().valueOf()
    }
});

TransactionSchema.index({ created_at: 1 });

TransactionSchema.statics.createTransaction = function (transactionInfo, callback) {
    this.model(COLLECTION).create(transactionInfo, callback);
}

TransactionSchema.statics.readerOwnsMaterial = function (readerId, matId, callback) {
    this.model(COLLECTION)
        .findOne({ reader: readerId, material: matId, kind: invoice_types.PURCHASE })
        .select('_id')
        .exec((err, transaction) => {
            if (err) return callback(err);
            return callback(null, transaction !== null);
        });
}

TransactionSchema.statics.getReaderOwnedMaterials = function (readerId, callback) {
    this.model(COLLECTION)
        .find({ reader: readerId, kind: invoice_types.PURCHASE })
        .populate('material')
        .exec(callback);
}

// sends the last 7 days sells report for a provider.
TransactionSchema.statics.getSellsReportByProvider = function (provider, lastXDays, callback) {
    if (!mongoose.isValidObjectId(provider)) return callback({ custom: 'Invalid Id', status: 400 });

    const today = luxon.DateTime.utc().endOf("day");
    const xdaysAgo = today
        .minus(luxon.Duration.fromObject({ days: 6 }))
        .startOf("day");

    this.model(COLLECTION)
        .aggregate([
            {
                $match: {
                    provider: mongoose.Types.ObjectId(provider),
                    kind: settings.INVOICE_TYPES.PURCHASE,
                    created_at: { $gte: xdaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        day: { $dayOfMonth: "$created_at" },
                        month: { $month: "$created_at" },
                        year: { $year: "$created_at" }
                    },
                    total_amount: { $sum: "$amount" },
                    total_sells: { $sum: 1 }
                }
            }
        ])
        .exec((err, result) => {
            if (err) return callback(err);

            const toObj = {};
            result.forEach((e) => {
                const key = `${e._id.day}:${e._id.month}:${e._id.year}`;
                toObj[key] = e;
            });

            console.log(toObj);

            let s = xdaysAgo;
            let new_result = [];

            for (let i = 0; i < 7; i++) {
                let key = `${s.day}:${s.month}:${s.year}`;

                if (toObj[key]) new_result.push(toObj[key]);
                else {
                    new_result.push({
                        _id: {
                            day: s.day,
                            month: s.month,
                            year: s.year
                        },
                        total_amount: 0,
                        total_sells: 0
                    });
                }

                if (s.day == today.day &&
                    s.month == today.month &&
                    s.year == today.year) {
                    break;
                }

                s = s.plus(luxon.Duration.fromObject({ days: 1 }));
            }
            return callback(null, new_result);
        });
}

TransactionSchema.statics.getBestSellersByProvider = function (provider, callback) {
    if (!mongoose.isValidObjectId(provider)) return callback({ custom: 'Invalid Id', status: 400 });

    this.model(COLLECTION).aggregate([
        {
            $match: {
                provider: mongoose.Types.ObjectId(provider),
                kind: settings.INVOICE_TYPES.PURCHASE,
            }
        },
        {
            $group: {
                _id: "$material",
                sold_copies: { $sum: 1 },
                total_amount: { $sum: "$amount" },
            }
        },
        { $sort: { sold_copies: -1 } },
        { $limit: LIMIT }
    ]).exec(callback);
}

TransactionSchema.statics.getTotalSellsByProvider = function (provider, callback) {
    if (!mongoose.isValidObjectId(provider)) return callback({ custom: 'Invalid Id', status: 400 });

    this.model(COLLECTION).aggregate([
        {
            $match: {
                provider: mongoose.Types.ObjectId(provider),
                kind: settings.INVOICE_TYPES.PURCHASE,
            }
        },
        {
            $group: {
                _id: "$provider",
                total_earnings: { $sum: "$amount" },
                total_sells: { $sum: 1 },
            }
        },
        { $sort: { _id: -1, }, },
    ]).exec((err, report) => {
        if (err) return callback(err);

        const response = report.length ? report[0] : {
            total_earnings: 0,
            total_sells: 0,
        };

        return callback(null, response);
    });
}

TransactionSchema.statics.earningsByMaterials = function (matIds, callback) {
    if (!_.isArray(matIds)) return callback({ custom: 'Array of ObjectIds expected', status: 400 });

    this.model(COLLECTION).aggregate([
        {
            $match: {
                material: { $in: matIds },
                kind: settings.INVOICE_TYPES.PURCHASE,
            }
        },
        {
            $group: {
                _id: "$material",
                total_earnings: { $sum: "$amount" },
                total_sells: { $sum: 1 },
            }
        },
        { $sort: { _id: -1, }, },
    ]).exec(callback);
}

TransactionSchema.statics.earningByMaterial = function (matId, callback) {
    if (!mongoose.isValidObjectId(matId)) return callback({ custom: 'Invalid Id', status: 400 });

    this.model(COLLECTION).aggregate([
        {
            $match: {
                material: mongoose.Types.ObjectId(matId),
                kind: settings.INVOICE_TYPES.PURCHASE,
            }
        },
        {
            $group: {
                _id: "$material",
                total_earnings: { $sum: "$amount" },
                total_sells: { $sum: 1 }
            }
        }
    ]).exec(callback);
}

// sends the last 7 days sells report for a material
TransactionSchema.statics.getSellsReportByMaterial = function (material, lastXDays, callback) {
    if (!mongoose.isValidObjectId(material)) return callback({ custom: 'Invalid Id', status: 400 });

    const days = _.isNumber(Number(lastXDays)) ? Math.abs(Number(lastXDays)) - 1 : 6;
    const today = luxon.DateTime.utc().endOf("day");
    const xdaysAgo = today
        .minus(luxon.Duration.fromObject({ days: days }))
        .startOf("day");

    this.model(COLLECTION)
        .aggregate([
            {
                $match: {
                    material: mongoose.Types.ObjectId(material),
                    kind: settings.INVOICE_TYPES.PURCHASE,
                    created_at: { $gte: xdaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        day: { $dayOfMonth: "$created_at" },
                        month: { $month: "$created_at" },
                        year: { $year: "$created_at" }
                    },
                    total_amount: { $sum: "$amount" },
                    total_sells: { $sum: 1 }
                }
            }
        ])
        .exec((err, result) => {
            if (err) return callback(err);

            const toObj = {};
            result.forEach((e) => {
                const key = `${e._id.day}:${e._id.month}:${e._id.year}`;
                toObj[key] = e;
            });

            console.log(toObj);

            let s = xdaysAgo;
            let new_result = [];

            for (let i = 0; i < days + 1; i++) {
                let key = `${s.day}:${s.month}:${s.year}`;

                if (toObj[key]) new_result.push(toObj[key]);
                else {
                    new_result.push({
                        _id: {
                            day: s.day,
                            month: s.month,
                            year: s.year
                        },
                        total_amount: 0,
                        total_sells: 0
                    });
                }

                if (s.day == today.day &&
                    s.month == today.month &&
                    s.year == today.year) {
                    break;
                }

                s = s.plus(luxon.Duration.fromObject({ days: 1 }));
            }
            return callback(null, new_result);
        });
}

TransactionSchema.statics.earningByMaterialInDuration = function (matId, filters, callback) {
    if (!mongoose.isValidObjectId(matId)) return callback({ custom: 'Invalid Id', status: 400 });

    const end = luxon.DateTime.utc().endOf('day');
    let duration = luxon.Duration.fromObject({ days: 20 });

    if (_.isString(filters.period)) {
        const period = _.toLower(filters.period).trim();
        if (period == 'month') {
            duration = luxon.Duration.fromObject({ days: 29 });
        }
    }

    const start = end.minus(duration).startOf('day');

    this.model(COLLECTION).aggregate([
        {
            $match: {
                material: mongoose.Types.ObjectId(matId),
                kind: settings.INVOICE_TYPES.PURCHASE,
                created_at: {
                    $gte: start,
                    $lte: end,
                }
            }
        },
        {
            $group: {
                _id: {
                    day: { $dayOfMonth: "$created_at" },
                    month: { $month: "$created_at" },
                    year: { $year: "$created_at" }
                },
                total_earnings: { $sum: "$amount" },
                total_sells: { $sum: 1 },
            }
        }
    ]).exec(callback);
}

TransactionSchema.statics.earningsByProviderBnDays = function (provider, filters = {}, callback) {
    if (!mongoose.isValidObjectId(provider)) return callback({ custom: 'Invalid Id', status: 400 });

    let start = luxon.DateTime.fromISO(filters.startDate);
    let end = luxon.DateTime.fromISO(filters.endDate);

    if (_.isNaN(start.valueOf()) || _.isNaN(end.valueOf())) {
        end = luxon.DateTime.utc().endOf('day');
        start = end.minus(luxon.Duration.fromObject({ days: 7 })).startOf('day');
    }

    if (start.valueOf() > end.valueOf()) {
        return callback({ custom: 'startDate cannot be greater than endDate', status: 400 });
    }

    const query = {
        provider: provider,
        kind: settings.INVOICE_TYPES.PURCHASE,
        created_at: {
            $gte: start,
            $lte: end,
        }
    }
    this.model(COLLECTION)
        .find(query)
        .sort({ created_at: 1 })
        .populate('material', { title: 1, subtitle: 1, _id: 1, price: 1 })
        .lean()
        .exec((err, transactions) => {
            if (err) return callback(err);
            const perDay = {};

            transactions.map((each) => {
                let date = luxon.DateTime.fromJSDate(each.created_at);
                each.dateKey = `${date.year}-${date.month}-${date.day}`;
                return each;
            }).forEach(each => {
                let key = each.dateKey;
                let _id = each.material._id.toHexString();

                if (!perDay[key]) perDay[key] = {};
                if (!perDay[key][_id]) perDay[key][_id] = [];

                perDay[key][_id].push(each);
            });

            const response = [];
            for (let date of Object.keys(perDay)) {
                let aDaysTransactions = [];
                for (let matId of Object.keys(perDay[date])) {
                    let material = {
                        title: '',
                        subtitle: '',
                        _id: '',
                        earning: 0,
                        number_of_items_sold: 0,
                        price: null,
                    };
                    let transactions = perDay[date][matId];
                    for (trans of transactions) {
                        material.earning += trans.amount;
                        material.title = trans.material.title;
                        material.subtitle = trans.material.subtitle;
                        material._id = trans.material._id;
                        material.number_of_items_sold++;
                        material.price = trans.material.price;
                    }
                    aDaysTransactions.push(material);
                }
                response.push({
                    day_label: date,
                    earnings: aDaysTransactions,
                });
            }

            return callback(null, response);
        });
}

TransactionSchema.statics.getProviderTransactions = function (provider, filters, callback) {
    if (!mongoose.isValidObjectId(provider)) return callback({ custom: 'Invalid Id', status: 400 });

    let start = luxon.DateTime.fromISO(filters.startDate);
    let end = luxon.DateTime.fromISO(filters.endDate);

    if (_.isNaN(start.valueOf()) || _.isNaN(end.valueOf())) {
        end = luxon.DateTime.utc().endOf('day');
        start = end.minus(luxon.Duration.fromObject({ days: 10 })).startOf('day');
    }

    if (start.valueOf() > end.valueOf()) {
        return callback({ custom: 'startDate cannot be greater than endDate', status: 400 });
    }

    const query = {
        provider: provider,
        // created_at: {
        //     $gte: start,
        //     $lte: end,
        // }
    }

    this.model(COLLECTION)
        .find(query)
        .sort({ created_at: -1 })
        .populate('material', { title: 1, subtitle: 1, _id: 1 })
        .lean()
        .exec(callback);
}

module.exports = mongoose.model(COLLECTION, TransactionSchema);
