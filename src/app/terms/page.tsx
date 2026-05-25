import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use & Privacy Policy",
  description:
    "DUKA Terms of Use and Privacy Policy — Powered by Awarizon. Review our platform rules, vendor responsibilities, and data practices.",
};

const TOC = [
  { href: "#terms",           label: "Terms of Use" },
  { href: "#t1",              label: "1. About DUKA",             indent: true },
  { href: "#t2",              label: "2. Eligibility",            indent: true },
  { href: "#t3",              label: "3. Vendor Responsibility",  indent: true },
  { href: "#t4",              label: "4. Platform Disclaimer",    indent: true },
  { href: "#t5",              label: "5. Payments",               indent: true },
  { href: "#t6",              label: "6. Affiliate Program",      indent: true },
  { href: "#t7",              label: "7. Intellectual Property",  indent: true },
  { href: "#t8",              label: "8. Content Moderation",     indent: true },
  { href: "#t9",              label: "9. Liability",              indent: true },
  { href: "#t10",             label: "10. Termination",           indent: true },
  { href: "#t11",             label: "11. Third-Party Services",  indent: true },
  { href: "#t12",             label: "12. Changes to Terms",      indent: true },
  { href: "#t13",             label: "13. Contact",               indent: true },
  { href: "#privacy",         label: "Privacy Policy" },
  { href: "#p1",              label: "1. Information We Collect", indent: true },
  { href: "#p2",              label: "2. How We Use It",          indent: true },
  { href: "#p3",              label: "3. Storefront Visibility",  indent: true },
  { href: "#p4",              label: "4. Push Notifications",     indent: true },
  { href: "#p5",              label: "5. Cookies & Analytics",    indent: true },
  { href: "#p6",              label: "6. Data Security",          indent: true },
  { href: "#p7",              label: "7. Third-Party Services",   indent: true },
  { href: "#p8",              label: "8. Data Retention",         indent: true },
  { href: "#p9",              label: "9. User Rights",            indent: true },
  { href: "#p10",             label: "10. Children's Privacy",    indent: true },
  { href: "#p11",             label: "11. Policy Updates",        indent: true },
  { href: "#p12",             label: "12. Contact",               indent: true },
];

function H1({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h1
      id={id}
      className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight scroll-mt-24"
    >
      {children}
    </h1>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="text-xl font-bold text-zinc-800 dark:text-zinc-100 mt-10 mb-3 scroll-mt-24"
    >
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
      {children}
    </p>
  );
}

