const nodemailer = require('nodemailer');

async function sendOtpEmail(email, otp) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS?.replace(/\s/g, '');
  if (!user || !pass) {
    throw new Error('Email delivery is not configured. Add the Gmail app password to SMTP_PASS in .env.');
  }
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user, pass },
    connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000
  });
  try {
    const result = await transport.sendMail({
      from: { name: 'ELENOR', address: user },
      to: email,
      subject: 'Your ELENOR verification code',
      text: `Your ELENOR verification code is ${otp}. It expires in 5 minutes. If you did not request this code, ignore this email.`
    });
    if (!result.accepted?.length) throw new Error('Recipient was not accepted.');
  } catch (error) {
    // Keep SMTP credentials and raw provider responses out of application logs.
    throw new Error('Unable to send the verification email. Check the sender settings and try again.');
  } finally {
    transport.close();
  }
}

module.exports = sendOtpEmail;
