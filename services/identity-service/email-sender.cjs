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

module.exports = {
  emailConfigurationAvailable,
  passwordResetDevMode,
  sendPasswordResetLink,
};
