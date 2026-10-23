import "server-only";

import { after } from "next/server";
import { dispatchPendingEmails } from "./dispatcher";

export { dispatchPendingEmails } from "./dispatcher";
export { getEmailProvider } from "./providers";

/**
 * Database functions queue notifications in the same transaction as the
 * state change. This flushes the email outbox after the response is sent;
 * the scheduled job retries anything left pending.
 */
export function flushNotificationsSoon() {
  after(async () => {
    try {
      await dispatchPendingEmails(25);
    } catch (error) {
      console.error("email dispatch failed", error);
    }
  });
}
