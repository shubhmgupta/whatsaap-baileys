import nodemailer from 'nodemailer';

const isSmtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

const transport = isSmtpConfigured ? nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false // Accept self-signed certificates
    }
}) : null;

export async function sendVerificationEmail(email: string, token: string) {
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const appName = process.env.APP_NAME || 'Codefy';
    
    if (!isSmtpConfigured || !transport) {
        console.log('\n📧 Email verification link (SMTP not configured):');
        console.log(`${baseUrl}/api/auth/verify-email?token=${token}`);
        console.log('\nCopy this link to verify your email.\n');
        return;
    }

    try {
        const verificationLink = `${baseUrl}/api/auth/verify-email?token=${token}`;
        await transport.sendMail({
            from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
            to: email,
            subject: `Verify your email address - ${appName}`,
            html: `<p>Click <a href="${verificationLink}">here</a> to verify your email address for ${appName}.</p>`,
        });
    } catch (error) {
        console.error('Failed to send verification email:', error);
        console.log('\n📧 Email verification link (fallback):');
        console.log(`${baseUrl}/api/auth/verify-email?token=${token}\n`);
    }
}

export async function sendPasswordResetEmail(email: string, token: string, userName?: string) {
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const appName = process.env.APP_NAME || 'Codefy';
    
    if (!isSmtpConfigured || !transport) {
        console.log('\n🔐 Password reset link (SMTP not configured):');
        console.log(`${baseUrl}/reset-password?token=${token}`);
        console.log('\nCopy this link to reset your password.\n');
        return;
    }

    try {
        const resetLink = `${baseUrl}/reset-password?token=${token}`;
        await transport.sendMail({
            from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
            to: email,
            subject: `Reset Your Password - ${appName}`,
            html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">${appName}</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
    
    ${userName ? `<p>Hello <strong>${userName}</strong>,</p>` : '<p>Hello,</p>'}
    
    <p>We received a request to reset your password for your ${appName} account. Click the button below to create a new password:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" style="background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
    </div>
    
    <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
    <p style="background: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 5px; word-break: break-all; font-size: 12px;">
      ${resetLink}
    </p>
    
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #856404; font-size: 14px;">
        <strong>⚠️ Important:</strong> This link will expire in 1 hour for security reasons.
      </p>
    </div>
    
    <p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
      © ${new Date().getFullYear()} ${appName}. All rights reserved.
    </p>
  </div>
</body>
</html>
            `,
        });
    } catch (error) {
        console.error('Failed to send password reset email:', error);
        console.log('\n🔐 Password reset link (fallback):');
        console.log(`${baseUrl}/reset-password?token=${token}\n`);
    }
}
