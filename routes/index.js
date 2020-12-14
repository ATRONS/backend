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

router.put(
    readerBase + '/verifyEmail',
    authMiddleware.authenticateUser,
    authMiddleware.isUnverifiedReader,
    readerCtrl.verifyEmail);

router.get(
    readerBase + '/resendVerificationCode',
    authMiddleware.authenticateUser,
    authMiddleware.isUnverifiedReader,
    readerCtrl.resendVerification);

router.post(
    readerBase + '/login',
    readerCtrl.login);

router.post(
    readerBase + '/logout',
    authMiddleware.authenticateUser,
    authMiddleware.isVerifiedReader,
    readerCtrl.logout);

router.post(
    readerBase + '/forgotPassword',
    readerCtrl.forgotPassword);

router.get(
    readerBase + '/initialData',
    authMiddleware.authenticateUser,
    authMiddleware.isVerifiedReader,
    readerCtrl.initialData);

router.put(
    readerBase + '/profile',
    authMiddleware.authenticateUser,
    authMiddleware.isVerifiedReader,
    readerCtrl.updateProfile);

router.get(
    readerBase + '/materials',
    authMiddleware.authenticateUser,
    authMiddleware.isVerifiedReader,
    readerCtrl.searchMaterials);

router.get(
    readerBase + '/materials/tags',
    authMiddleware.authenticateUser,
    authMiddleware.isVerifiedReader,
    readerCtrl.getAllTags);

router.get(
    readerBase + '/materials/:id',
    authMiddleware.authenticateUser,
    authMiddleware.isVerifiedReader,
    readerCtrl.getMaterial);

router.post(
    readerBase + '/materials/:id/purchase',
    authMiddleware.authenticateUser,
    authMiddleware.isVerifiedReader,
    readerCtrl.purchaseMaterial);

router.get(
    readerBase + '/materials/:id/ratings',
    authMiddleware.authenticateUser,
    authMiddleware.isVerifiedReader,
    readerCtrl.getMaterialRatings);

router.put(
    readerBase + '/materials/:id/ratings',
    authMiddleware.authenticateUser,
    authMiddleware.isVerifiedReader,
    readerCtrl.rateMaterial);

router.get(
    readerBase + '/providers',
    authMiddleware.authenticateUser,
    authMiddleware.isVerifiedReader,
    readerCtrl.searchProviders);

router.get(
    readerBase + '/providers/:id',
    authMiddleware.authenticateUser,
    authMiddleware.isVerifiedReader,
    readerCtrl.getProvider);

// ------------------------- provider area --------------------------
const providerBase = '/provider';

router.post(
    providerBase + '/forgotPassword',
    providerCtrl.forgotPassword);

router.get(
    providerBase + '/initialData',
    authMiddleware.authenticateUser,
    authMiddleware.isVerifiedProvider,
    providerCtrl.initialData);

router.put(
    providerBase + '/profile',
    authMiddleware.authenticateUser,
    authMiddleware.isVerifiedProvider,
    providerCtrl.updateProfile);

router.put(
    providerBase + '/profile/activate',
    authMiddleware.authenticateUser,
    authMiddleware.isUnverifiedProvider,
    providerCtrl.activateAccount);

router.get(
    providerBase + '/requests',
    authMiddleware.authenticateUser,
    authMiddleware.isVerifiedProvider,
    providerCtrl.getOwnRequests);

router.get(
    providerBase + '/requests/withdrawable',
    authMiddleware.authenticateUser,
    authMiddleware.isVerifiedProvider,
    providerCtrl.getWithdrawalInfo);

router.post(
    providerBase + '/requests',
    authMiddleware.authenticateUser,
    authMiddleware.isVerifiedProvider,
    providerCtrl.createRequest);

router.get(
    providerBase + '/materials',
    authMiddleware.authenticateUser,
    authMiddleware.isVerifiedProvider,
    providerCtrl.getOwnMaterials);

router.get(
    providerBase + '/materials/:id',
    authMiddleware.authenticateUser,
    authMiddleware.isVerifiedProvider,
    providerCtrl.getMaterial);

router.get(
    providerBase + '/materials/:id/ratings',
    authMiddleware.authenticateUser,
    authMiddleware.isVerifiedProvider,
    providerCtrl.getMaterialRatings);

router.get(
    providerBase + '/materials/:id/report/sells',
    authMiddleware.authenticateUser,
    authMiddleware.isVerifiedProvider,
    providerCtrl.getMaterialSellsReport);

router.get(
    providerBase + '/earnings',
    authMiddleware.authenticateUser,
    authMiddleware.isVerifiedProvider,
    providerCtrl.getEarningsByMaterials);

router.get(
    providerBase + '/transactions',
    authMiddleware.authenticateUser,
    authMiddleware.isVerifiedProvider,
    providerCtrl.getTransactions);

router.get(
    providerBase + '/earningsPerDayPerMaterial',
    authMiddleware.authenticateUser,
    authMiddleware.isVerifiedProvider,
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
    adminBase + '/users/providers/requests',
    authMiddleware.authenticateUser,
    authMiddleware.isAdmin,
    adminCtrl.getRequests);

router.put(
    adminBase + '/users/providers/requests/:id',
    authMiddleware.authenticateUser,
    authMiddleware.isAdmin,
    adminCtrl.completeRequest);

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

router.get(
    adminBase + '/materials/:id/ratings',
    authMiddleware.authenticateUser,
    authMiddleware.isAdmin,
    adminCtrl.getMaterialRatings);

router.post(
    adminBase + '/upload/material',
    authMiddleware.authenticateUser,
    authMiddleware.isAdmin,
    materialUpload.single('material'),
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

router.post(
    mediaBase + '/upload/image',
    authMiddleware.authenticateUser,
    imgUpload.single('image'),
    genericCtrl.uploadFile);

router.get(
    mediaBase + '/materials/:id',
    authMiddleware.authenticateUser,
    authMiddleware.isVerifiedReader,
    genericCtrl.downloadFile('materials'));

router.get(
    mediaBase + '/images/:id',
    genericCtrl.downloadFile('images'));

// ----------------------------- payment webhooks ----------------------------------------
router.post(
    '/hellocash/webhook',
    hellocashCtrl.webHook);

module.exports = router;
