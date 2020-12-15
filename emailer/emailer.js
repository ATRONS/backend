const nodemailer = require('nodemailer');
const logger = global.logger;

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
                // accessToken: process.env.EMAIL_ACCESS_TOKEN,
                expires: 1484314697598
            }
        });
    }

    async sendProviderDefaultPassword(recepientInfo, password, url) {
        try {
            const mailHTML = `
            <div>
                <h1>Dear ${recepientInfo.legal_name}, ${password} is your default password</h1>
                <a href="${url}">Go to site</a>
            </div>
            `;

            await this.transporter.sendMail({
                from: process.env.EMAIL,
                to: recepientInfo.email,
                subject: `Verify your email`,
                html: mailHTML,
            });

            logger.info('verification email sent');
            console.log(mailHTML);
            return true;
        } catch (err) {
            console.log(err);
            logger.error(err);
        }
        return false;
    }

    async sendVerifyEmail(recepient, code) {
        try {
            const mailHTML = `
            <div>
                <h1>Verify your email to start using Atrons</h1>
                <h2>Enter ${code} to activate your account </h2>
            </div>
            `;

            await this.transporter.sendMail({
                from: process.env.EMAIL,
                to: recepient,
                subject: `Verify your email`,
                html: mailHTML,
            });

            logger.info('verification email sent');
            console.log(mailHTML);
            return true;
        } catch (err) {
            console.log(err);
            logger.error(err);
        }
        return false;
    };

    async sendMaterialRemovedEmail(recepientInfo, matInfo) {
        try {
            const mailHTML = `
            <div>
                <h1>Atrons, material removal notice</h1>
                <h2>Dear ${recepientInfo.legal_name}, ${matInfo.title} ${matInfo.subtitle} 
                has been Removed as per your request</h2>
            </div>
            `;

            await this.transporter.sendMail({
                from: process.env.EMAIL,
                to: recepientInfo.email,
                subject: `Atrons, material removal notice`,
                html: mailHTML,
            });

            logger.info('verification email sent');
            console.log(mailHTML);
            return true;
        } catch (err) {
            console.log(err);
            logger.error(err);
        }
        return false;
    };

    async sendRequestDeniedEmail(recepientInfo, requestDescription) {
        try {
            const mailHTML = `
            <div>
                <h1>Atrons, Request denial notice</h1>
                <h2>Dear ${recepientInfo.legal_name}, Your request for ${requestDescription}
                has been Denied. Contact provider support for more.</h2>
            </div>
            `;
            await this.transporter.sendMail({
                from: process.env.EMAIL,
                to: recepientInfo.email,
                subject: `Atrons, material removal notice`,
                html: mailHTML,
            });

            logger.info('verification email sent');
            console.log(mailHTML);
            return true;
        } catch (err) {
            console.log(err);
            logger.error(err);
        }
        return false;
    }

    async sendWithdrawalEmail(recepientInfo, amount) {
        try {
            const mailHTML = `
            <div>
                <h1>Atrons, Withdrawal notice</h1>
                <h2>Dear ${recepientInfo.legal_name}, Your request for withdrawal of ETB ${amount}
                has been completed. Contact provider support for more.</h2>
            </div>
            `;
            await this.transporter.sendMail({
                from: process.env.EMAIL,
                to: recepientInfo.email,
                subject: `Atrons, material removal notice`,
                html: mailHTML,
            });

            logger.info('verification email sent');
            console.log(mailHTML);
            return true;
        } catch (err) {
            console.log(err);
            logger.error(err);
        }
        return false;
    }
}

const emailer = new EmailSender();
Object.freeze(emailer);

module.exports = emailer;