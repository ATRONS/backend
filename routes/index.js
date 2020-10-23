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
    readerCtrl.signup);

router.post(
    readerBase + '/login',
    readerCtrl.login);

router.post(
    readerBase + '/logout',
    readerCtrl.logout);

router.post(
    readerBase + '/forgotPassword',
    readerCtrl.forgotPassword);

router.put(
    readerBase + '/profile',
    readerCtrl.updateProfile);

// ------------------------- provider area --------------------------
const providerBase = '/provider';

// ------------------------- admin area -----------------------------
const adminBase = '/admin';

module.exports = router;
