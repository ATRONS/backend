const nodemailer = require('nodemailer');
const logger = require('../logger/logger');

class EmailSender {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            pool: true,
            auth: {
                type: 'OAuth2',
                user: process.env.EMAIL_ADDRESS,
                clientId: process.env.EMAIL_CLIENT_ID,
                clientSecret: process.env.EMAIL_CLIENT_SECRET,
                refreshToken: process.env.EMAIL_REFRESH_TOKEN,
                accessToken: process.env.EMAIL_ACCESS_TOKEN,
                expires: 1484314697598
            }
        });
    }

    async sendVerifyEmail(recepient, url) {
        try {
            const mailHTML = `
            <div>
                <h2>Verify your email to start using Care Reps</h2>
                <a href="${url}">Verify Email</a>
            </div>
            `;

            await this.transporter.sendMail({
                from: process.env.EMAIL,
                to: recepient,
                subject: `Verify your email`,
                html: mailHTML,
            });

            logger.info('verification email sent');
            return true;
        } catch (err) {
            logger.error(err);
        }
        return false;
    }
}

const emailer = new EmailSender();
Object.freeze(emailer);

module.exports = emailer;