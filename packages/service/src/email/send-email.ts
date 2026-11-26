import { env } from "../env";

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
}

type EmailMode =
  | {
      readonly kind: "resend";
      readonly apiKey: string;
      readonly from: string;
      readonly endpoint: string;
    }
  | { readonly kind: "log" }
  | { readonly kind: "off" };

type EmailSettings = Pick<typeof env, "EMAIL_FROM" | "RESEND_API_KEY">;

export const emailModeOf = ({ EMAIL_FROM, RESEND_API_KEY }: EmailSettings, production: boolean) => {
  if (RESEND_API_KEY !== undefined && RESEND_API_KEY !== "") {
    return {
      apiKey: RESEND_API_KEY,
      endpoint: "https://api.resend.com/emails",
      from: EMAIL_FROM,
      kind: "resend",
    } satisfies EmailMode;
  }

  return (production ? { kind: "off" } : { kind: "log" }) satisfies EmailMode;
};

export const EMAIL_MODE: EmailMode = emailModeOf(env, process.env.NODE_ENV === "production");

export const EMAIL_OFF_WARNING =
  "This deployment sends no email (RESEND_API_KEY is unset): password reset is refused.";

export const sendEmail = async ({ to, subject, text }: SendEmailInput, mode = EMAIL_MODE) => {
  if (mode.kind === "off") {
    console.warn(`[email] "${subject}" not sent: this deployment sends no email`);

    return "off" as const;
  }

  if (mode.kind === "log") {
    console.info(
      `[email] RESEND_API_KEY not set — logging instead of sending\nto: ${to}\nsubject: ${subject}\n${text}`,
    );

    return "logged" as const;
  }

  const response = await fetch(mode.endpoint, {
    body: JSON.stringify({ from: mode.from, subject, text, to }),
    headers: {
      Authorization: `Bearer ${mode.apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to send email (${response.status}): ${await response.text()}`);
  }

  return "sent" as const;
};
