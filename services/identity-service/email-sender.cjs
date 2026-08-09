const nodemailer = require("nodemailer");

function emailConfigurationAvailable() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_APP_PASSWORD);
}

function passwordResetDevMode() {
  return process.env.NODE_ENV !== "production" || process.env.PASSWORD_RESET_DEV_MODE === "true";
}

function createTransporter() {
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_APP_PASSWORD,
    },
  });
}

async function sendPasswordResetLink({ to, resetUrl }) {
  if (!emailConfigurationAvailable()) {
    if (!passwordResetDevMode()) {
      throw new Error("Gmail SMTP is not configured for password reset emails");
    }
    return { delivered: false };
  }

  const safeUrl = resetUrl.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  await createTransporter().sendMail({
    from: process.env.MAIL_FROM || `NhàHợp <${process.env.SMTP_USER}>`,
    to,
    subject: "Đặt lại mật khẩu NhàHợp",
    text: `Bạn vừa yêu cầu đặt lại mật khẩu NhàHợp. Mở liên kết sau trong vòng 10 phút: ${resetUrl}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;line-height:1.6">
        <h1 style="font-size:24px;margin-bottom:16px">Đặt lại mật khẩu NhàHợp</h1>
        <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản NhàHợp.</p>
        <p style="margin:28px 0">
          <a href="${safeUrl}" style="display:inline-block;background:#ea580c;color:#fff;padding:13px 22px;border-radius:6px;text-decoration:none;font-weight:700">
            Tạo mật khẩu mới
          </a>
        </p>
        <p>Liên kết chỉ có hiệu lực trong 10 phút và chỉ được sử dụng một lần.</p>
        <p style="color:#64748b">Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email. Mật khẩu hiện tại vẫn được giữ nguyên.</p>
      </div>
    `,
  });

  return { delivered: true };
}

async function sendEmailVerificationLink({ to, verificationUrl }) {
  if (!emailConfigurationAvailable()) {
    if (!passwordResetDevMode()) {
      throw new Error("Gmail SMTP is not configured for verification emails");
    }
    return { delivered: false };
  }

  const safeUrl = verificationUrl.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  await createTransporter().sendMail({
    from: process.env.MAIL_FROM || `NhàHợp <${process.env.SMTP_USER}>`,
    to,
    subject: "Kích hoạt tài khoản NhàHợp",
    text: `Chào mừng bạn đến với NhàHợp. Mở liên kết sau trong vòng 24 giờ để kích hoạt tài khoản: ${verificationUrl}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;line-height:1.6">
        <h1 style="font-size:24px;margin-bottom:16px">Kích hoạt tài khoản NhàHợp</h1>
        <p>Cảm ơn bạn đã đăng ký. Hãy xác minh địa chỉ email để hoàn tất việc tạo tài khoản.</p>
        <p style="margin:28px 0">
          <a href="${safeUrl}" style="display:inline-block;background:#ea580c;color:#fff;padding:13px 22px;border-radius:6px;text-decoration:none;font-weight:700">
            Kích hoạt tài khoản
          </a>
        </p>
        <p>Liên kết có hiệu lực trong 24 giờ và chỉ được sử dụng một lần.</p>
        <p style="color:#64748b">Nếu bạn không đăng ký NhàHợp, hãy bỏ qua email này.</p>
      </div>
    `,
  });

  return { delivered: true };
}

module.exports = {
  emailConfigurationAvailable,
  passwordResetDevMode,
  sendEmailVerificationLink,
  sendPasswordResetLink,
};
