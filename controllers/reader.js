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

ctrl.signup = function (req, res, next) {
    const now = luxon.DateTime.utc();
    const inFifteenMinutes = now.plus(luxon.Duration.fromObject({ minutes: 15 }));

    const user = new ReaderSchema({
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email,
        gender: req.body.gender,
        auth: {
            password: req.body.password,
            verify_email_hash: jwtCtrl.getRandomBytes(),
            verify_email_expire: inFifteenMinutes.valueOf(),
        },
        preferences: req.body.preferences,
    });

    const secret = process.env.ENCR_SECRET_READER;
    jwtCtrl.createToken({ userId: user._id }, secret, (err, token) => {
        if (err) {
            logger.error('token generation failed');
            return failure(res, 'Internal error', 500);
        }

        user.addSessionId(token.sessionId);
        user.save((err, savedUser) => {
            console.log(err);
            if (err) {
                if (err.message || err.errors) return failure(res, err, 400);
                else if (err.driver) return failure(res, 'Email already taken');

                logger.error(err);
                return failure(res, 'Internal Error', 500);
            }
            success(res, savedUser);
        });

    });
}

ctrl.login = function (req, res, next) { res.end('reader login') }

ctrl.logout = function (req, res, next) { res.end('reader logout') }

ctrl.forgotPassword = function (req, res, next) { res.end('reader forgot password') }

ctrl.updateProfile = function (req, res, next) { res.end('reader update profile') }

module.exports = ctrl;