const mongoose = require('mongoose');
const AdminSchema = require('../models/users/admin');

const logger = global.logger;

const dbCtrl = {};

dbCtrl.init = function (url, callback) {
    mongoose.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false,

    }, (err) => {
        if (err) {
            logger.error(err);
            return callback(err);
        }

        logger.info('connected to db');
        return callback();
    });
}

dbCtrl.createDefaultAdmin = function (callback) {
    const defaultAdmin = new AdminSchema({
        firstname: 'tewodros',
        lastname: 'dagnen',
        email: 'admin@atrons.com',
        avatar_url: '/media/default_admin.png',
        auth: {
            password: 'password'
        }
    });

    defaultAdmin.save((err, result) => {
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
    })
}

module.exports = dbCtrl;
