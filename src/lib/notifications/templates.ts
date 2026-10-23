import { siteConfig } from "@/config/site";
import { getSiteUrl } from "@/lib/env";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Renders a notification row into a branded, plain email. */
export function renderEmail(n: { subject: string; body: string; link_path: string | null }) {
  const url = n.link_path ? `${getSiteUrl()}${n.link_path}` : getSiteUrl();
  const footer = `You are receiving this because you have a ${siteConfig.name} account. Manage email preferences in your dashboard profile.`;
  const text = `${n.body}\n\nOpen ${siteConfig.name}: ${url}\n\n${footer}`;
  const html = `<!doctype html><html><body style="margin:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#0c1b33">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:16px;border:1px solid #e3e8ef">
<tr><td style="padding:28px 28px 8px;font-size:18px;font-weight:700">${escapeHtml(siteConfig.name)}</td></tr>
<tr><td style="padding:8px 28px;font-size:20px;font-weight:700">${escapeHtml(n.subject)}</td></tr>
<tr><td style="padding:8px 28px 20px;font-size:15px;line-height:24px;color:#33415c">${escapeHtml(n.body).replace(/\n/g, "<br>")}</td></tr>
<tr><td style="padding:0 28px 28px"><a href="${escapeHtml(url)}" style="display:inline-block;background:${siteConfig.colors.primary};color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px">Open ${escapeHtml(siteConfig.name)}</a></td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e3e8ef;font-size:12px;color:#5b6779">${escapeHtml(footer)}</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: n.subject, text, html };
}
