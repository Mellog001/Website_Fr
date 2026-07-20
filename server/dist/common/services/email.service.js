"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../../config/env");
const logger_1 = require("../../config/logger");
class EmailService {
    transporter;
    constructor() {
        this.transporter = nodemailer_1.default.createTransport({
            host: env_1.env.SMTP_HOST,
            port: env_1.env.SMTP_PORT,
            secure: env_1.env.SMTP_PORT === 465, // true for port 465, false for other ports
            auth: {
                user: env_1.env.SMTP_USER,
                pass: env_1.env.SMTP_PASS,
            },
        });
        // Verify SMTP connection config on start
        if (env_1.env.NODE_ENV !== 'test') {
            this.transporter.verify((error) => {
                if (error) {
                    logger_1.logger.error('📧 SMTP transporter verification failed:', error);
                }
                else {
                    logger_1.logger.info('📧 Mail server connection ready for dispatch');
                }
            });
        }
    }
    /**
     * Dispatch a generic email
     */
    async sendEmail(to, subject, text, html) {
        try {
            const info = await this.transporter.sendMail({
                from: `"${env_1.env.EMAIL_FROM.split('@')[0].toUpperCase()}" <${env_1.env.EMAIL_FROM}>`,
                to,
                subject,
                text,
                html: html || text.replace(/\n/g, '<br>'),
            });
            logger_1.logger.info(`📧 Email successfully dispatched to ${to}. MessageId: ${info.messageId}`);
        }
        catch (error) {
            logger_1.logger.error(`❌ Failed to dispatch email to ${to}:`, error);
            // We do not crash on email delivery faults
        }
    }
    /**
     * Grade Notification Alert
     */
    async sendGradeNotification(studentEmail, courseTitle, assessmentTitle, score, maxScore, feedback) {
        const subject = `🎓 Grade Released: ${assessmentTitle} - ${courseTitle}`;
        const text = `Hello,\n\nYour tutor has graded your submission for "${assessmentTitle}" in the course "${courseTitle}".\n\nScore: ${score} / ${maxScore}\nFeedback: ${feedback}\n\nKeep studying!\nEduConnect Team`;
        const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4A90E2; text-align: center;">EduConnect Academy</h2>
        <hr style="border: 0; border-top: 1px dashed #eee;">
        <p>Hello,</p>
        <p>Your tutor has graded your submission for <strong>${assessmentTitle}</strong> in the course <strong>${courseTitle}</strong>.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
          <span style="font-size: 14px; color: #666;">YOUR SCORE</span><br>
          <span style="font-size: 32px; font-weight: bold; color: #2E7D32;">${score}</span> <span style="font-size: 20px; color: #666;">/ ${maxScore}</span>
        </div>

        <p><strong>Tutor Feedback:</strong></p>
        <blockquote style="border-left: 4px solid #4A90E2; padding-left: 15px; color: #555; margin: 15px 0;">
          ${feedback}
        </blockquote>

        <p style="margin-top: 30px;">Keep up the good work!</p>
        <p style="color: #888; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 15px; text-align: center;">
          This is an automated notification. Please do not reply directly to this mail.
        </p>
      </div>
    `;
        await this.sendEmail(studentEmail, subject, text, html);
    }
    /**
     * Account Verification Email
     */
    async sendVerificationEmail(email, token) {
        const subject = `Welcome to EduConnect Academy - Verify Your Email`;
        // In a real application, you'd use a frontend URL from env config.
        // Assuming frontend is running locally or has an env var for base URL.
        // For now we just use the token in a generic URL for demonstration.
        const verifyUrl = `${env_1.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
        const text = `Hello,\n\nWelcome to EduConnect Academy! Please verify your email address by clicking the link below:\n\n${verifyUrl}\n\nThis link will expire in 24 hours.\n\nEduConnect Team`;
        const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4A90E2; text-align: center;">EduConnect Academy</h2>
        <hr style="border: 0; border-top: 1px dashed #eee;">
        <p>Hello,</p>
        <p>Welcome to EduConnect Academy! Please verify your email address to activate your account.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #4A90E2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
        </div>
        <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
        <p style="font-size: 14px; color: #4A90E2; word-break: break-all;">${verifyUrl}</p>
        <p style="font-size: 14px; color: #666;">This link will expire in 24 hours.</p>
        <p style="color: #888; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 15px; text-align: center;">
          This is an automated notification. Please do not reply directly to this mail.
        </p>
      </div>
    `;
        await this.sendEmail(email, subject, text, html);
    }
    /**
     * Password Reset Email
     */
    async sendPasswordResetEmail(email, token) {
        const subject = `EduConnect Academy - Password Reset Request`;
        const resetUrl = `${env_1.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
        const text = `Hello,\n\nWe received a request to reset your password. Click the link below to set a new password:\n\n${resetUrl}\n\nThis link will expire in 1 hour. If you didn't request this, you can safely ignore this email.\n\nEduConnect Team`;
        const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4A90E2; text-align: center;">EduConnect Academy</h2>
        <hr style="border: 0; border-top: 1px dashed #eee;">
        <p>Hello,</p>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4A90E2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
        <p style="font-size: 14px; color: #4A90E2; word-break: break-all;">${resetUrl}</p>
        <p style="font-size: 14px; color: #666;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        <p style="color: #888; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 15px; text-align: center;">
          This is an automated notification. Please do not reply directly to this mail.
        </p>
      </div>
    `;
        await this.sendEmail(email, subject, text, html);
    }
}
exports.emailService = new EmailService();
exports.default = exports.emailService;
//# sourceMappingURL=email.service.js.map