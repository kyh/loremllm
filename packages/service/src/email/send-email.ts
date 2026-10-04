import { env } from "../env";

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
}

// Plain fetch rather than the `resend` SDK: one endpoint, no dependency.
export const sendEmail = async ({ to, subject, text }: SendEmailInput) => {
  const apiKey = env.RESEND_API_KEY;

  if (!apiKey) {
    console.info(
      `[email] RESEND_API_KEY not set — logging instead of sending\nto: ${to}\nsubject: ${subject}\n${text}`,
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({ from: env.EMAIL_FROM, subject, text, to }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to send email (${response.status}): ${await response.text()}`);
  }
};
