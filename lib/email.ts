import nodemailer from 'nodemailer';

const port = Number(process.env.EMAIL_PORT) || 465

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port,
  secure: port === 465, // true for SSL on 465, false for STARTTLS on 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

interface Attachment {
  filename: string
  content: string | Buffer
  encoding?: string
  contentType?: string
}

export async function sendMail({
  to,
  subject,
  text,
  html,
  attachments,
}: {
  to: string
  subject: string
  text?: string
  html?: string
  attachments?: Attachment[]
}) {
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text,
    html,
    attachments,
  });
  return info;
}
