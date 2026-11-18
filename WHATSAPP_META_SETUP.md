# WhatsApp shop: Meta setup, testers and App Review

How to get Duka's "Connect WhatsApp" working for every vendor in production.
Duka is a **Tech Provider**: one Meta app, owned by Duka's business, that
vendors connect their own WhatsApp numbers to.

> Meta renames menu items often. If a label below doesn't match exactly, look
> for the closest one in the same section.

**Why vendors see an error today:** until the app is reviewed, has Advanced
access and is switched to **Live**, only people with a role on the app (admin,
developer, tester) can finish the WhatsApp signup. Everyone else gets "Feature
unavailable", "This app isn't available" or a popup that never finishes.

---

## Contents

1. [Verify the business](#1-verify-the-business)
2. [Create the app](#2-create-the-app)
3. [App settings → Basic](#3-app-settings--basic)
4. [Webhook](#4-webhook)
5. [Facebook Login for Business settings](#5-facebook-login-for-business-settings)
6. [Signup configuration (config ID)](#6-signup-configuration-config-id)
7. [Production environment variables](#7-production-environment-variables)
8. [Add testers](#8-add-testers)
9. [Test before review](#9-test-before-review)
10. [Record the screen recording](#10-record-the-screen-recording)
11. [Submit App Review](#11-submit-app-review)
12. [Go live](#12-go-live)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Verify the business

This takes the longest, so start here. At **business.facebook.com → Settings**:

1. **Business info.** Legal name exactly as on the CAC certificate, address,
   phone, website `https://dukanigeria.com`.
2. **Security Center → Start verification.** Upload the CAC certificate and one
   proof of address (utility bill or bank statement). Approval takes from a few
   days to two weeks.
3. **Brand safety → Domains → Add** `dukanigeria.com`, choose **Meta-tag
   verification** and click **Verify**. The tag is already on the site
   (`facebook-domain-verification` in `src/app/layout.tsx`).

## 2. Create the app

At **developers.facebook.com → My Apps → Create app**:

1. **Use case:** "Connect with customers through WhatsApp". If it isn't listed,
   choose **Other**, then app type **Business**.
2. **App name:** `Duka`.
3. **Business portfolio:** the verified business from step 1.

## 3. App settings → Basic

| Field | Value |
|---|---|
| Display name | Duka |
| App domains | `dukanigeria.com`, `www.dukanigeria.com` |
| Contact email | support email |
| Privacy policy URL | `https://dukanigeria.com/privacy` |
| Terms of service URL | `https://dukanigeria.com/terms` |
| Data deletion callback URL | `https://dukanigeria.com/api/meta/data-deletion` |
| App icon | Duka logo, 1024×1024 |
| Category | Business and pages (or Shopping) |
| **+ Add platform → Website** | Site URL `https://dukanigeria.com` |

Copy the **App ID** into `META_APP_ID` and the **App secret** (click **Show**)
into `META_APP_SECRET`.

## 4. Webhook

This is how customers' WhatsApp messages reach Duka. At **WhatsApp →
Configuration → Webhook → Edit**:

1. **Callback URL:** `https://dukanigeria.com/api/meta/webhook`
2. **Verify token:** a long random string you make up. Put the same string in
   `META_WEBHOOK_VERIFY_TOKEN`, **deploy first**, then click **Verify and save**.
3. **Webhook fields → Subscribe:** `messages`. That's the only field Duka uses.

Each vendor's WhatsApp account is linked to this webhook automatically when
they connect.

## 5. Facebook Login for Business settings

At **Facebook Login for Business → Settings**:

| Setting | Value |
|---|---|
| Client OAuth login | Yes |
| Web OAuth login | Yes |
| Enforce HTTPS | Yes |
| Use strict mode for redirect URIs | Yes |
| Valid OAuth redirect URIs | `https://dukanigeria.com/api/meta/es-callback` (add the `www.` version if the site is ever served on it) |
| Login with the JavaScript SDK | **Yes** |
| Allowed domains for the JavaScript SDK | `https://dukanigeria.com`, `https://www.dukanigeria.com` |

If the JavaScript SDK domains are missing, the popup shows "Can't load URL" or
"domain isn't included".

## 6. Signup configuration (config ID)

At **Facebook Login for Business → Configurations → Create configuration**:

1. **Name:** `Duka WhatsApp signup`
2. **Login variation:** WhatsApp Embedded Signup
3. **Access token:** System-user access token, expiry **Never**
4. **Assets:** WhatsApp accounts, plus **Catalogs** if offered
5. **Permissions:**
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
   - `business_management`
   - `catalog_management`

Copy the **Configuration ID** into `META_ES_CONFIG_ID`.

**Optional:**

- **Hosted signup link** (powers the "Use Meta's signup page" fallback): under
  **WhatsApp → Embedded Signup**, generate a hosted link with redirect URI
  `https://dukanigeria.com/api/meta/es-callback` and put it in
  `META_ES_HOSTED_URL`.
- **Numbers already on the WhatsApp Business app:** set
  `META_ES_FEATURE_TYPE=whatsapp_business_app_onboarding`. Duka then skips
  re-registering the number, which would otherwise fail.

## 7. Production environment variables

```
META_APP_ID=                 # step 3
META_APP_SECRET=             # step 3
META_WEBHOOK_VERIFY_TOKEN=   # step 4 (a string you make up)
META_TOKEN_ENCRYPTION_KEY=   # 64 hex characters: openssl rand -hex 32
META_ES_CONFIG_ID=           # step 6
META_ES_HOSTED_URL=          # optional, step 6
META_ES_FEATURE_TYPE=        # optional, step 6

# Optional: Meta's free test number (step 9)
WHATSAPP_TEST_PHONE_NUMBER_ID=
WHATSAPP_TEST_WABA_ID=
WHATSAPP_TEST_ACCESS_TOKEN=
```

> Generate `META_TOKEN_ENCRYPTION_KEY` once and **never change it**. Vendors'
> saved WhatsApp tokens are encrypted with it and would stop working.

Restart or redeploy the app after changing these.

## 8. Add testers

While the app is in Development mode, only people with a role on it can
connect WhatsApp. Add everyone who needs to test, and the account you'll use
for the screen recording.

### 8.1 The person you're adding: one-time preparation

They need a Facebook account registered as a Meta developer:

1. Log in to Facebook with that account.
2. Open **developers.facebook.com** and click **Get started** (or **Log in**).
3. Accept the terms and verify the account if asked (phone number, sometimes a
   card).
4. Find their **Facebook username** or **user ID**: on Facebook, go to
   **Profile → ⋯ → Copy profile link**. The part after `facebook.com/` is the
   username, or use the number after `id=`.

### 8.2 You (app admin): send the invitation

1. Go to **developers.facebook.com → My Apps** and open the **Duka** app.
2. In the left menu, open **App roles → Roles**.
3. Click **Add people** (or **Add testers**).
4. Choose the role:
   - **Tester:** can use the app (connect WhatsApp) but can't change settings.
     Use this for anyone who's just testing.
   - **Developer:** can also see and edit most settings.
   - **Administrator:** full control. Keep this to yourself and one backup
     person.
5. Type their Facebook **username or user ID** from 8.1 and select them.
6. Click **Add** or **Submit**. They now show as **Pending**.

### 8.3 The person you added: accept

1. Log in to Facebook with the invited account.
2. Open **developers.facebook.com/requests**. A notification also appears on
   the developer site.
3. Click **Confirm** on the Duka invitation.
4. Back on **App roles → Roles**, their status changes from Pending to their
   role.

### 8.4 If they can't be found

- They haven't finished 8.1 (not registered as a Meta developer yet).
- You typed the display name instead of the username or ID. Use the ID from
  the profile link.
- Their account is new or restricted. Try another account.

> Testers only need an app role to **connect** WhatsApp. They don't need access
> to Duka's business portfolio: in the popup they log in with their own
> Facebook account and pick or create their own business and WhatsApp account.

## 9. Test before review

1. Sign in to Duka with a vendor account that has a store with a few products
   (with photos).
2. Make sure the Facebook account you'll use in the popup is an **Admin,
   Developer or Tester** (step 8).
3. Go to Dashboard → **WhatsApp shop** → **Connect WhatsApp**, log in to
   Facebook in the popup, choose the business, WhatsApp account and phone
   number, then **Finish**.
4. Duka should show **Connected**.
5. From another phone, send **Hi** to the connected number. The bot should
   reply with the shop menu.

**Phone number to use:** a spare number that isn't on any WhatsApp account, or
a number on the WhatsApp Business app if `META_ES_FEATURE_TYPE` is set
(step 6).

**No number yet?**

- **Meta's free test number:** under **WhatsApp → API Setup**, copy the test
  number's IDs and token into the `WHATSAPP_TEST_*` variables (step 7).
- **The simulator:** Dashboard → WhatsApp shop → **Try it yourself** runs the
  same bot on the store's products without any Meta setup.

## 10. Record the screen recording

App Review asks for one video showing the permissions in use. Record it with
the tester or admin account from step 8, since that's the only account that
works before review.

**Settings:** English, 1080p, 3–5 minutes, no music, mouse clicks visible.
Reviewers watch without sound, so add short on-screen captions (e.g.
"Merchant connects their WhatsApp number").

**Record this, in one continuous take:**

| # | Show | Proves |
|---|---|---|
| 1 | Open `dukanigeria.com` and sign in as the vendor | |
| 2 | Dashboard → **WhatsApp shop** → **Connect WhatsApp** | |
| 3 | In the Facebook popup: log in, choose the business, choose or create the WhatsApp account, pick the phone number, **Finish** | `whatsapp_business_management` |
| 4 | Duka shows **Connected** | `whatsapp_business_management` |
| 5 | Click **Sync catalog**, show the success message | `catalog_management`, `business_management` |
| 6 | On a phone (screen-mirrored or filmed), send **Hi** to the number and show the bot's menu | `whatsapp_business_messaging` |
| 7 | **Browse products** → open a product → **Add to cart** → **Checkout** → the checkout page opens | `whatsapp_business_messaging` |
| 8 | Optional: open WhatsApp's catalog view and show the synced products | `catalog_management` |

Write down the timestamp of each step. You'll reference them in the review
form.

## 11. Submit App Review

At **App Review → Permissions and features**, request **Advanced access** for
each permission below. Attach the same video to each, add a description, and
give the timestamps where that permission appears.

| Permission | Description (adapt as needed) |
|---|---|
| `whatsapp_business_management` | Duka is an e-commerce platform for Nigerian small businesses. When a merchant clicks *Connect WhatsApp* in their Duka dashboard, we use this permission to read the WhatsApp Business account and phone number they chose, register the number, and subscribe it to our webhook so their store can reply to customers. Shown at 0:40–1:30. |
| `whatsapp_business_messaging` | We send replies on behalf of the merchant only after their customer messages them: a product menu, product details, a cart and a checkout link, plus status updates for orders the customer placed. Shown at 2:00–3:30. |
| `catalog_management` | We create the merchant's WhatsApp product catalog and keep it in sync with their Duka products (name, price, photo, stock) so customers can browse it inside WhatsApp. Shown at 1:30–2:00. |
| `business_management` | We create a product catalog in the merchant's business portfolio and link it to their WhatsApp account during setup. Shown at 1:30–2:00. |

**Also complete:**

1. **Reviewer instructions / test credentials:** a Duka vendor email and
   password, the store to look at, and the steps: "Sign in → Dashboard →
   WhatsApp shop → Connect WhatsApp".
2. **Data handling questions** (App Review → Data handling).
3. **Access verification** (Tech Provider check), if the dashboard lists it.
   This needs the verified business from step 1.

Then click **Submit for review**. Meta usually answers within a few days. If
they reject it, the message says what to change. Fix it, re-record if asked,
and resubmit.

## 12. Go live

After approval:

1. Toggle **App mode** (top bar) from **Development** to **Live**.
2. Test with a Facebook account that has **no role** on the app. That's the
   real check that vendors can connect.
3. Keep your own account and at least one backup admin under **App roles**.

**Cost to vendors:** replies to customers who message them first are
currently free from Meta, and that's all the bot sends. Only
business-initiated messages (e.g. marketing templates) are charged.

## 13. Troubleshooting

| Error | Where | Cause and fix |
|---|---|---|
| "Feature unavailable" / "This app isn't available" | Facebook popup | App not Live, or the account has no role. Add a tester (step 8) or finish review and go live (steps 11–12). |
| "Can't load URL" / "domain isn't included" | Facebook popup | JavaScript SDK domains or app domains missing. Check steps 3 and 5. |
| "Invalid redirect URI" | After the hosted signup link | Redirect URI in step 5 must be exactly `https://dukanigeria.com/api/meta/es-callback`. |
| Popup closes, Duka says "Connection wasn't finished" | Duka | The **Finish** button on the last popup step wasn't pressed. Try again. |
| "Pick or add a phone number…" | Duka | No phone number was chosen in the popup. |
| "Couldn't link your WhatsApp account…" | Duka | Meta refused to link the account. Usually missing `whatsapp_business_management` access (steps 6 and 11). |
| Connected, but the bot doesn't reply | WhatsApp | Webhook not verified or `messages` not subscribed (step 4), or the store's WhatsApp add-on isn't active. |
| Catalog sync fails | Duka | Missing `catalog_management` or `business_management` (steps 6 and 11). |
| "WhatsApp selling isn't switched on yet" | Duka | Environment variables missing on the server (step 7). |
