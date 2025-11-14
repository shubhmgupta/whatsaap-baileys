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
            subject: 'Verify your email address',
            html: `<p>Click <a href="${verificationLink}">here</a> to verify your email address.</p>`,
        });
    } catch (error) {
        console.error('Failed to send verification email:', error);
        console.log('\n📧 Email verification link (fallback):');
        console.log(`${baseUrl}/api/auth/verify-email?token=${token}\n`);
    }
}

export async function sendPasswordResetEmail(email: string, token: string) {
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    
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
            subject: 'Reset your password',
            html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
        });
    } catch (error) {
        console.error('Failed to send password reset email:', error);
        console.log('\n🔐 Password reset link (fallback):');
        console.log(`${baseUrl}/reset-password?token=${token}\n`);
    }
}
