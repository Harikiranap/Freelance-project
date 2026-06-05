const nodemailer = require('nodemailer');

let transporter;

const setupTransporter = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log("Real Email Setup Completed with provided credentials.");
  } else {
    const account = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: {
        user: account.user,
        pass: account.pass
      }
    });
    console.log("Mock Email Setup Completed. Check ethereal.email for emails.");
  }
};

setupTransporter();

const sendEmail = async (to, subject, text, html) => {
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: '"WorkSphere" <noreply@worksphere.com>',
        to,
        subject,
        text,
        html
      });
      console.log("Email Sent! View it here: " + nodemailer.getTestMessageUrl(info));
      return info;
    } catch (error) {
      console.error("Error sending email:", error);
    }
  } else {
    console.log("Email transporter not ready yet.");
  }
};

module.exports = { sendEmail, getTransporter: () => transporter };
