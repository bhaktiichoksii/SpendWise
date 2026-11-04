
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
    text: `Your SpendWise verification code is ${otp}. It expires in 5 minutes. Do not share this code with anyone.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; color: #32174D;">
        <h2>SpendWise Security</h2>
        <p>We detected a login from a new device.</p>
        <p>Your verification code is:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 18px; background: #F5F3F8; text-align: center; border-radius: 10px;">
          ${otp}
        </div>
        <p>This code expires in <strong>5 minutes</strong>.</p>
        <p>If you did not attempt to log in, you can ignore this email.</p>
        <hr />
        <small>SpendWise Security Team</small>
      </div>
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
    text: `Your email change verification code is ${otp}. It expires in 5 minutes. Do not share this code with anyone.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; color: #32174D;">
        <h2>SpendWise Email Verification</h2>
        <p>You requested to change your SpendWise account email.</p>
        <p>Your verification code is:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 18px; background: #F5F3F8; text-align: center; border-radius: 10px;">
          ${otp}
        </div>
        <p>This code expires in <strong>5 minutes</strong>.</p>
        <p>If you did not request this change, ignore this email.</p>
        <hr />
        <small>SpendWise Security Team</small>
      </div>
    `
  });
}

module.exports = {
  sendOtpEmail,
  sendEmailChangeOtp
};
