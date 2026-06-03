const nodemailer = require('nodemailer');

let transporter;
nodemailer.createTestAccount().then(account => {
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
});

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
