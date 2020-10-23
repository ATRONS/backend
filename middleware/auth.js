const AdminSchema = require('../models/users/admin');
const ProviderSchema = require('../models/users/provider');
const ReaderSchema = require('../models/users/reader');

const jwt = require('../auth/jwt');
const _ = require('lodash');
const { failure } = require('../helpers/response');

const logger = global.logger;

const genericAuth = function (req, res, next, secret, schema) {
    const authorization = req.headers['authorization'];
    if (!_.isString(authorization)) {
        return failure(res, 'unauthorized', 401);
    }

    const [__, token] = authorization.trim().split(' ');
    jwt.verifyToken(token, secret, (err, decoded) => {
        if (err) {
            logger.err(err);
            return failure(res, 'unauthorized', 401);
        }

        const { userId, sessionId } = decoded;

        schema.findOne({ 'auth.tokens': sessionId }, (err, user) => {
            if (err) {
                logger.error(err);
                return failure(res, 'Internal Error', 500);
            }
            if (!user) return failure(res, 'unauthorized', 401);

            req.user = user;
            return next();
        });
    });
}

const middleware = {};

middleware.authenticateAdmin = async function (req, res, next) {
    const secret = process.env.ENCR_SECRET_ADMIN;
    genericAuth(req, res, next, secret, AdminSchema);
}

middleware.authenticateProvider = async function (req, res, next) {
    const secret = process.env.ENCR_SECRET_PROVIDER;
    genericAuth(req, res, next, secret, ProviderSchema);
}

middleware.authenticateReader = async function (req, res, next) {
    const secret = process.env.ENCR_SECRET_READER;
    genericAuth(req, res, next, secret, ReaderSchema);
}

module.exports = middleware;