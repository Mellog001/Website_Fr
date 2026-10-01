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

  /**
   * Enrollment Payment Instructions Email (sent to the student)
   */
  public async sendEnrollmentEmail(
    studentEmail: string,
    studentName: string,
    courseTitle: string,
    amount: number,
    courseDescription: string,
    enrollmentId: string
  ): Promise<void> {
    const amountNumber = typeof amount === 'string' ? parseFloat(amount) : amount;
    const formattedAmount = amountNumber.toFixed(2);
    const reference = enrollmentId.split('-')[0].toUpperCase();

    const subject = `EduConnect - Complete Your Enrollment: ${courseTitle}`;

    const text = `Hello ${studentName},\n\nThank you for requesting enrollment in "${courseTitle}".\n\nAmount due: KES ${formattedAmount}\nReference code: ${reference}\n\nPlease complete payment using one of the options below, and include your reference code so we can match your payment:\n\n1) Bank Transfer\nBank Name: [Your Bank Name]\nAccount Name: [Your Account Name]\nAccount Number: [Your Account Number]\nSWIFT Code: [Your SWIFT Code]\n\n2) International Transfer Services\nWestern Union / Ria / PayPal - contact us at ${env.EMAIL_FROM} for our receiving details for these services.\n\nOnce payment is received and confirmed, your enrollment will be activated and you will gain full access to the course.\n\nEduConnect Team`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4A90E2; text-align: center;">EduConnect Academy</h2>
        <hr style="border: 0; border-top: 1px dashed #eee;">
        <p>Hello ${studentName},</p>
        <p>Thank you for requesting enrollment in:</p>
        <h3 style="margin: 5px 0;">${courseTitle}</h3>
        <p style="color: #666; font-size: 14px;">${courseDescription}</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
          <span style="font-size: 14px; color: #666;">AMOUNT DUE</span><br>
          <span style="font-size: 28px; font-weight: bold; color: #2E7D32;">KES ${formattedAmount}</span><br>
          <span style="font-size: 13px; color: #888;">Reference Code: <strong>${reference}</strong></span>
        </div>
        <p><strong>Please pay using one of the following options, and include your reference code:</strong></p>
        <div style="background: #fff; border: 1px solid #eee; border-radius: 6px; padding: 15px; margin-bottom: 12px;">
          <p style="margin: 0 0 8px; font-weight: bold; color: #4A90E2;">Option 1: Bank Transfer</p>
          <p style="margin: 2px 0; font-size: 14px;">Bank Name: [Your Bank Name]</p>
          <p style="margin: 2px 0; font-size: 14px;">Account Name: [Your Account Name]</p>
          <p style="margin: 2px 0; font-size: 14px;">Account Number: [Your Account Number]</p>
          <p style="margin: 2px 0; font-size: 14px;">SWIFT Code: [Your SWIFT Code]</p>
        </div>
        <div style="background: #fff; border: 1px solid #eee; border-radius: 6px; padding: 15px;">
          <p style="margin: 0 0 8px; font-weight: bold; color: #4A90E2;">Option 2: International Transfer Services</p>
          <p style="margin: 2px 0; font-size: 14px;">Western Union / Ria / PayPal</p>
          <p style="margin: 2px 0; font-size: 14px;">Contact us at <a href="mailto:${env.EMAIL_FROM}">${env.EMAIL_FROM}</a> for our receiving details.</p>
        </div>
        <p style="margin-top: 25px; font-size: 14px; color: #666;">Once your payment is confirmed, your enrollment will be activated and you will gain full access to the course.</p>
        <p style="color: #888; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 15px; text-align: center;">
          This is an automated notification. Please do not reply directly to this mail.
        </p>
      </div>
    `;

    await this.sendEmail(studentEmail, subject, text, html);
  }

  /**
   * Enrollment Notification Email (sent to the admin)
   */
  public async sendAdminEnrollmentNotification(
    studentEmail: string,
    courseTitle: string,
    amount: number,
    enrollmentId: string
  ): Promise<void> {
    const amountNumber = typeof amount === 'string' ? parseFloat(amount) : amount;
    const formattedAmount = amountNumber.toFixed(2);
    const reference = enrollmentId.split('-')[0].toUpperCase();
    const adminEmail = env.ADMIN_NOTIFICATION_EMAIL;

    const subject = `New Enrollment Pending: ${courseTitle}`;
    const text = `A new enrollment request needs your attention.\n\nStudent: ${studentEmail}\nCourse: ${courseTitle}\nAmount: KES ${formattedAmount}\nReference: ${reference}\n\nLog in to the admin dashboard to review and activate this enrollment once payment is confirmed.`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4A90E2; text-align: center;">EduConnect Admin Alert</h2>
        <hr style="border: 0; border-top: 1px dashed #eee;">
        <p>A new enrollment request needs your attention:</p>
        <ul style="font-size: 14px; line-height: 1.8;">
          <li><strong>Student:</strong> ${studentEmail}</li>
          <li><strong>Course:</strong> ${courseTitle}</li>
          <li><strong>Amount:</strong> KES ${formattedAmount}</li>
          <li><strong>Reference:</strong> ${reference}</li>
        </ul>
        <p>Log in to the admin dashboard to review and activate this enrollment once payment is confirmed.</p>
      </div>
    `;

    await this.sendEmail(adminEmail, subject, text, html);
  }
}

export const emailService = new EmailService();
export default emailService;
