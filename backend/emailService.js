
const SCRIPT_URL = process.env.SPENDWISE_SCRIPT_URL;
const SPENDWISE_SECRET = process.env.SPENDWISE_SECRET;

async function sendEmail(receiverEmail, otp, type) {
  if (!SCRIPT_URL || !SPENDWISE_SECRET) {
    throw new Error("SpendWise email service configuration is missing.");
  }

  const response = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      secret: SPENDWISE_SECRET,
      receiverEmail,
      otp,
      type
    }),
    signal: AbortSignal.timeout(20000)
  });

  if (!response.ok) {
    throw new Error("Email service request failed.");
  }

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("Invalid response from email service.");
  }

  if (!result.success) {
    throw new Error(result.message || "Unable to send email.");
  }

  return result;
}

async function sendOtpEmail(receiverEmail, otp) {
  return sendEmail(receiverEmail, otp, "register");
}

async function sendEmailChangeOtp(receiverEmail, otp) {
  return sendEmail(receiverEmail, otp, "email-change");
}

async function sendPasswordResetOtp(receiverEmail, otp) {
  return sendEmail(receiverEmail, otp, "password-reset");
}

module.exports = {
  sendOtpEmail,
  sendEmailChangeOtp,
  sendPasswordResetOtp
};
