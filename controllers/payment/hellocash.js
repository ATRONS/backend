const urls = require('../../helpers/constants/url');
const InvoiceSchema = require('../../models/invoice');
const TransactionSchema = require('../../models/transaction');
const ProviderSchema = require('../../models/users/provider');
const AtronsSchema = require('../../models/atrons');

const crypto = require('crypto');
const axios = require('axios');
const asyncLib = require('async');
const settings = require('../../defaults/settings');

const ctrl = {};

ctrl.getCredentials = function () {
    return {
        principal: process.env.HELLOCASH_PRINCIPAL,
        credentials: process.env.HELLOCASH_CREDENTIALS,
        system: process.env.HELLOCASH_SYSTEM,
    };
}

ctrl.getBearerToken = function () {
    return 'Bearer ' + process.env.HELLOCASH_TOKEN;
}

ctrl.createInvoice = function (invoiceInfo, callback) {
    const url = urls.HELLOCASH.INVOICE;
    const config = {
        headers: {
            Authorization: ctrl.getBearerToken(),
        }
    };

    axios.post(url, invoiceInfo, config)
        .then(res => res.data)
        .then(data => callback(null, data))
        .catch(err => callback(err));
}

ctrl.webHook = function (req, res, next) {
    res.end(); // won't be sending back any data.

    const payload = req.body;
    // const hmac = crypto.createHmac('sha256', Buffer.from(process.env.HELLOCASH_CONNECTION_SECRET));
    // const hmacHex = hmac.update(JSON.stringify(payload)).digest('hex');
    // const hmacIsCorrect = req.headers['X-Api-Hmac'] === hmacHex;

    // logger.info(payload);

    // if (!hmacIsCorrect) {
    //     logger.warning('hmac incorrect, possible hack');
    //     return;
    // }

    const { tracenumber, status } = payload;
    if (status !== 'PROCESSED') {
        logger.info(`invoice with tracenumber ${tracenumber} sent status ${status}`);
        return;
    }

    const invoiceUpdates = {
        transaction_fee: payload.fee,
        transaction_id: payload.id,
        status: payload.status,
        transaction_dump: payload,
    };

    InvoiceSchema.updateByTracenumber(tracenumber, invoiceUpdates, (err, updatedInvoice) => {
        if (err) {
            logger.error(err);
            logger.error('Invoice update failed, tracenumber: ' + tracenumber);
            return;
        }

        const tasks = [];

        // this adds a PURCHASE or WITHDRAWAL transaction
        if (updatedInvoice.kind === settings.INVOICE_TYPES.PURCHASE) {
            const taxShare = updatedInvoice.amount * settings.TAX_FEE_PERCENT;
            const atronsShare = updatedInvoice.amount * settings.ATRONS_SERVICE_FEE_PERCENT;
            const providerShare = updatedInvoice.amount - (atronsShare + taxShare);

            // update providers balance
            tasks.push(function (callback) {
                ProviderSchema.addBalance(updatedInvoice.provider, providerShare, callback);
            });

            // update companies balance and tax amount
            tasks.push(function (callback) {
                AtronsSchema.addBalanceAndTaxAmount(atronsShare, taxShare, callback);
            });

            // add PURCHASE transaction
            tasks.push(function (callback) {
                const transactionInfo = {
                    kind: updatedInvoice.kind,
                    reader: updatedInvoice.reader,
                    provider: updatedInvoice.provider,
                    material: updatedInvoice.material,
                    amount: updatedInvoice.amount,
                    tracenumber: updatedInvoice.tracenumber,
                    transaction_fee: updatedInvoice.transaction_fee,
                    description: 'Purchase for ' + updatedInvoice.material.title + ' ' + updatedInvoice.subtitle,
                };
                TransactionSchema.createTransaction(transactionInfo, callback);
            });

            // record SERVICE_FEE transaction
            tasks.push(function (callback) {
                const transactionInfo = {
                    kind: settings.INVOICE_TYPES.SERVICE_FEE,
                    amount: atronsShare,
                    tracenumber: updatedInvoice.tracenumber,
                    description: 'Service fee for ' + updatedInvoice.transaction_id,
                };
                TransactionSchema.createTransaction(transactionInfo, callback);
            });

            // record TAX_FEE transaction
            tasks.push(function (callback) {
                const transactionInfo = {
                    kind: settings.INVOICE_TYPES.TAX_FEE,
                    amount: taxShare,
                    tracenumber: updatedInvoice.tracenumber,
                    description: 'Tax fee for ' + updatedInvoice.transaction_id,
                };
                TransactionSchema.createTransaction(transactionInfo, callback);
            });
        }

        asyncLib.parallel(tasks, (err, results) => {
            if (err) {
                logger.error(err);
                logger.error('Transaction processing failed, tracenumber: ' + tracenumber);
                return;
            }

            logger.debug('transaction processing completed, tracenumber: ' + tracenumber);
        });
    });
}

module.exports = ctrl;