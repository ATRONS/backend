const response = {};

response.success = function (res, data, status = 200) {
    res.status(status).json({ success: true, data });
}

response.failure = function (res, message, status = 400) {
    res.status(status).json({ success: false, message });
}

module.exports = response;
