import nodemailer from 'nodemailer';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendWelcomeEmail(email: string, name: string, tempPassword?: string) {
    const subject = 'Welcome to CRM System';
    const html = `
      <h1>Welcome ${name}!</h1>
      <p>Your account has been created successfully.</p>
      ${tempPassword ? `<p>Temporary password: <strong>${tempPassword}</strong></p>` : ''}
      <p>Please login at: ${process.env.APP_URL}/login</p>
      <p>For security, please change your password after first login.</p>
    `;

    await this.transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject,
      html
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
    const html = `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    await this.transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: 'Password Reset Request',
      html
    });
  }

  async sendCompanyInvitation(email: string, companyName: string, inviteToken: string) {
    const acceptUrl = `${process.env.APP_URL}/accept-invite?token=${inviteToken}`;
    const html = `
      <h1>You've been invited to ${companyName}</h1>
      <p>Click the link below to accept the invitation and set up your account:</p>
      <a href="${acceptUrl}">${acceptUrl}</a>
      <p>This invitation expires in 7 days.</p>
    `;

    await this.transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: `Invitation to join ${companyName}`,
      html
    });
  }
}

export default new EmailService();