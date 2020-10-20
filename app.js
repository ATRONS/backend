const express = require('express');
const morgan = require('morgan');
const app = express();
const server = require('http').createServer(app);
const port = process.env.PORT || 5000;

app.use(morgan('dev'));

const router = require('./routes');
app.use('/api/v1', router);


app.use((err, req, res, next) => {
    res.status(404).end('Not found');
});

server.listen(port, '0.0.0.0', () => {
    console.log('server started...');
});