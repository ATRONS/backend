const config = require('dotenv').config();
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

const db = require('./database/db');
const populate = require('./defaults/populate');

async.series([
    function (callback) {
        const url = process.env.MONGO_URL;
        db.init(url, callback);
    },
    populate.createAtronsAccount,
    populate.createDefaultAdmin,
    populate.populateTags,
], function (err, results) {
    if (err) return logger.error(err);
    startServer();
});

function startServer() {
    const express = require('express');
    const morgan = require('morgan');
    const cors = require('cors');
    const app = express();
    const server = require('http').createServer(app);
    const port = process.env.PORT || 5000;

    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(morgan('dev'));

    const router = require('./routes');
    app.use('/api/v1', router);

    app.use((err, req, res, next) => {
        if (!err) return res.status(404).end('Not found');
        if (err.name === 'MulterError') {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).end('file too big');
            }
            return res.status(400).end('Bad Request');
        }
        logger.error(err);
        console.log(err);
        return res.status(500).end('Internal Error');
    });

    server.listen(port, '0.0.0.0', () => {
        logger.info('server listening on port ' + port);
    });

    server.on('error', (err) => {
        logger.error(err);
        server.close();
    });
}