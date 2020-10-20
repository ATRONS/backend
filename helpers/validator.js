const _ = require('lodash');

const validator = {};

validator.isEmail = function (value) {
    if (!_.isString(value)) return false;

    const re = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$/;
    return re.test(value.trim().toLowerCase());
}

module.exports = validator;