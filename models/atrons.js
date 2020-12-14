const mongoose = require('mongoose');
const luxon = require('luxon');

const COLLECTION = 'atrons.company';

const AtronsSchema = mongoose.Schema({
    name: { type: String, required: true, unique: true },
    balance: { type: Number, default: 0, min: 0 },
    total_balance: { type: Number, default: 0, min: 0 },
    pending_tax: { type: Number, default: 0, min: 0 },
    total_tax: { type: Number, default: 0, min: 0 },
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        currentTime: () => luxon.DateTime.utc().valueOf()
    }
});

AtronsSchema.statics.getCompany = function (callback) {
    this.model(COLLECTION).findOne({}).exec(callback);
}

AtronsSchema.statics.addBalanceAndTaxAmount = function (balance, tax, callback) {
    if (!_.isFinite(Number(balance)) || !_.isFinite(Number(tax))) {
        return callback({ custom: 'Invalid balance or tax', custom: 400 });
    }
    if (Number(balance) < 0 || Number(tax) < 0) {
        return callback({ custom: 'Balance or tax can not be negative', custom: 400 });
    }

    this.model(COLLECTION).updateOne(
        {},
        {
            $inc: {
                balance: Number(balance),
                total_balance: Number(balance),
                pending_tax: Number(tax),
            }
        }).exec(callback);
}

module.exports = mongoose.model(COLLECTION, AtronsSchema);