// The Duka brand at the top of every Duka email (setup reminders,
// campaigns): the cart "d" mark + "Duka", like the website header.
//
// To change the logo: replace public/email-logo.png (keep it a PNG about
// 96px tall: email apps don't show SVG), or point EMAIL_LOGO_URL at any
// public PNG. It must be a full https:// address that's already live,
// because email apps load it from the internet.

import { getAppUrl } from "@/lib/paystack";

export function emailLogoUrl(): string {
  return process.env.EMAIL_LOGO_URL || `${getAppUrl()}/email-logo.png`;
}

/** Logo row for the top of an email. */
export function emailHeader(): string {
  const home = getAppUrl();
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px"><tr>
<td style="vertical-align:middle;padding-right:8px"><a href="${home}" style="text-decoration:none"><img src="${emailLogoUrl()}" width="20" height="32" alt="Duka" style="display:block;border:0;height:32px;width:auto"></a></td>
<td style="vertical-align:middle"><a href="${home}" style="text-decoration:none;font-size:22px;font-weight:900;letter-spacing:.02em;color:#18181b">DUKA</a></td>
</tr></table>`;
}
