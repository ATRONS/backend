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
    authMiddleware.authenticateUser,
    readerCtrl.logout);

router.post(
    readerBase + '/forgotPassword',
    readerCtrl.forgotPassword);

router.get(
    readerBase + '/initialData',
    authMiddleware.authenticateUser,
    readerCtrl.initialData);

router.put(
    readerBase + '/profile',
    authMiddleware.authenticateUser,
    readerCtrl.updateProfile);

router.post(
    readerBase + '/upload/image',
    authMiddleware.authenticateUser,
    imgUpload.single('image'),
    readerCtrl.uploadFile);

router.get(
    readerBase + '/materials',
    authMiddleware.authenticateUser,
    readerCtrl.searchMaterials);

router.get(
    readerBase + '/materials/tags',
    authMiddleware.authenticateUser,
    readerCtrl.getAllTags);

router.get(
    readerBase + '/materials/:id',
    authMiddleware.authenticateUser,
    readerCtrl.getMaterial);

router.post(
    readerBase + '/materials/:id/purchase',
    authMiddleware.authenticateUser,
    readerCtrl.purchaseMaterial);

router.get(
    readerBase + '/providers',
    authMiddleware.authenticateUser,
    readerCtrl.searchProviders);

router.get(
    readerBase + '/providers/:id',
    authMiddleware.authenticateUser,
    readerCtrl.getProvider);

// ------------------------- provider area --------------------------
const providerBase = '/provider';

router.post(
    providerBase + '/forgotPassword',
    providerCtrl.forgotPassword);

router.get(
    providerBase + '/initialData',
    authMiddleware.authenticateUser,
    providerCtrl.initialData);

router.put(
    providerBase + '/profile',
    authMiddleware.authenticateUser,
    providerCtrl.updateProfile);

router.post(
    providerBase + '/upload/image',
    authMiddleware.authenticateUser,
    imgUpload.single('image'),
    providerCtrl.uploadFile);

router.get(
    providerBase + '/materials',
    authMiddleware.authenticateUser,
    providerCtrl.getOwnMaterials);

router.get(
    providerBase + '/earnings',
    authMiddleware.authenticateUser,
    providerCtrl.getEarningsByMaterials);

// ------------------------- admin area -----------------------------
const adminBase = '/admin';

router.post(
    adminBase + '/forgotPassword',
    adminCtrl.forgotPassword);

router.put(
    adminBase + '/profile',
    authMiddleware.authenticateUser,
    adminCtrl.updateProfile);

router.get(
    adminBase + '/initialData',
    authMiddleware.authenticateUser,
    adminCtrl.initialData);

router.get(
    adminBase + '/users/providers',
    authMiddleware.authenticateUser,
    adminCtrl.searchProviders);

router.get(
    adminBase + '/users/providers/:id',
    authMiddleware.authenticateUser,
    adminCtrl.getProvider);

router.post(
    adminBase + '/users/providers',
    authMiddleware.authenticateUser,
    adminCtrl.createProvider);

router.put(
    adminBase + '/users/providers/:id',
    authMiddleware.authenticateUser,
    adminCtrl.updateProviderInfo);

router.delete(
    adminBase + '/users/providers/:id',
    authMiddleware.authenticateUser,
    adminCtrl.deleteProvider);

router.post(
    adminBase + '/materials',
    authMiddleware.authenticateUser,
    adminCtrl.createMaterial);

router.get(
    adminBase + '/materials',
    authMiddleware.authenticateUser,
    adminCtrl.searchMaterials);

router.get(
    adminBase + '/materials/tags',
    authMiddleware.authenticateUser,
    adminCtrl.getAllTags);

router.get(
    adminBase + '/materials/:id',
    authMiddleware.authenticateUser,
    adminCtrl.getMaterial);

router.put(
    adminBase + '/materials/:id',
    authMiddleware.authenticateUser,
    adminCtrl.updateMaterial);

router.delete(
    adminBase + '/materials/:id',
    authMiddleware.authenticateUser,
    adminCtrl.deleteMaterial);

router.post(
    adminBase + '/upload/material',
    authMiddleware.authenticateUser,
    materialUpload.single('material'),
    adminCtrl.uploadFile);

router.post(
    adminBase + '/upload/image',
    authMiddleware.authenticateUser,
    imgUpload.single('image'),
    adminCtrl.uploadFile);

// ---------------------------- admin / provider login -----------------------------------
const accountBase = '/account';

router.post(
    accountBase + '/login',
    genericCtrl.adminProviderLogin);

router.post(
    accountBase + '/logout',
    authMiddleware.authenticateUser,
    adminCtrl.logout);

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
