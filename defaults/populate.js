const fs = require('fs');
const path = require('path');
const AdminSchema = require('../models/users/admin');
const TagSchema = require('../models/tag');

const ctrl = {};

ctrl.populateTags = function (callback) {
    const tags = require('./tags.json');

    TagSchema.insertMany(tags, (err, created) => {
        if (err) {
            if (err.code == 11000) {
                logger.info('tags already created');
                return callback(null, null);
            }
            return callback(err, null);
        }
        return callback(null, null);
    });
}

ctrl.createDefaultAdmin = function (callback) {
    const adminInfo = require('./users.json').admin;

    (new AdminSchema({
        firstname: adminInfo.firstname,
        lastname: adminInfo.lastname,
        email: adminInfo.email,
        avatar_url: adminInfo.avatar_url,
        auth: {
            password: adminInfo.password,
        }
    })).save((err, result) => {
        if (err) {
            if (err.code) {
                logger.info('admin already created');
                return callback(null, null);
            }

            logger.error(err);
            return callback(err, null);
        }

        logger.info('default admin created');
        return callback(null, null);
    });
}

module.exports = ctrl;