const response = {};
const logger = global.logger;

response.success = function (res, data, status = 200) {
    res.status(status).json({ success: true, data });
}

response.failure = function (res, message, status = 400) {
    res.status(status).json({ success: false, message });
}

response.errorResponse = function (err, res) {
    if (err.code) return response.failure(res, 'Duplicate key error');
    if (err.errors) return response.failure(res, err);
    if (err.custom) return response.failure(res, err.custom, err.status);
    logger.error(err);
    return response.failure(res, 'Internal Error', 500);
}

response.defaultHandler = function (res) {
    return function (err, result) {
        if (err) return response.errorResponse(err, res);
        if (!res) return response.failure(res, 'Not found', 404);
        return response.success(res, result);
    }
}

module.exports = response;
