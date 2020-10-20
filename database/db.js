const mongoose = require('mongoose');

const dbCtrl = {};

dbCtrl.init = function (url, callback) {
    mongoose.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false,

    }, (err) => {
        if (err) return callback(err);
        return callback();
    });
}

module.exports = dbCtrl;
