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
    authMiddleware.isReader,
    readerCtrl.logout);

router.post(
    readerBase + '/forgotPassword',
    readerCtrl.forgotPassword);

router.get(
    readerBase + '/initialData',
    authMiddleware.authenticateUser,
    authMiddleware.isReader,
    readerCtrl.initialData);

router.put(
    readerBase + '/profile',
    authMiddleware.authenticateUser,
    authMiddleware.isReader,
    readerCtrl.updateProfile);

router.post(
    readerBase + '/upload/image',
    authMiddleware.authenticateUser,
    authMiddleware.isReader,
    imgUpload.single('image'),
    readerCtrl.uploadFile);

router.get(
    readerBase + '/materials',
    authMiddleware.authenticateUser,
    authMiddleware.isReader,
    readerCtrl.searchMaterials);

router.get(
    readerBase + '/materials/tags',
    authMiddleware.authenticateUser,
    authMiddleware.isReader,
    readerCtrl.getAllTags);

router.get(
    readerBase + '/materials/:id',
    authMiddleware.authenticateUser,
    authMiddleware.isReader,
    readerCtrl.getMaterial);

router.post(
    readerBase + '/materials/:id/purchase',
    authMiddleware.authenticateUser,
    authMiddleware.isReader,
    readerCtrl.purchaseMaterial);

router.get(
    readerBase + '/providers',
    authMiddleware.authenticateUser,
    authMiddleware.isReader,
    readerCtrl.searchProviders);

router.get(
    readerBase + '/providers/:id',
    authMiddleware.authenticateUser,
    authMiddleware.isReader,
    readerCtrl.getProvider);

// ------------------------- provider area --------------------------
const providerBase = '/provider';

router.post(
    providerBase + '/forgotPassword',
    providerCtrl.forgotPassword);

router.get(
    providerBase + '/initialData',
    authMiddleware.authenticateUser,
    authMiddleware.isProvider,
    providerCtrl.initialData);

router.put(
    providerBase + '/profile',
    authMiddleware.authenticateUser,
    authMiddleware.isProvider,
    providerCtrl.updateProfile);

router.post(
    providerBase + '/upload/image',
    authMiddleware.authenticateUser,
    authMiddleware.isProvider,
    imgUpload.single('image'),
    providerCtrl.uploadFile);

router.get(
    providerBase + '/materials',
    authMiddleware.authenticateUser,
    authMiddleware.isProvider,
    providerCtrl.getOwnMaterials);

router.get(
    providerBase + '/materials/:id',
    authMiddleware.authenticateUser,
    authMiddleware.isProvider,
    providerCtrl.getMaterial);

router.get(
    providerBase + '/earnings',
    authMiddleware.authenticateUser,
    authMiddleware.isProvider,
    providerCtrl.getEarningsByMaterials);

router.get(
    providerBase + '/earningsPerDayPerMaterial',
    authMiddleware.authenticateUser,
    authMiddleware.isProvider,
    providerCtrl.getEarningsByMaterialsBnDays);


// ------------------------- admin area -----------------------------
const adminBase = '/admin';

router.post(
    adminBase + '/forgotPassword',
    adminCtrl.forgotPassword);

router.put(
    adminBase + '/profile',
    authMiddleware.authenticateUser,
    authMiddleware.isAdmin,
    adminCtrl.updateProfile);

router.get(
    adminBase + '/initialData',
    authMiddleware.authenticateUser,
    authMiddleware.isAdmin,
    adminCtrl.initialData);

router.get(
    adminBase + '/users/providers',
    authMiddleware.authenticateUser,
    authMiddleware.isAdmin,
    adminCtrl.searchProviders);

router.get(
    adminBase + '/users/providers/:id',
    authMiddleware.authenticateUser,
    authMiddleware.isAdmin,
    adminCtrl.getProvider);

router.post(
    adminBase + '/users/providers',
    authMiddleware.authenticateUser,
    authMiddleware.isAdmin,
    adminCtrl.createProvider);

router.put(
    adminBase + '/users/providers/:id',
    authMiddleware.authenticateUser,
    authMiddleware.isAdmin,
    adminCtrl.updateProviderInfo);

router.delete(
    adminBase + '/users/providers/:id',
    authMiddleware.authenticateUser,
    authMiddleware.isAdmin,
    adminCtrl.deleteProvider);

router.post(
    adminBase + '/materials',
    authMiddleware.authenticateUser,
    authMiddleware.isAdmin,
    adminCtrl.createMaterial);

router.get(
    adminBase + '/materials',
    authMiddleware.authenticateUser,
    authMiddleware.isAdmin,
    adminCtrl.searchMaterials);

router.get(
    adminBase + '/materials/tags',
    authMiddleware.authenticateUser,
    authMiddleware.isAdmin,
    adminCtrl.getAllTags);

router.get(
    adminBase + '/materials/:id',
    authMiddleware.authenticateUser,
    authMiddleware.isAdmin,
    adminCtrl.getMaterial);

router.put(
    adminBase + '/materials/:id',
    authMiddleware.authenticateUser,
    authMiddleware.isAdmin,
    adminCtrl.updateMaterial);

router.delete(
    adminBase + '/materials/:id',
    authMiddleware.authenticateUser,
    authMiddleware.isAdmin,
    adminCtrl.deleteMaterial);

router.post(
    adminBase + '/upload/material',
    authMiddleware.authenticateUser,
    authMiddleware.isAdmin,
    materialUpload.single('material'),
    adminCtrl.uploadFile);

router.post(
    adminBase + '/upload/image',
    authMiddleware.authenticateUser,
    authMiddleware.isAdmin,
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
