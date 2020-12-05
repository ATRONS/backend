const urls = require('../../helpers/constants/url');
const InvoiceSchema = require('../../models/invoice');
const TransactionSchema = require('../../models/transaction');

const crypto = require('crypto');
const axios = require('axios');
const asyncLib = require('async');

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
    const hmac = crypto.createHmac('sha256', Buffer.from(process.env.HELLOCASH_CONNECTION_SECRET));
    const hmacHex = hmac.update(JSON.stringify(payload)).digest('hex');
    const hmacIsCorrect = req.headers['X-Api-Hmac'] === hmacHex;

    logger.info(payload);

    if (!hmacIsCorrect) {
        logger.warning('hmac incorrect, possible hack');
        return;
    }

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

    // save PURCHASE or WITHDRAWAL transaction
    // save 
    // things to do
    // - save a PURCHASE or WITHDRAWAL transaction
    // - save a SERVICE_FEE transaction for the PURCHASE or WITHDRAWAL
    // - update providers balance, also the companies balance.

    asyncLib.waterfall([
        function (callback) {
            InvoiceSchema.updateByTracenumber(tracenumber, invoiceUpdates, callback);
        },
        // function
        function (updatedInvoice, callback) {
            const transactionInfo = {
                kind: updatedInvoice.kind,
                reader: updatedInvoice.reader,
                provider: updatedInvoice.provider,
                material: updatedInvoice.material,
                amount: updatedInvoice.amount,
                tracenumber: updatedInvoice.tracenumber,
                transaction_fee: updatedInvoice.transaction_fee,
            }
            TransactionSchema.createTransaction(transactionInfo, callback);
        },
        function (transaction, callback) {
            return callback(null, transaction);
        }
    ], function (err, finalResult) {
        if (err) {
            logger.error(err);
            logger.error('Transaction processing failed, tracenumber: ' + tracenumber);
            return;
        }

        logger.info('Transaction processing successfull tracenumber: ' + tracenumber);
    });

    InvoiceSchema.findByTraceNumber(tracenumber, (err, invoice) => {
        if (err) {
            logger.error('Invoice fetch failed for tracenumber ' + tracenumber);
            return;
        }
        if (!invoice) {
            logger.error('Invoice does not exist, tracenumber ' + tracenumber);
            return;
        }

        invoice.transaction_fee = payload.fee;
        invoice.transaction_id = payload.id;
        invoice.status = payload.status;
        invoice.transaction_dump = payload;
        invoice.save((err, savedInvoice) => {
            if (err) {
                logger.error('Invoice save failed, tracenumber ' + tracenumber);
                return;
            }

            logger.debug('invoice save successfull, tracenumber ' + tracenumber);

            const transaction = TransactionSchema();

            transaction.save((err, savedTransaction) => {
                if (err) {
                    logger.error('transaction save failed for tracenumber ' + tracenumber);
                    return;
                }
                logger.debug('transaction save successfull, tracenumber ' + tracenumber);
            });
        });
    });
}

module.exports = ctrl;