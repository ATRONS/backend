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


ctrl.login = async function (req, res, next, secret, Schema) {
    const required = ['email', 'password'];

    for (let key of required) {
        if (!req.body[key]) {
            return failure(res, `${key} required`);
        }
    }
    let email = req.body.email;
    let password = req.body.password;

    email = email.trim().toLowerCase();
    password = password.trim();

    Schema.findOne({ email }, async (err, user) => {
        if (err) {
            if (err.errors) return failure(res, err);
            return failure(res, 'Internal Error', 500);
        }
        if (!user) return failure(res, 'Account not found', 404);

        const passwordCorrect = user.isPasswordCorrect(password);
        if (!passwordCorrect) return failure(res, 'Password incorrect');

        const token = await jwtCtrl.createToken({ userId: user._id }, secret);
        if (!token) return failure(res, 'Internal Error', 500);

        user.addSessionId(token.sessionId);
        user.save((err, result) => {
            if (err) return failure(res, 'Internal Error', 500);

            const response = {
                userInfo: result,
                token: token.token,
            };

            result.password = undefined;
            result.tokens = undefined;
            result.__v = undefined;

            success(res, response);
        });
    });
}

ctrl.logout = async function (req, res, next) {
    req.user.tokens = [];
    req.user.save((err, _) => {
        if (err) return failure(res, 'Internal Error', 500);
        success(res, { message: 'successfully logged out' });
    });
}

ctrl.verifyEmail = function (req, res, next) {
    let verification_code = req.query.code;
    let usertype = req.query.usertype;

    if (!_.isString(verification_code) ||
        !_.isString(usertype)) {
        return failure(res, 'forbidden', 403);
    }

    const usertypes = {
        "employer": { Schema: EmployerSchema },
        "worker": { Schema: WorkerSchema }
    };
    const type = usertypes[usertype.trim().toLowerCase()]
    if (!type) return failure(res, 'missing data', 400);

    verification_code = verification_code.trim();
    const now = luxon.DateTime.utc().valueOf();
    type.Schema.updateOne(
        {
            email_verification_code: verification_code,
            'signup.email_verified': false,
            email_verification_deadline: { $gt: now },
        },
        {
            $set: {
                'signup.email_verified': true,
                email_verification_code: '',
                email_verification_deadline: 0,
            }
        }, (err, rawResult) => {
            if (err) return failure(res, 'Internal Error', 500);
            if (!rawResult.nModified) return failure(res, 'Not found', 404);
            success(res, { message: 'email verified' });
        });

}

ctrl.resendVerificationEmail = function (req, res, next) {
    const now = luxon.DateTime.utc();
    const inFifteenMinutes = now.plus(luxon.Duration.fromObject({ minutes: 15 }));

    req.user.email_verification_code = jwtCtrl.getRandomBytes();
    req.user.email_verification_deadline = inFifteenMinutes.valueOf();

    req.user.save((err, _) => {
        if (err) return failure(res, 'Internal Error', 500);

        const usertype = result.credit ? 'employer' : 'worker';
        let url = 'http://ec2-3-126-51-124.eu-central-1.compute.amazonaws.com/api/v1/verifyEmail?';
        url += `usertype=${usertype}&code=${req.user.email_verification_code}`;

        const response = { verifyEmailUrl: url };
        success(res, response);
        emailer.sendVerifyEmail(req.user.email, url);
    });
}

module.exports = ctrl;