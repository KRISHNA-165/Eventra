const nodemailer = require('nodemailer');

let transporter = null;

// Configure NodeMailer if credentials are provided in env
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

/**
 * Send an email to the recipient
 * @param {Object} options - { to, subject, text, html }
 */
async function sendMail({ to, subject, text, html }) {
    if (!transporter) {
        console.log(`[SMTP SIMULATION] To: ${to} | Subject: ${subject}`);
        return { simulated: true };
    }

    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || `"Eventra Desk" <${process.env.SMTP_USER}>`,
            to,
            subject,
            text,
            html
        });
        console.log(`Email successfully sent: ${info.messageId}`);
        return { sent: true, messageId: info.messageId };
    } catch (error) {
        console.error('Mailer error:', error.message);
        throw error;
    }
}

module.exports = { sendMail };
