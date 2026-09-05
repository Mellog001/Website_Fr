import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

    // Verify SMTP connection config on start
    if (env.NODE_ENV !== 'test') {
      this.transporter.verify((error) => {
        if (error) {
          logger.error('📧 SMTP transporter verification failed:', error);
        } else {
          logger.info('📧 Mail server connection ready for dispatch');
        }
      });
    }
  }

  /**
   * Dispatch a generic email
   */
  public async sendEmail(to: string, subject: string, text: string, html?: string): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: `"${env.EMAIL_FROM.split('@')[0].toUpperCase()}" <${env.EMAIL_FROM}>`,
        to,
        subject,
        text,
        html: html || text.replace(/\n/g, '<br>'),
      });

      logger.info(`📧 Email successfully dispatched to ${to}. MessageId: ${info.messageId}`);
    } catch (error) {
      logger.error(`❌ Failed to dispatch email to ${to}:`, error);
      // We do not crash on email delivery faults
    }
  }

  /**
   * Grade Notification Alert
   */
  public async sendGradeNotification(
    studentEmail: string,
    courseTitle: string,
    assessmentTitle: string,
    score: number,
    maxScore: number,
    feedback: string
  ): Promise<void> {
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
  public async sendVerificationEmail(email: string, token: string): Promise<void> {
    const subject = `Welcome to EduConnect Academy - Verify Your Email`;
    // In a real application, you'd use a frontend URL from env config.
    // Assuming frontend is running locally or has an env var for base URL.
    // For now we just use the token in a generic URL for demonstration.
    const verifyUrl = `${env.FRONTEND_URL || 'http://localhost:3000'}/verify-email.html?token=${token}`;
    
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
  public async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const subject = `EduConnect Academy - Password Reset Request`;
    const resetUrl = `${env.FRONTEND_URL || 'http://localhost:3000'}/reset-password.html?token=${token}`;
    
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

export const emailService = new EmailService();
export default emailService;