function UL({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-inside space-y-1 text-zinc-600 dark:text-zinc-400 mb-4 pl-1">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function Divider() {
  return <hr className="border-zinc-200 dark:border-zinc-800 my-12" />;
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Top bar */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center text-zinc-900 font-black text-sm">
              D
            </span>
            <span className="font-extrabold text-zinc-900 dark:text-white">DUKA</span>
            <span className="text-zinc-400 text-sm font-medium hidden sm:block">
              by Awarizon
            </span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <a href="#terms"   className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">Terms</a>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <a href="#privacy" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">Privacy</a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12 flex gap-12">
        {/* Sticky sidebar TOC */}
        <aside className="hidden lg:block w-56 shrink-0">
          <nav className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
              On this page
            </p>
            <ul className="space-y-1">
              {TOC.map(({ href, label, indent }) => (
                <li key={href}>
                  <a
                    href={href}
                    className={[
                      "block text-sm py-0.5 transition-colors hover:text-amber-500",
                      indent
                        ? "pl-3 text-zinc-500 dark:text-zinc-400"
                        : "font-bold text-zinc-800 dark:text-zinc-200 mt-3",
                    ].join(" ")}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 max-w-3xl">
          {/* Hero */}
          <div className="mb-10 pb-8 border-b border-zinc-100 dark:border-zinc-800">
            <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-bold px-3 py-1 rounded-full mb-4">
              Effective May 25, 2026
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
              Please read these documents carefully. By using DUKA you agree to
              these Terms of Use and Privacy Policy.
            </p>
          </div>

          {/* ── TERMS OF USE ─────────────────────────────────── */}
          <section>
            <H1 id="terms">Terms of Use</H1>
            <p className="text-sm text-zinc-400 mt-1 mb-6">Powered by Awarizon · Effective Date: May 25, 2026</p>

            <P>
              Welcome to DUKA, a software-as-a-service (SaaS) platform powered by
              Awarizon that enables vendors and businesses to create and manage
              online storefronts.
            </P>
            <P>
              By accessing or using DUKA through{" "}
              <a href="https://awarizon.shop" className="text-amber-500 hover:underline">
                https://awarizon.shop
              </a>
              , you agree to comply with and be bound by these Terms of Use. If
              you do not agree with these terms, you should not use the platform.
            </P>

            <H2 id="t1">1. About DUKA</H2>
            <P>
              DUKA is a storefront and commerce infrastructure platform that
              allows independent vendors to:
            </P>
            <UL items={[
              "Create online stores",
              "Upload products and services",
              "Manage orders",
              "Share store links",
              "Customize storefront appearance",
              "Promote products through content and media",
            ]} />
            <P>
              DUKA is a technology platform and does not act as the seller,
              manufacturer, distributor, or owner of products listed by vendors.
            </P>

            <H2 id="t2">2. Eligibility</H2>
            <P>By using DUKA, you confirm that:</P>
            <UL items={[
              "You are at least 18 years old or legally authorized to operate a business",
              "You have the legal authority to enter into agreements",
              "The information you provide is accurate and truthful",
            ]} />

            <H2 id="t3">3. Vendor Responsibility</H2>
            <P>Vendors using DUKA are fully responsible for:</P>
            <UL items={[
              "Products and services listed",
              "Pricing and product descriptions",
              "Delivery and fulfillment",
              "Customer support",
              "Product quality",
              "Refunds and return policies",
              "Compliance with local laws and regulations",
            ]} />
            <P>Vendors must not use DUKA for:</P>
            <UL items={[
              "Fraudulent activity",
              "Illegal products or services",
              "Counterfeit goods",
              "Hate speech or harmful content",
              "Misleading or deceptive practices",
              "Copyright infringement",
            ]} />
            <P>
              DUKA reserves the right to suspend or terminate accounts found
              violating these rules.
            </P>

            <H2 id="t4">4. Platform Role Disclaimer</H2>
            <P>
              DUKA is a software infrastructure platform and is not responsible
              for transactions, disputes, deliveries, refunds, or agreements
              between vendors and customers.
            </P>
            <P>
              Customers purchase directly from independent vendors. Vendors remain
              solely responsible for all business activities conducted through
              their stores.
            </P>
            <P>DUKA does not guarantee:</P>
            <UL items={[
              "Vendor legitimacy",
              "Product quality",
              "Product availability",
              "Delivery timelines",
              "Payment outcomes",
            ]} />
            <P>
              Users are encouraged to exercise personal discretion when
              interacting with vendors.
            </P>

            <H2 id="t5">5. Payments & Subscription</H2>
            <P>Certain features of DUKA may require:</P>
            <UL items={[
              "One-time setup fees",
              "Subscription payments",
              "Optional service fees",
            ]} />
            <P>
              Failure to maintain active subscription payments may result in
              restricted access to platform features.
            </P>
            <P>
              All payments made to DUKA are non-refundable unless otherwise
              stated.
            </P>

            <H2 id="t6">6. Affiliate & Referral Program</H2>
            <P>
              DUKA may provide referral or affiliate systems that reward users for
              referring vendors to the platform.
            </P>
            <P>
              Referral rewards are only issued after successful vendor activation
              and payment verification.
            </P>
            <P>DUKA reserves the right to:</P>
            <UL items={[
              "Reject suspicious referrals",
              "Reverse fraudulent payouts",
              "Suspend abusive affiliate accounts",
              "Modify affiliate commission structures at any time",
            ]} />

            <H2 id="t7">7. Intellectual Property</H2>
            <P>
              All platform software, branding, systems, designs, and
              infrastructure related to DUKA and Awarizon remain the intellectual
              property of Awarizon.
            </P>
            <P>
              Users retain ownership of the content they upload, including:
            </P>
            <UL items={[
              "Product images",
              "Logos",
              "Store branding",
              "Videos",
              "Text content",
            ]} />
            <P>
              By uploading content, users grant DUKA a limited license to display
              and distribute such content through the platform.
            </P>

            <H2 id="t8">8. Content Moderation</H2>
            <P>DUKA reserves the right to:</P>
            <UL items={[
              "Remove content",
              "Suspend stores",
              "Restrict visibility",
              "Ban accounts",
            ]} />
            <P>
              for content or behavior considered harmful, abusive, illegal,
              misleading, or disruptive to the platform ecosystem.
            </P>

            <H2 id="t9">9. Limitation of Liability</H2>
            <P>
              To the maximum extent permitted by law, DUKA and Awarizon shall not
              be liable for:
            </P>
            <UL items={[
              "Vendor disputes",
              "Lost profits",
              "Business interruption",
              "Fraudulent vendor behavior",
              "Customer dissatisfaction",
              "Data loss",
              "Third-party service failures",
              "Indirect or consequential damages",
            ]} />
            <P>Use of the platform is at your own risk.</P>

            <H2 id="t10">10. Account Suspension & Termination</H2>
            <P>
              DUKA reserves the right to suspend or terminate accounts that:
            </P>
            <UL items={[
              "Violate these terms",
              "Engage in abuse or fraud",
              "Harm the platform or other users",
              "Misuse platform infrastructure",
            ]} />
            <P>
              Termination may occur without prior notice in severe cases.
            </P>

            <H2 id="t11">11. Third-Party Services</H2>
            <P>
              DUKA may integrate with third-party services including:
            </P>
            <UL items={[
              "Payment providers",
              "Cloud hosting providers",
              "Media hosting providers",
              "Analytics services",
            ]} />
            <P>
              Use of such services may also be governed by their own terms and
              policies.
            </P>

            <H2 id="t12">12. Changes to Terms</H2>
            <P>
              DUKA may update these Terms of Use at any time. Continued use of
              the platform after updates constitutes acceptance of the revised
              terms.
            </P>

            <H2 id="t13">13. Contact</H2>
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 mt-2">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                <span className="block">
                  Email:{" "}
                  <a href="mailto:support@awarizon.shop" className="text-amber-500 hover:underline">
                    support@awarizon.shop
                  </a>
                </span>
                <span className="block">
                  Website:{" "}
                  <a href="https://awarizon.shop" className="text-amber-500 hover:underline">
                    https://awarizon.shop
                  </a>
                </span>
                <span className="block">
                  Parent Company:{" "}
                  <a href="https://awarizon.com" className="text-amber-500 hover:underline">
                    https://awarizon.com
                  </a>
                </span>
              </p>
            </div>
          </section>

          <Divider />

          {/* ── PRIVACY POLICY ───────────────────────────────── */}
          <section>
            <H1 id="privacy">Privacy Policy</H1>
            <p className="text-sm text-zinc-400 mt-1 mb-6">DUKA — Powered by Awarizon · Effective Date: May 25, 2026</p>

            <P>
              This Privacy Policy explains how DUKA collects, uses, stores, and
              protects user information. By using DUKA, you consent to the
              practices described in this policy.
            </P>

            <H2 id="p1">1. Information We Collect</H2>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Account Information</p>
            <UL items={["Name", "Email address", "Phone number", "Store information", "Login credentials"]} />
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Vendor Store Information</p>
            <UL items={["Product listings", "Store branding", "Uploaded images and videos", "Order data", "Business descriptions"]} />
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Technical Information</p>
            <UL items={["Device information", "Browser type", "IP address", "App usage statistics", "Log data"]} />
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Payment Information</p>
            <P>
              Certain payment information may be processed through third-party
              payment providers. DUKA does not store sensitive card information
              directly.
            </P>

            <H2 id="p2">2. How We Use Information</H2>
            <P>We use collected information to:</P>
            <UL items={[
              "Provide platform functionality",
              "Create and manage vendor stores",
              "Improve platform performance",
              "Process subscriptions",
              "Provide customer support",
              "Prevent fraud and abuse",
              "Analyze platform usage",
              "Send service notifications",
              "Improve user experience",
            ]} />

            <H2 id="p3">3. Storefront Visibility</H2>
            <P>
              Vendor stores, products, and uploaded content may be publicly
              visible through:
            </P>
            <UL items={["Store links", "Discovery sections", "Promotional areas", "Content feeds"]} />
            <P>
              Users are responsible for the content they choose to publish
              publicly.
            </P>

            <H2 id="p4">4. Push Notifications</H2>
            <P>DUKA may send push notifications related to:</P>
            <UL items={["Orders", "Platform updates", "Promotions", "Account activity", "Subscription reminders"]} />
            <P>Users may disable notifications through device settings.</P>

            <H2 id="p5">5. Cookies & Analytics</H2>
            <P>DUKA may use cookies and analytics technologies to:</P>
            <UL items={["Understand user behavior", "Improve performance", "Track usage trends", "Maintain sessions"]} />
            <P>Users may disable cookies through browser settings.</P>

            <H2 id="p6">6. Data Security</H2>
            <P>
              We implement reasonable security measures to protect user
              information. However, no system can guarantee absolute security, and
              users acknowledge that use of internet-based services carries
              inherent risks.
            </P>

            <H2 id="p7">7. Third-Party Services</H2>
            <P>DUKA may use third-party providers including:</P>
            <UL items={[
              "Cloud hosting providers",
              "Media storage providers",
              "Analytics platforms",
              "Payment processors",
              "Notification services",
            ]} />
            <P>
              These providers may process data according to their own policies.
            </P>

            <H2 id="p8">8. Data Retention</H2>
            <P>We may retain user information for:</P>
            <UL items={["Operational purposes", "Legal obligations", "Fraud prevention", "Platform improvement"]} />
            <P>
              Data may remain in backups or archives for a reasonable period.
            </P>

            <H2 id="p9">9. User Rights</H2>
            <P>Users may request:</P>
            <UL items={[
              "Access to their data",
              "Correction of inaccurate information",
              "Deletion of account information",
              "Account closure",
            ]} />
            <P>
              Certain information may still be retained where legally required.
            </P>

            <H2 id="p10">10. Children&apos;s Privacy</H2>
            <P>
              DUKA is not intended for children under 13 years of age. We do not
              knowingly collect information from children.
            </P>

            <H2 id="p11">11. Policy Updates</H2>
            <P>
              This Privacy Policy may be updated periodically. Continued use of
              DUKA after updates constitutes acceptance of the revised policy.
            </P>

            <H2 id="p12">12. Contact Information</H2>
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 mt-2">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                <span className="block">
                  Email:{" "}
                  <a href="mailto:support@awarizon.shop" className="text-amber-500 hover:underline">
                    support@awarizon.shop
                  </a>
                </span>
                <span className="block">
                  Website:{" "}
                  <a href="https://awarizon.shop" className="text-amber-500 hover:underline">
                    https://awarizon.shop
                  </a>
                </span>
                <span className="block">
                  Parent Company:{" "}
                  <a href="https://awarizon.com" className="text-amber-500 hover:underline">
                    https://awarizon.com
                  </a>
                </span>
              </p>
            </div>
          </section>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-xs text-zinc-400">
              © {new Date().getFullYear()} Awarizon. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-zinc-400">
              <a href="https://awarizon.shop" className="hover:text-amber-500 transition-colors">awarizon.shop</a>
              <a href="https://awarizon.com"  className="hover:text-amber-500 transition-colors">awarizon.com</a>
              <a href="mailto:support@awarizon.shop" className="hover:text-amber-500 transition-colors">support@awarizon.shop</a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
