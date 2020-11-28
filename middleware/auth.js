const AdminSchema = require('../models/users/admin');
const ProviderSchema = require('../models/users/provider');
const ReaderSchema = require('../models/users/reader');

const jwt = require('../auth/jwt');
const _ = require('lodash');
const { failure } = require('../helpers/response');

const middleware = {};

middleware.authenticateUser = function (req, res, next) {
    const authorization = req.headers['authorization'];
    if (!_.isString(authorization)) {
        return failure(res, 'unauthorized', 401);
    }

    const [__, token] = authorization.trim().split(' ');
    const secret = process.env.ENCR_SECRET;
    jwt.verifyToken(token, secret, (err, decoded) => {
        if (err) {
            logger.err(err);
            return failure(res, 'unauthorized', 401);
        }

        const { userId, role, sessionId } = decoded;
        let schema;
        if (role == 'admin') schema = AdminSchema;
        else if (role == 'provider') schema = ProviderSchema;
        else if (role == 'reader') schema = ReaderSchema;
        else return failure(res, 'Unauthorized', 401);

        schema.findOne({ 'auth.tokens': sessionId }, (err, user) => {
            if (err) {
                logger.error(err);
                return failure(res, 'Internal Error', 500);
            }
            if (!user) return failure(res, 'unauthorized', 401);

            req.user = user;
            req.user.role = role;
            return next();
        });
    });
}

module.exports = middleware;