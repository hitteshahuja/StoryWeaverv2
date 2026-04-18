const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(to, subject, html) {
    try {
        const response = await resend.emails.send({
            from: 'DreamWeaver <email@storyweaverv2-production.up.railway.app> ',
            to,
            subject,
            html,
        });
        console.log('Email sent:', response);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

module.exports = { sendEmail };