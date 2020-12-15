const ctrl = {};

ctrl.fromLocalToInternational = function (phone) {
    if (phone.trim().startsWith('+251')) return phone.trim();
    else return phone.trim().replace(/^09/, '+2519');
}

module.exports = ctrl;