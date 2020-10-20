const adminCtrl = require('../controllers/admin');
const providerCtrl = require('../controllers/provider');
const readerCtrl = require('../controllers/reader');
const genericCtrl = require('../controllers/generic');

const router = require('express').Router();

// ------------------------ common area -----------------------------
router.post('/login', genericCtrl.login);
router.post('/logout', genericCtrl.logout);

// ------------------------ reader area -----------------------------
const readerBase = '/reader';
router.post(
    readerBase + '/signup',
    genericCtrl.signup);

// ------------------------- provider area --------------------------
const providerBase = '/provider';

// ------------------------- admin area -----------------------------
const adminBase = '/admin';

module.exports = router;
