const adminCtrl = require('../controllers/admin');
const providerCtrl = require('../controllers/provider');
const readerCtrl = require('../controllers/reader');

const authMiddleware = require('../middleware/auth');

const router = require('express').Router();

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
    authMiddleware.authenticateReader,
    readerCtrl.logout);

router.post(
    readerBase + '/forgotPassword',
    readerCtrl.forgotPassword);

router.get(
    readerBase + '/initialData',
    authMiddleware.authenticateReader,
    readerCtrl.initialData);

router.put(
    readerBase + '/profile',
    authMiddleware.authenticateReader,
    readerCtrl.updateProfile);

// ------------------------- provider area --------------------------
const providerBase = '/provider';
router.post(
    providerBase + '/login',
    providerCtrl.login);

router.post(
    providerBase + '/logout',
    authMiddleware.authenticateProvider,
    providerCtrl.logout);

router.post(
    providerBase + '/forgotPassword',
    providerCtrl.forgotPassword);

router.get(
    providerBase + '/initialData',
    authMiddleware.authenticateProvider,
    providerCtrl.initialData);

router.put(
    providerBase + '/profile',
    authMiddleware.authenticateProvider,
    providerCtrl.updateProfile);

// ------------------------- admin area -----------------------------
const adminBase = '/admin';
router.post(
    adminBase + '/login',
    adminCtrl.login);

router.post(
    adminBase + '/logout',
    authMiddleware.authenticateAdmin,
    adminCtrl.logout);

router.post(
    adminBase + '/forgotPassword',
    adminCtrl.forgotPassword);

router.get(
    adminBase + '/initialData',
    authMiddleware.authenticateAdmin,
    adminCtrl.initialData);

router.put(
    adminBase + '/profile',
    authMiddleware.authenticateAdmin,
    adminCtrl.updateProfile);

router.post(
    adminBase + '/users/provider',
    authMiddleware.authenticateAdmin,
    adminCtrl.createProvider);

module.exports = router;
