import "server-only";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type SendResult = { ok: true; id: string | null } | { ok: false; error: string; retryable: boolean };

export interface EmailProvider {
  readonly name: string;
  /** False means delivery is disabled (development mode). */
  readonly enabled: boolean;
  send(message: EmailMessage): Promise<SendResult>;
}

/** Resend (https://resend.com) over its HTTP API — no SDK dependency. */
class ResendProvider implements EmailProvider {
  readonly name = "resend";
  readonly enabled = true;
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<SendResult> {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: this.from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
        signal: AbortSignal.timeout(10_000),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      // Only a 2xx response with an id counts as accepted by the provider.
      if (res.ok && body.id) return { ok: true, id: body.id };
      return { ok: false, error: body.message ?? `HTTP ${res.status}`, retryable: res.status >= 500 || res.status === 429 };
    } catch (error) {
      return { ok: false, error: (error as Error).message, retryable: true };
    }
  }
}

/** Development mode: nothing is sent. Messages are logged and marked "skipped". */
class DisabledProvider implements EmailProvider {
  readonly name = "disabled";
  readonly enabled = false;
  async send(message: EmailMessage): Promise<SendResult> {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email disabled] to=${message.to} subject="${message.subject}"`);
    }
    return { ok: false, error: "Email delivery disabled: no provider configured", retryable: false };
  }
}

export function getEmailProvider(): EmailProvider {
  const provider = (process.env.EMAIL_PROVIDER ?? "").toLowerCase();
  const from = process.env.EMAIL_FROM;
  if (provider === "resend" && process.env.RESEND_API_KEY && from) {
    return new ResendProvider(process.env.RESEND_API_KEY, from);
  }
  return new DisabledProvider();
}
