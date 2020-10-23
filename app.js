const config = require('dotenv').config();
const db = require('./database/db');
const winston = require('winston');
const async = require('async');

const logger = winston.createLogger({
    transports: [
        new winston.transports.File({
            filename: 'logs/info.log',
            level: 'info',
        }),
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
        })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({ level: 'debug' }));
    logger.add(new winston.transports.Console({ level: 'info' }));
    logger.add(new winston.transports.Console({ level: 'error' }));
}

global.logger = logger;
global.env = process.env.NODE_ENV || 'development';

async.series([
    function (callback) {
        const url = process.env.MONGO_URL;
        db.init(url, callback);
    }
], function (err, results) {
    if (err) return logger.error(err);
    startServer();
});

function startServer() {
    const express = require('express');
    const morgan = require('morgan');
    const app = express();
    const server = require('http').createServer(app);
    const port = process.env.PORT || 5000;

    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(morgan('dev'));

    const router = require('./routes');
    app.use('/api/v1', router);

    app.use((err, req, res, next) => {
        res.status(404).end('Not found');
    });

    server.listen(port, '0.0.0.0', () => {
        logger.info('server listening on port ' + port);
    });
}