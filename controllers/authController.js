const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const Review = require('./../models/reviewModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES
    });
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user.id);
    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
        ),
        httpOnly: true
    };
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

    res.cookie('jwt', token, cookieOptions);

    // Remove password from output
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
};

exports.logout = (req, res) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });
    res.status(200).json({ status: 'success' });
};

exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        role: req.body.role,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        passwordChangedAt: req.body.passwordChangedAt
    });
    const url = `${req.protocol}://${req.get('host')}/me`;
    await new Email(newUser, url).sendWelcome();

    createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // Check if email and password exist
    if (!email || !password)
        return next(new AppError('Please provide email and password', 400));

    // Check if user exists and password is correct
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.verifyPassword(password, user.password)))
        return next(new AppError('Incorrect email or password', 401));

    // If everything fits, send jwt token to client
    createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
    // Get and check token
    let token = '';
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) token = req.cookies.jwt;

    if (!token) return next(new AppError('You are not logged in! 😠', 401));

    // Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser)
        return next(
            new AppError('The owner of this token does not exist. 😧', 400)
        );

    // Check if user changed password after JWT was issued
    if (await currentUser.verifyPasswordDate(decoded.iat)) {
        return next(
            new AppError(
                'The user has recently changed their password. Please log in again. 👋',
                401
            )
        );
    }

    // Grant access to protected route
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
});

// Only for rendered pages, no errors
exports.isLoggedIn = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
            // Verify token
            const decoded = await promisify(jwt.verify)(
                req.cookies.jwt,
                process.env.JWT_SECRET
            );

            // Check if user still exists
            const currentUser = await User.findById(decoded.id);
            if (!currentUser) return next();

            // Check if user changed password after JWT was issued
            if (await currentUser.verifyPasswordDate(decoded.iat))
                return next();

            // Logged in user confirmed
            res.locals.user = currentUser;
            return next();
        } catch (err) {
            return next();
        }
    }
    next();
};

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role))
            return next(new AppError('Insufficient permissions! 👮‍', 403));
        next();
    };
};

// exports.restrictToOwnerOnly = catchAsync(async (req, res, next) => {
//     const review = await Review.findById(req.params.id);
//     if (req.user.id !== review.user.id)
//         next(new AppError('You are not the owner of this review! 👿', 401));
//     next();
// });

exports.forgotPassword = catchAsync(async (req, res, next) => {
    // Get user based on POSTed email
    const user = await User.findOne({ email: req.body.email });
    if (!user) return next(new AppError('User does not exist! 🚨', 404));

    // Generate random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Send back via email
    try {
        const resetURL = `${req.protocol}://${req.get(
            'host'
        )}/api/v1/users/reset-password/${resetToken}`;
        await new Email(user, resetURL).sendPasswordReset();

        res.status(200).json({
            status: 'success',
            message: `Token has been sent to ${user.email}. 😊`
        });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(
            new AppError(
                'There was an error sending the password reset email. Try again later! ☹️',
                500
            )
        );
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    // Get user based on token
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    });

    // Set password if token hasn't expired and user exists
    if (!user)
        return next(
            new AppError("User doesn't exist or token is invalid. 😱", 400)
        );
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Update changedPasswordAt for current user
    // It has been done in userModel pre saving the user

    // Log in the user, JWT
    createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    // Get user from collection
    const user = await User.findById(req.user._id).select('+password');
    const { passwordCurrent, password, passwordConfirm } = req.body;

    // Check if POSTed password is correct
    if (!(await user.verifyPassword(passwordCurrent, user.password)))
        return next(
            new AppError(
                'Confirm password does not match user password. 👮‍',
                401
            )
        );

    // Update password
    user.password = password;
    user.passwordConfirm = passwordConfirm;
    await user.save();

    // Log in user, send JWT
    createSendToken(user, 200, res);
});
