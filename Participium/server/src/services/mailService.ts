import * as nodemailer from "nodemailer";
import { CONFIG } from "@config";

const transporter = nodemailer.createTransport({
  host: CONFIG.SMTP_CONFIG.HOST,
  port: CONFIG.SMTP_CONFIG.PORT,
  secure: CONFIG.SMTP_CONFIG.PORT === 465,
  auth: {
    user: CONFIG.SMTP_CONFIG.USER,
    pass: CONFIG.SMTP_CONFIG.PASS,
  },
});

export async function sendMail(opts: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}): Promise<string> {
  const info = await transporter.sendMail({
    from: opts.from || process.env.MAIL_FROM || CONFIG.SMTP_CONFIG.USER,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
  return info.messageId;
}