const crypto = require('crypto');
const axios = require('axios');
const urls = require('../../helpers/constants/url');

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
    const payload = req.body;
    const hmac = crypto.createHmac('sha256', Buffer.from(process.env.HELLOCASH_CONNECTION_SECRET));
    const hmacHex = hmac.update(payload).digest('hex');
    const hmacIsCorrect = req.headers['X-Api-Hmac'] === hmacHex;

    loggers.info(payload);

    if (!hmacIsCorrect) {
        loggers.warning('hmac incorrect, possible hack');
        return res.end();
    }

    res.end();
}

module.exports = ctrl;