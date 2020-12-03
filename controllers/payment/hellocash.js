const crypto = require('crypto');
const axios = require('axios');
const urls = require('../../helpers/constants/url');
const InvoiceSchema = require('../../models/invoice');
const TransactionSchema = require('../../models/transaction');

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
    const hmacHex = hmac.update(payload).digest('hex');
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

    InvoiceSchema.findByTraceNumber(tracenumber, (err, invoice) => {
        if (err) {
            logger.error('Invoice fetch failed for tracenumber ' + tracenumber);
            return;
        }
        if (!invoice) {
            logger.info('Invoice does not exist, tracenumber ' + tracenumber);
            return;
        }

        invoice.transaction_fee = payload.fee;
        invoice.transaction_id = payload.id;
        invoice.status = payload.status;
        invoice.save((err, savedInvoice) => {
            if (err) {
                logger.error('Invoice save failed, tracenumber ' + tracenumber);
                return;
            }

            logger.debug('invoice save successfull, tracenumber ' + tracenumber);

            const transaction = TransactionSchema({
                reader: savedInvoice.reader,
                provider: savedInvoice.provider,
                material: savedInvoice.material,
                amount: savedInvoice.amount,
                transaction_fee: savedInvoice.transaction_fee,
            });

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