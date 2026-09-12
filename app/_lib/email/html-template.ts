// app/_lib/email/html-template.ts
//
// Provider-agnostic HTML templating helpers (used to be part of
// resend-client.tsx — extracted since Mailchimp Transactional/Marketing
// both consume plain HTML strings, no SDK-specific typing needed here).

export interface TemplateOptions {
  body: string; // HTML from rich text editor
  subject: string;
  senderName: string;
  preheader?: string;
  unsubscribeUrl?: string;
  variables?: Record<string, string>; // {first_name: "John", ...}
}

/**
 * Replaces {variable} tokens in content with actual values.
 */
export function replaceVariables(
  content: string,
  variables: Record<string, string>,
): string {
  return content.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key] ?? match;
  });
}

export function isFullHtml(html: string): boolean {
  const trimmed = html.trimStart().toLowerCase();
  return trimmed.startsWith("<!doctype") || trimmed.startsWith("<html");
}

/**
 * Generates a professional, inbox-safe HTML email template.
 * All styles are inlined for maximum email client compatibility.
 */
export function generateEmailTemplate(options: TemplateOptions): string {
  const {
    body,
    senderName,
    preheader = "",
    unsubscribeUrl,
    variables,
  } = options;

  const processedBody = variables ? replaceVariables(body, variables) : body;

  if (isFullHtml(processedBody)) {
    return processedBody;
  }

  const unsubscribeSection = unsubscribeUrl
    ? `<tr>
        <td style="padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            You're receiving this because you signed up for updates from <strong>${senderName}</strong>.<br/>
            <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>
            &nbsp;·&nbsp;
            <a href="${unsubscribeUrl}?manage=1" style="color:#6b7280;text-decoration:underline;">Manage preferences</a>
          </p>
        </td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <title></title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-spacing: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    td { padding: 0; }
    img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; max-width: 100%; height: auto; }
    .email-body h1 { font-size: 28px; font-weight: 700; margin: 0 0 16px; color: #111827; }
    .email-body h2 { font-size: 22px; font-weight: 600; margin: 0 0 14px; color: #111827; }
    .email-body h3 { font-size: 18px; font-weight: 600; margin: 0 0 12px; color: #111827; }
    .email-body p  { margin: 0 0 16px; }
    .email-body a  { color: #2563eb; text-decoration: underline; }
    .email-body ul, .email-body ol { margin: 0 0 16px; padding-left: 24px; }
    .email-body li { margin-bottom: 6px; }
    .email-body blockquote { margin: 0 0 16px; padding: 12px 16px; border-left: 4px solid #e5e7eb; color: #6b7280; }
    .email-body strong { font-weight: 700; }
    .email-body em { font-style: italic; }
    .email-body img { max-width: 100%; height: auto; border-radius: 6px; display: block; }
    .email-body table { width: 100%; border-collapse: collapse; margin: 0 0 16px; }
    .email-body table td, .email-body table th { padding: 8px 12px; border: 1px solid #e5e7eb; }
    .email-body table th { background: #f9fafb; font-weight: 600; }
    .email-body hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    @media only screen and (max-width: 600px) {
      .email-wrapper { width: 100% !important; }
      .email-content { padding: 20px 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>` : ""}
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:24px 8px;">
        <table class="email-wrapper" width="600" cellpadding="0" cellspacing="0" role="presentation"
               style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td class="email-content" style="padding:32px 40px;color:#374151;font-size:15px;line-height:1.7;">
              <div class="email-body">${processedBody}</div>
            </td>
          </tr>
          <tr><td style="height:16px;"></td></tr>
          ${unsubscribeSection}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
