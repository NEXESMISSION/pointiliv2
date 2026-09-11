import "server-only";

export type SmsOutcome = { sent: true } | { sent: false; devCode?: string };

/**
 * Sends a password-reset code. Twilio when configured; otherwise the code is
 * written to the server log, and — in development only — handed back so the
 * screen can show it. In production without a provider nothing is exposed.
 */
export async function sendResetCode(phone: string, code: string): Promise<SmsOutcome> {
  const body = `Pointili: your password reset code is ${code}. It expires in 10 minutes.`;

  if (process.env.SMS_PROVIDER === "twilio" && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone, From: process.env.TWILIO_FROM, Body: body }),
    });
    if (res.ok) return { sent: true };
    console.error("[sms] twilio failed", res.status, await res.text().catch(() => ""));
    return { sent: false };
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[sms:dev] to ${phone}: ${body}`);
    return { sent: false, devCode: code };
  }
  console.warn("[sms] no SMS provider configured; reset code not delivered");
  return { sent: false };
}

export function smsConfigured() {
  return process.env.SMS_PROVIDER === "twilio" && !!process.env.TWILIO_ACCOUNT_SID;
}
