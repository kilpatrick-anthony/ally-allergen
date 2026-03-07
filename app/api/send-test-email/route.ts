import { sendMail } from '../../../lib/email';

export async function POST(req: Request) {
  const { to, subject, text, html } = await req.json();
  try {
    const info = await sendMail({ to, subject, text, html });
    return new Response(JSON.stringify({ success: true, info }), { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: message }), { status: 500 });
  }
}
