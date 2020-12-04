const mongoose = require('mongoose');
const luxon = require('luxon');

const COLLECTION = 'invoices';
const LIMIT = 10;

const invoiceTypes = ['INCOMMING', 'OUTGOING'];

const InvoiceSchema = mongoose.Schema({
    reader: { type: mongoose.Types.ObjectId, required: true, index: true },
    provider: { type: mongoose.Types.ObjectId, required: true, index: true },
    material: { type: mongoose.Types.ObjectId, required: true, index: true },

    amount: { type: Number, required: true, min: 0 },
    payer: { type: String, required: true, index: true },
    receiver: { type: String, required: true },
    currency: { type: String, required: true },
    date: { type: Date, required: true, index: true },
    expires: { type: Date, required: true },

    invoice_id: { type: String, required: true, index: true },
    transaction_id: { type: String, sparse: true },
    transaction_fee: { type: Number, default: 0 },
    tracenumber: { type: String, required: true, index: true },
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

InvoiceSchema.statics.createInvoice = function (invoiceInfo, callback) {
    this.model(COLLECTION).create(invoiceInfo, callback);
}

InvoiceSchema.statics.findByTraceNumber = function (tracenumber, callback) {
    if (!_.isString(tracenumber)) return callback({ custom: 'Invalid tracenumber', status: 400 });
    this.model(COLLECTION).findOne({ tracenumber: tracenumber }).exec(callback);
}

module.exports = mongoose.model(COLLECTION, InvoiceSchema);