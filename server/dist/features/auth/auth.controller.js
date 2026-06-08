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
                message: 'User registered successfully',
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