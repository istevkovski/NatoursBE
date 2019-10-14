const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);

// After the below middleware line, all of the routes will be protected
router.use(authController.protect);

router.get('/me', userController.getCurrentUserInfo, userController.getUser);
router.patch('/update-password', authController.updatePassword);
router.patch(
    '/updateProfile',
    userController.uploadUserPhoto,
    userController.resizeUserPhoto,
    userController.updateCurrent
);
router.patch('/deleteProfile', userController.deleteCurrent);

// After the below line, all of the routes will be restricted
router.use(authController.restrictTo('admin'));

router
    .route('/')
    .get(userController.getAllUsers)
    .post(userController.createUser);
router
    .route('/:id')
    .get(userController.getUser)
    .patch(userController.updateUser)
    .delete(userController.deleteUser);

module.exports = router;
