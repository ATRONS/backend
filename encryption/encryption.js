const crypto = require('crypto');
const { pipeline } = require('stream');

const algorithm = 'aes-256-cbc';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

ctrl = {};

ctrl.generateEncrKeyAndIV = function () {
    return {
        key: crypto.randomBytes(KEY_LENGTH),
        iv: crypto.randomBytes(IV_LENGTH),
    }
}

ctrl.encryptAndPipe = function (input, output, keyIV, errCallback) {
    const encrypt = crypto.createCipheriv(algorithm, keyIV.key, keyIV.iv);
    return pipeline(input, encrypt, output, errCallback);
}

module.exports = ctrl;