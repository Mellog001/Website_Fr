import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // true for port 465, false for other ports
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
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
}

export const emailService = new EmailService();
export default emailService;
