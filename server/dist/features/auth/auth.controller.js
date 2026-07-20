"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("./auth.service");
const authService = new auth_service_1.AuthService();
class AuthController {
    register = async (req, res, next) => {
        try {
            const result = await authService.register(req.body);
            res.status(201).json({
                status: 'success',
                message: 'User registered successfully. Please check your email to verify your account.',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    login = async (req, res, next) => {
        try {
            const result = await authService.login(req.body);
            res.status(200).json({
                status: 'success',
                message: 'Login successful',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    getMe = async (req, res, next) => {
        try {
            // req.user is set by authenticate middleware
            const userId = req.user.id;
            const result = await authService.getMe(userId);
            res.status(200).json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    forgotPassword = async (req, res, next) => {
        try {
            const { email } = req.body;
            await authService.forgotPassword(email);
            res.status(200).json({
                status: 'success',
                message: 'If an account exists with that email, a password reset link has been sent.',
            });
        }
        catch (error) {
            next(error);
        }
    };
    resetPassword = async (req, res, next) => {
        try {
            const { token, newPassword } = req.body;
            await authService.resetPassword(token, newPassword);
            res.status(200).json({
                status: 'success',
                message: 'Password has been reset successfully. You can now log in.',
            });
        }
        catch (error) {
            next(error);
        }
    };
    changePassword = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { oldPassword, newPassword } = req.body;
            await authService.changePassword(userId, oldPassword, newPassword);
            res.status(200).json({
                status: 'success',
                message: 'Password changed successfully. You will need to log in again on all devices.',
            });
        }
        catch (error) {
            next(error);
        }
    };
    verifyEmail = async (req, res, next) => {
        try {
            const { token } = req.body;
            await authService.verifyEmail(token);
            res.status(200).json({
                status: 'success',
                message: 'Email verified successfully. You can now log in.',
            });
        }
        catch (error) {
            next(error);
        }
    };
    resendVerificationEmail = async (req, res, next) => {
        try {
            const { email } = req.body;
            await authService.resendVerificationEmail(email);
            res.status(200).json({
                status: 'success',
                message: 'If the account exists and is unverified, a new verification link has been sent.',
            });
        }
        catch (error) {
            next(error);
        }
    };
    refresh = async (req, res, next) => {
        try {
            const { refreshToken } = req.body;
            const result = await authService.refresh(refreshToken);
            res.status(200).json({
                status: 'success',
                message: 'Token rotated successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    logout = async (req, res, next) => {
        try {
            const { refreshToken } = req.body;
            await authService.logout(refreshToken);
            res.status(200).json({
                status: 'success',
                message: 'Logged out successfully',
            });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.AuthController = AuthController;
exports.default = AuthController;
//# sourceMappingURL=auth.controller.js.map