const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ctrl = {};

ctrl.getRandomBytes = function (length = 48) {
    return crypto.randomBytes(Math.floor(length / 2)).toString('hex');
}

ctrl.getRandom6DigitsString = function () {
    let string = '';
    for (let i = 0; i < 6; i++) {
        string += Number(Math.floor(Math.random() * 10000) % 10).toString();
    }
    return string;
}

ctrl.createToken = function (payload, secret, callback) {
    payload.sessionId = this.getRandomBytes();
    jwt.sign(payload, secret, (err, token) => {
        if (err) return callback('Token generation failed', null);
        callback(null, { token: `Bearer ${token}`, sessionId: payload.sessionId });
    });
}

ctrl.verifyToken = function (token, secret, callback) {
    jwt.verify(token, secret, callback);
}

module.exports = ctrl;
