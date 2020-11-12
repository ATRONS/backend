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

module.exports = dbCtrl;
