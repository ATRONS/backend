const HELLOCASH_BASEURL = 'https://api-et.hellocash.net';

module.exports = {
    HELLOCASH: {
        BASEURL: HELLOCASH_BASEURL,
        AUTNENTICATE: HELLOCASH_BASEURL + '/authenticate',
        INVOICE: HELLOCASH_BASEURL + '/invoices',
        TRANSFER: HELLOCASH_BASEURL + '/transfers',
        AUTHORIZE: HELLOCASH_BASEURL + '/authorize',
    }
};