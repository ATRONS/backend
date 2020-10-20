const ctrl = {};

ctrl.login = (req, res, next) => res.end('login');
ctrl.logout = (req, res, next) => res.end('logout');

module.exports = ctrl;