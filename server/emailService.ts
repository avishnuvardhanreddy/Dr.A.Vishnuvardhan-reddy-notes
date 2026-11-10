import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface SendOtpResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string | false;
  error?: string;
}

// Configurable SMTP transporter via environment variables
let cachedTransporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter> {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  // 1. Check if custom SMTP environment variables are configured
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
    return cachedTransporter;
  }

  // 2. Fallback to automated Ethereal Email test account for real SMTP delivery testing
  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`[EMAIL SERVICE] Configured SMTP test transporter with Ethereal (${testAccount.user})`);
    return cachedTransporter;
  } catch (err) {
    console.warn('[EMAIL SERVICE] Failed to create test account, falling back to json transport:', err);
    // 3. Fallback to JSON transport
    cachedTransporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    return cachedTransporter;
  }
}

/**
 * Send 6-Digit OTP verification code to student's institutional email
 * @param toEmail The recipient @gprec.ac.in email address
 * @param otp The 6-digit numeric OTP code
 */
export async function sendOtpEmail(toEmail: string, otp: string): Promise<SendOtpResult> {
  try {
    const transporter = await getTransporter();
    const fromAddress = process.env.SMTP_FROM || '"GPREC Academic Hub" <noreply@gprec.ac.in>';

    const subject = `Your GPREC Academic Hub Verification Code: ${otp}`;
    const textContent = `Dear GPREC Student,

Your one-time authentication code for GPREC Academic Hub is: ${otp}

This code is valid for 10 minutes. If you did not request this login code, please disregard this email or report to the college system administrator.

G Pulla Reddy Engineering College (Autonomous)
Kurnool, Andhra Pradesh
https://www.gprec.ac.in
`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
    .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; font-size: 12px; color: #93c5fd; }
    .content { padding: 32px 24px; text-align: center; color: #334155; }
    .greeting { font-size: 15px; margin-bottom: 20px; color: #1e293b; }
    .otp-box { background: #eff6ff; border: 2px dashed #3b82f6; border-radius: 12px; padding: 18px 24px; margin: 24px auto; display: inline-block; }
    .otp-code { font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; font-family: monospace; }
    .expiry { font-size: 12px; color: #64748b; margin-top: 16px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>G. Pulla Reddy Engineering College</h1>
      <p>Autonomous Institution • Accredited by NAAC with 'A+' Grade</p>
    </div>
    <div class="content">
      <div class="greeting">
        <strong>Academic Hub Authentication</strong>
        <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
          A request to sign in to the GPREC Academic Hub was initiated for: <strong>${toEmail}</strong>
        </p>
      </div>

      <p style="font-size: 13px; color: #475569; margin-bottom: 8px;">Use the following 6-digit verification code to authenticate your session:</p>
      
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
      </div>

      <div class="expiry">
        ⏱ This verification code is single-use and will expire in <strong>10 minutes</strong>.
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0;">This is an automated system notification from GPREC Academic Hub.</p>
      <p style="margin: 4px 0 0;">G. Pulla Reddy Nagar, Nandyal Road, Kurnool – 518 007, AP, India</p>
    </div>
  </div>
</body>
</html>
`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[EMAIL DISPATCH] Sent OTP to ${toEmail}. Preview inbox at: ${previewUrl}`);
    } else {
      console.log(`[EMAIL DISPATCH] Sent OTP to ${toEmail}. Message ID: ${info.messageId}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || false,
    };
  } catch (err: any) {
    console.error(`[EMAIL ERROR] Failed to send OTP to ${toEmail}:`, err);
    return {
      success: false,
      error: err.message || 'Email delivery failed',
    };
  }
}
