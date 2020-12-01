const mongoose = require('mongoose');
const _ = require('lodash');
const luxon = require('luxon');

const COLLECTION = 'transactions';
const LIMIT = 10;

const TransactionSchema = mongoose.Schema({
    reader: { type: mongoose.Types.ObjectId, required: true, ref: 'readers', index: true },
    provider: { type: mongoose.Types.ObjectId, required: true, ref: 'providers', index: true },
    material: { type: mongoose.Types.ObjectId, required: true, ref: 'materials', index: true },

    amount: { type: Number, required: true, min: 0 },
    transaction_fee: { type: Number, default: 0 },
    currency: { type: String, required: true },
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        currentTime: () => luxon.DateTime.utc().valueOf()
    }
});

TransactionSchema.index({ created_at: 1 });

TransactionSchema.statics.getSellsReportByProvider = function (provider, lastXDays, callback) {
    const today = luxon.DateTime.utc().endOf("day");
    const xdaysAgo = today
        .minus(luxon.Duration.fromObject({ days: 6 }))
        .startOf("day");

    this.model(COLLECTION)
        .aggregate([
            {
                $match: {
                    provider: mongoose.Types.ObjectId(provider),
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
                    total_transactions: { $sum: 1 }
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
                        total_transactions: 0
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
    this.model(COLLECTION).aggregate([
        {
            $match: {
                provider: mongoose.Types.ObjectId(provider),
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
    this.model(COLLECTION).aggregate([
        {
            $match: {
                provider: mongoose.Types.ObjectId(provider),
            }
        },
        {
            $group: {
                _id: "$provider",
                sells_amount: { $sum: "$amount" },
                sells_count: { $sum: 1 },
            }
        },
        { $sort: { _id: -1, }, },
    ]).exec(callback);
}

TransactionSchema.statics.earningsByMaterials = function (matIds, callback) {
    this.model(COLLECTION).aggregate([
        {
            $match: {
                material: { $in: matIds },
            }
        },
        {
            $group: {
                _id: "$material",
                amount: { $sum: "$amount" },
                count: { $sum: 1 },
            }
        },
        { $sort: { _id: -1, }, },
    ]).exec(callback);
}

TransactionSchema.statics.earningByMaterial = function (matId, callback) {
    this.model(COLLECTION).aggregate([
        {
            $match: { material: mongoose.Types.ObjectId(matId) }
        },
        {
            $group: {
                _id: "$material",
                total_earnings: { $sum: "$amount" },
                total_sells: { $sum: 1 },
            }
        }
    ]).exec(callback);
}

TransactionSchema.statics.earningsByProviderBnDays = function (provider, filters, callback) {
    if (!_.isString(filters.startDate) || !_.isString(filters.endDate)) {
        return callback({ custom: 'startDate and endDate query params required', status: 400 });
    }

    const start = luxon.DateTime.fromISO(filters.startDate);
    const end = luxon.DateTime.fromISO(filters.endDate);
    console.log(start.valueOf());
    console.log(end.valueOf());

    if (_.isNaN(start.valueOf()) || _.isNaN(end.valueOf())) {
        return callback({ custom: 'Invalid startDate or endDate', status: 400 });
    }

    if (start.valueOf() > end.valueOf()) {
        return callback({ custom: 'startDate cannot be greater than endDate', status: 400 });
    }

    const query = {
        provider: provider,
        created_at: {
            $gte: start,
            $lte: end,
        }
    }
    this.model(COLLECTION)
        .find(query)
        .sort({ createdAt: 1 })
        .populate('material', { title: 1, subtitle: 1, _id: 1 })
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
                    };
                    let transactions = perDay[date][matId];
                    for (trans of transactions) {
                        material.earning += trans.amount;
                        material.title = trans.material.title;
                        material.subtitle = trans.material.subtitle;
                        material._id = trans.material._id;
                        material.number_of_items_sold++;
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

module.exports = mongoose.model(COLLECTION, TransactionSchema);
