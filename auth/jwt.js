const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ctrl = {};

ctrl.getRandomBytes = function () {
    return crypto.randomBytes(24).toString('hex');
}

ctrl.createToken = function (payload, secret) {
    payload.sessionId = this.getRandomBytes();

    return new Promise((resolve, _) => {
        jwt.sign(payload, secret, (err, token) => {
            if (err) {
                resolve(false);
            }
            else resolve({
                token: `Bearer ${token}`,
                sessionId: payload.sessionId,
            });
        });
    });
}

ctrl.verifyToken = function (token, secret) {
    return new Promise((resolve, _) => {
        jwt.verify(token, secret, (err, decoded) => {
            if (err) {
                resolve(false);
            }
            else resolve(decoded);
        });
    });
}

module.exports = ctrl;
