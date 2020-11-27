const mongoose = require('mongoose');
const luxon = require('luxon');

const COLLECTION = 'transactions';
const LIMIT = 10;

const TransactionSchema = mongoose.Schema({
    reader: { type: mongoose.Types.ObjectId, required: true, index: true },
    provider: { type: mongoose.Types.ObjectId, required: true, index: true },
    material: { type: mongoose.Types.ObjectId, required: true, index: true },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
    payer: { type: String, required: true, index: true },
    receiver: { type: String, required: true },
    date: { type: Date, required: true, index: true },
    expires: { type: Date, required: true },

    invoice_id: { type: String, required: true, index: true },
    invoice_code: { type: String },
    transaction_id: { type: String, sparse: true },
    transaction_fee: { type: Number, default: 0 },
    status: { type: String, required: true },

    // the invoice object as received from the payment service
    invoice_dump: { type: mongoose.Schema.Types.Mixed, required: true },
    transaction_dump: { type: mongoose.Schema.Types.Mixed },
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

module.exports = mongoose.model(COLLECTION, TransactionSchema);
