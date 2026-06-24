import "server-only";

// Owner notification for landing-page access requests, sent via Resend's REST
// API (https://resend.com). Kept dependency-free with a plain fetch.
//
// Notes:
// - With the default `onboarding@resend.dev` sender, Resend only delivers to the
//   email tied to your Resend account. Since we email the operator, that's fine
//   without verifying a domain. Set RESEND_FROM once you verify a domain.
// - Best-effort: returns a result instead of throwing, so a mail failure never
//   loses the request (the row is already persisted by the caller).

const OWNER_FALLBACK = "lucasruiz1336@gmail.com";

export interface AccessRequestEmail {
  email: string;
  note?: string | null;
  ip?: string | null;
}

export async function sendAccessRequestEmail(
  payload: AccessRequestEmail
): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, reason: "missing_api_key" };
  }

  const to = process.env.ACCESS_REQUEST_NOTIFY_EMAIL ?? OWNER_FALLBACK;
  const from = process.env.RESEND_FROM ?? "Career Agent <onboarding@resend.dev>";

  const lines = [
    `New access request for Career Agent.`,
    ``,
    `Email: ${payload.email}`,
    payload.note ? `Note: ${payload.note}` : null,
    payload.ip ? `IP: ${payload.ip}` : null,
    ``,
    `Add this email as a Google OAuth test user to grant sign-in access.`,
  ].filter(Boolean);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: payload.email,
        subject: `Career Agent access request: ${payload.email}`,
        text: lines.join("\n"),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { sent: false, reason: `resend_${response.status}:${detail.slice(0, 120)}` };
    }

    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "unknown_error",
    };
  }
}
