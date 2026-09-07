/**
 * Brevo (Sendinblue) Transactional Email Service for Tharbiyah SLMS
 * Uses Brevo REST API v3 to deliver emails.
 */

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailOptions {
  to: EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendBrevoEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string }> {
  const apiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM || "noreply.tharbiya@gmail.com";
  const senderName = process.env.BREVO_SENDER_NAME || "Darunnajath Tharbiyah";

  if (!apiKey) {
    console.warn("\n=======================================================");
    console.warn("⚠️ [BREVO EMAIL NOTICE] No BREVO_API_KEY found in .env");
    console.warn(`To: ${options.to.map((t) => `${t.name ? t.name + ' ' : ''}<${t.email}>`).join(", ")}`);
    console.warn(`Subject: ${options.subject}`);
    console.warn("HTML Preview generated.");
    console.warn("Add BREVO_API_KEY to your .env file to send live emails via Brevo.");
    console.warn("=======================================================\n");
    return { success: true, messageId: `mock_${Date.now()}` };
  }

  try {
    const payload = {
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: options.to.map((recipient) => ({
        email: recipient.email.trim().toLowerCase(),
        name: recipient.name || recipient.email,
      })),
      subject: options.subject,
      htmlContent: options.html,
      textContent: options.text || options.subject,
    };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey.trim(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseData: any = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("❌ Brevo API Error:", responseData);
      throw new Error(responseData?.message || `Brevo Email API failed with HTTP ${response.status}`);
    }

    console.log(`✅ [Brevo Email] Sent successfully to ${options.to.map((t) => t.email).join(", ")} (MessageId: ${responseData?.messageId})`);
    return { success: true, messageId: responseData?.messageId };
  } catch (error: any) {
    console.error("❌ Failed to send email via Brevo:", error?.message || error);
    throw error;
  }
}

/**
 * Generate a styled HTML email template for Muallim Password Reset
 */
export function generateResetPasswordEmailHtml(name: string, resetUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password - Tharbiyah</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #FAF8F2;
      color: #1F2933;
      margin: 0;
      padding: 0;
      line-height: 1.6;
    }
    .container {
      max-width: 580px;
      margin: 30px auto;
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid #E3EAE6;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #0F6B50 0%, #084C3A 100%);
      color: #ffffff;
      padding: 32px 28px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 6px 0 0 0;
      font-size: 13px;
      color: #DDEDE5;
    }
    .content {
      padding: 32px 28px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 700;
      color: #084C3A;
      margin-bottom: 16px;
    }
    .button-container {
      text-align: center;
      margin: 28px 0;
    }
    .button {
      display: inline-block;
      background-color: #0F6B50;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      font-size: 14px;
      font-weight: 700;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(15, 107, 80, 0.25);
    }
    .link-box {
      background: #FAF8F2;
      border: 1px solid #E3EAE6;
      border-radius: 12px;
      padding: 14px;
      word-break: break-all;
      font-size: 12px;
      color: #084C3A;
      margin: 18px 0;
    }
    .notice {
      background: #FBF4DE;
      border-left: 4px solid #C9A227;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 12px;
      color: #785E0E;
      margin-top: 24px;
    }
    .footer {
      background: #FAF8F2;
      border-top: 1px solid #E3EAE6;
      padding: 20px 28px;
      text-align: center;
      font-size: 11px;
      color: #667085;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Tharbiyah • തർബിയ്യ</h1>
      <p>Darunnajath Madrasa Mundambra — SLMS</p>
    </div>
    <div class="content">
      <div class="greeting">Assalamu Alaikum Usthad ${name},</div>
      <p>We received a request to reset the password for your Usthad faculty account on the Tharbiyah Madrasa Management platform.</p>
      
      <div class="button-container">
        <a href="${resetUrl}" target="_blank" class="button">Reset My Password</a>
      </div>

      <p style="font-size: 13px; color: #667085;">If the button above does not work, copy and paste the following URL into your web browser:</p>
      <div class="link-box">${resetUrl}</div>

      <div class="notice">
        <strong>Security Notice:</strong> This link is valid for 1 hour. If you did not request this password reset, please ignore this email or notify Sadhr Muallim immediately.
      </div>
    </div>
    <div class="footer">
      Darunnajath Higher Secondary Madrasa, Mundambra<br />
      Student Learning & Growth Management System (SLMS)
    </div>
  </div>
</body>
</html>
  `.trim();
}
