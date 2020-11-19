const mongoose = require('mongoose');
const luxon = require('luxon');
const { listenerCount } = require('multer-gridfs-storage');

const COLLECTION = 'transactions';

const TransactionSchema = mongoose.Schema({
    reader: { type: mongoose.Types.ObjectId, },
    provider: { type: mongoose.Types.ObjectId, required: true, index: true },
    material: { type: mongoose.Types.ObjectId, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        currentTime: () => luxon.DateTime.utc().valueOf()
    }
});

TransactionSchema.index({ created_at: 1 });

TransactionSchema.statics.getSellsReportByProvider = function (provider, lastXDays, callback) {
    const today = luxon.DateTime.utc().startOf("day");
    const xdaysAgo = today.minus(luxon.Duration.fromObject({ days: lastXDays }));

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
        .exec(callback);
}

TransactionSchema.statics.getBestSellersByProvider = function (provider, callback) {
    return callback(null, { dummy: { provider: provider, data: 'haha' } });
}

module.exports = mongoose.model(COLLECTION, TransactionSchema);
