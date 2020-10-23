const AdminSchema = require('../models/users/admin');
const ProviderSchema = require('../models/users/provider');
const ReaderSchema = require('../models/users/reader');

const jwtCtrl = require('../auth/jwt');
const luxon = require('luxon');
const emailer = require('../emailer/emailer');
const _ = require('lodash');
const {
    success,
    failure,
} = require('../helpers/response');

const logger = global.logger;

const ctrl = {};

ctrl.login = function (req, res, next, secret, Schema) {
    const required = ['email', 'password'];

    for (let key of required) {
        if (!req.body[key] || !_.isString(req.body[key])) {
            return failure(res, `${key} required`);
        }
    }

    const email = req.body.email.trim().toLowerCase();
    const password = req.body.password.trim();

    Schema.findOne({ email }, async (err, user) => {
        if (err) {
            if (err.errors) return failure(res, err);
            logger.error(err);
            return failure(res, 'Internal Error', 500);
        }
        if (!user) return failure(res, 'Account not found', 404);

        const passwordCorrect = user.isPasswordCorrect(password);
        if (!passwordCorrect) return failure(res, 'Password incorrect');

        jwtCtrl.createToken({ userId: user._id }, secret, (err, token) => {
            if (err) {
                logger.error(err);
                return failure(res, 'Internal Error', 500);
            }

            user.addSessionId(token.sessionId);
            user.save((err, result) => {
                if (err) return failure(res, 'Internal Error', 500);

                const response = { token: token.token };
                success(res, response);
            });
        });

    });
}

ctrl.logout = async function (req, res, next) {
    req.user.auth.tokens = [];
    req.user.save((err, _) => {
        if (err) {
            logger.error(err);
            return failure(res, 'Internal Error', 500);
        }
        success(res, { message: 'successfully logged out' });
    });
}

// not checked yet.
ctrl.verifyEmail = function (req, res, next) {
    let verification_code = req.query.code;
    let usertype = req.query.usertype;

    if (!_.isString(verification_code) ||
        !_.isString(usertype)) {
        return failure(res, 'forbidden', 403);
    }

    const usertypes = {
        "admin": AdminSchema,
        "provider": ProviderSchema,
        "reader": ReaderSchema,
    };

    const Schema = usertypes[usertype.trim().toLowerCase()]
    if (!Schema) return failure(res, 'missing data', 400);

    verification_code = verification_code.trim();
    const now = luxon.DateTime.utc().valueOf();
    Schema.updateOne(
        {
            'auth.verify_email_hash': verification_code,
            'auth.vefity_email_expire': { $gt: now },
        },
        {
            $set: {
                'auth.verified': true,
                'auth.verify_email_hash': '',
                'auth.verify_email_expire': 0,
            }
        }, (err, rawResult) => {
            if (err) return failure(res, 'Internal Error', 500);
            if (!rawResult.nModified) return failure(res, 'Not found', 404);
            success(res, { message: 'email verified' });
        });

}

// not implemented yet.
ctrl.resendVerificationEmail = function (req, res, next) {
    const now = luxon.DateTime.utc();
    const inFifteenMinutes = now.plus(luxon.Duration.fromObject({ minutes: 15 }));

    req.user.auth.verify_email_hash = jwtCtrl.getRandomBytes();
    req.user.auth.verigy_email_expire = inFifteenMinutes.valueOf();

    req.user.save((err, _) => {
        if (err) {
            logger.error(err);
            return failure(res, 'Internal Error', 500);
        }

        const usertype = ''; // determine usertype
        let url = 'http://localhost:5000/api/v1/verifyEmail?';
        url += `usertype=${usertype}&code=${req.user.email_verification_code}`;

        const response = { verifyEmailUrl: url };
        success(res, response);
        emailer.sendVerifyEmail(req.user.email, url);
    });
}

module.exports = ctrl;