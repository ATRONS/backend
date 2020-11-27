const adminCtrl = require('../controllers/admin');
const providerCtrl = require('../controllers/provider');
const readerCtrl = require('../controllers/reader');
const genericCtrl = require('../controllers/generic');
const hellocashCtrl = require('../controllers/payment/hellocash');
const authMiddleware = require('../middleware/auth');

const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');

const MATERIAL_SIZE_LIMIT = 100 * 1024 * 1024; // 100 Mb
const IMG_SIZE_LIMIT = 2 * 1024 * 1024; // 2 Mb

const materialStorage = new GridFsStorage({
    url: process.env.MONGO_URL,
    file: (req, file) => ({ bucketName: 'materials' }),
});

const imgStorage = new GridFsStorage({
    url: process.env.MONGO_URL,
    file: (req, file) => ({ bucketName: 'images' }),
});

const materialUpload = multer({
    storage: materialStorage,
    limits: { fileSize: MATERIAL_SIZE_LIMIT }
});

const imgUpload = multer({
    storage: imgStorage,
    limits: { fileSize: IMG_SIZE_LIMIT }
});

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

router.post(
    readerBase + '/upload/image',
    authMiddleware.authenticateReader,
    imgUpload.single('image'),
    readerCtrl.uploadFile);

router.get(
    readerBase + '/materials',
    authMiddleware.authenticateReader,
    readerCtrl.searchMaterials);

router.get(
    readerBase + '/materials/tags',
    authMiddleware.authenticateReader,
    readerCtrl.getAllTags);

router.get(
    readerBase + '/materials/:id',
    authMiddleware.authenticateReader,
    readerCtrl.getMaterial);

router.post(
    readerBase + '/materials/:id/purchase',
    authMiddleware.authenticateReader,
    readerCtrl.purchaseMaterial);

router.get(
    readerBase + '/providers',
    authMiddleware.authenticateReader,
    readerCtrl.searchProviders);

router.get(
    readerBase + '/providers/:id',
    authMiddleware.authenticateReader,
    readerCtrl.getProvider);

// ------------------------- provider area --------------------------
const providerBase = '/provider';
router.post(
    providerBase + '/login',
    providerCtrl.login);

router.post(
    providerBase + '/logout',
    // authMiddleware.authenticateProvider,
    providerCtrl.logout);

router.post(
    providerBase + '/forgotPassword',
    providerCtrl.forgotPassword);

router.get(
    providerBase + '/initialData',
    // authMiddleware.authenticateProvider,
    providerCtrl.initialData);

router.put(
    providerBase + '/profile',
    // authMiddleware.authenticateProvider,
    providerCtrl.updateProfile);

router.post(
    providerBase + '/upload/image',
    // authMiddleware.authenticateProvider,
    imgUpload.single('image'),
    providerCtrl.uploadFile);

router.get(
    providerBase + '/materials',
    // authMiddleware.authenticateProvider,
    providerCtrl.getOwnMaterials);

router.get(
    providerBase + '/earnings',
    // authMiddleware.authenticateProvider,
    providerCtrl.getEarningsByMaterials);

// ------------------------- admin area -----------------------------
const adminBase = '/admin';
router.post(
    adminBase + '/login',
    adminCtrl.login);

router.post(
    adminBase + '/logout',
    // authMiddleware.authenticateAdmin,
    adminCtrl.logout);

router.post(
    adminBase + '/forgotPassword',
    adminCtrl.forgotPassword);

router.put(
    adminBase + '/profile',
    // authMiddleware.authenticateAdmin,
    adminCtrl.updateProfile);

router.get(
    adminBase + '/initialData',
    // authMiddleware.authenticateAdmin,
    adminCtrl.initialData);

router.get(
    adminBase + '/users/providers',
    // authMiddleware.authenticateAdmin,
    adminCtrl.searchProviders);

router.get(
    adminBase + '/users/providers/:id',
    // authMiddleware.authenticateAdmin,
    adminCtrl.getProvider);

router.post(
    adminBase + '/users/providers',
    // authMiddleware.authenticateAdmin,
    adminCtrl.createProvider);

router.put(
    adminBase + '/users/providers/:id',
    // authMiddleware.authenticateAdmin,
    adminCtrl.updateProviderInfo);

router.delete(
    adminBase + '/users/providers/:id',
    // authMiddleware.authenticateAdmin,
    adminCtrl.deleteProvider);

router.post(
    adminBase + '/materials',
    // authMiddleware.authenticateAdmin,
    adminCtrl.createMaterial);

router.get(
    adminBase + '/materials',
    // authMiddleware.authenticateAdmin,
    adminCtrl.searchMaterials);

router.get(
    adminBase + '/materials/tags',
    // authMiddleware.authenticateAdmin,
    adminCtrl.getAllTags);

router.get(
    adminBase + '/materials/:id',
    // authMiddleware.authenticateAdmin,
    adminCtrl.getMaterial);

router.put(
    adminBase + '/materials/:id',
    // authMiddleware.authenticateAdmin,
    adminCtrl.updateMaterial);

router.delete(
    adminBase + '/materials/:id',
    // authMiddleware.authenticateAdmin,
    adminCtrl.deleteMaterial);

router.post(
    adminBase + '/upload/material',
    // authMiddleware.authenticateAdmin,
    materialUpload.single('material'),
    adminCtrl.uploadFile);

router.post(
    adminBase + '/upload/image',
    // authMiddleware.authenticateAdmin,
    imgUpload.single('image'),
    adminCtrl.uploadFile);

// -------------------------------- media upload download section -------------------------
const mediaBase = '/media';

router.get(
    mediaBase + '/materials/:id',
    genericCtrl.downloadFile('materials'));

router.get(
    mediaBase + '/images/:id',
    genericCtrl.downloadFile('images'));

// ----------------------------- payment webhooks ----------------------------------------
router.post(
    '/hellocash/webhook',
    hellocashCtrl.webHook);

module.exports = router;
