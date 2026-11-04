const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

async function sendOtpEmail(receiverEmail, otp) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    throw new Error("Email configuration is missing.");
  }

  await transporter.sendMail({
    from: `"SpendWise Security" <${process.env.EMAIL_USER}>`,
    to: receiverEmail,
    subject: "Your SpendWise Verification Code",
    text: `Your SpendWise verification code is ${otp}. It expires in 5 minutes.`,
    html: `
      <h2>SpendWise Security</h2>
      <p>Your verification code is:</p>
      <h1>${otp}</h1>
      <p>This code expires in 5 minutes.</p>
    `
  });
}

async function sendEmailChangeOtp(receiverEmail, otp) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    throw new Error("Email configuration is missing.");
  }

  await transporter.sendMail({
    from: `"SpendWise Security" <${process.env.EMAIL_USER}>`,
    to: receiverEmail,
    subject: "Verify Your New SpendWise Email",
    text: `Your email change verification code is ${otp}. It expires in 5 minutes.`,
    html: `
      <h2>SpendWise Email Verification</h2>
      <h1>${otp}</h1>
      <p>This code expires in 5 minutes.</p>
    `
  });
}

async function sendPasswordResetOtp(receiverEmail, otp) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    throw new Error("Email configuration is missing.");
  }

  await transporter.sendMail({
    from: `"SpendWise Security" <${process.env.EMAIL_USER}>`,
    to: receiverEmail,
    subject: "Reset Your SpendWise Password",
    text: `Your password reset code is ${otp}. It expires in 5 minutes. Do not share this code.`,
    html: `
      <div style="font-family: Arial; padding: 24px; color: #32174D;">
        <h2>SpendWise Password Reset</h2>
        <p>You requested to reset your password.</p>
        <h1 style="letter-spacing: 8px;">${otp}</h1>
        <p>This code expires in 5 minutes.</p>
        <p>If you did not request this, ignore this email.</p>
      </div>
    `
  });
}

module.exports = {
  sendOtpEmail,
  sendEmailChangeOtp,
  sendPasswordResetOtp
};