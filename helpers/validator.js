const _ = require('lodash');

const validator = {};

validator.isEmail = function (value) {
    if (!_.isString(value)) return false;

    const re = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$/;
    return re.test(value.trim().toLowerCase());
}

validator.isPhoneNumber = function (phone) {
    if (!_.isString(phone)) return false;
    const international = /^\+2519[0-9]{8}$/;
    const local = /^09[0-9]{8}/;
    return international.test(phone.trim()) || local.test(phone.trim());
}

module.exports = validator;