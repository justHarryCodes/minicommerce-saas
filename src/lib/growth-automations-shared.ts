// Growth engine, phase 2: automatic follow-up emails. Client-safe settings
// and descriptions (the Growth page shows these); sending is in
// growth-automations.ts. Email only (never SMS), every email has a one-click
// "stop emails from this store" link.

export interface AutomationSettings {
  /** Signed up for the welcome offer, didn't order: remind them their code is waiting */
  welcomeReminder: boolean;
  /** A few days after delivery: thank them and ask for a review */
  reviewRequest: boolean;
  /** Bought before, quiet for 45+ days: "we miss you" with a comeback code */
  winBack: boolean;
  winBackPercent: number;
}

export const AUTOMATION_DEFAULTS: AutomationSettings = { welcomeReminder: true, reviewRequest: true, winBack: false, winBackPercent: 10 };

export function parseAutomations(raw: unknown): AutomationSettings {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const bool = (k: keyof AutomationSettings) => (typeof o[k] === "boolean" ? (o[k] as boolean) : (AUTOMATION_DEFAULTS[k] as boolean));
  const pct = Number(o.winBackPercent);
  return {
    welcomeReminder: bool("welcomeReminder"),
    reviewRequest: bool("reviewRequest"),
    winBack: bool("winBack"),
    winBackPercent: Number.isFinite(pct) && pct >= 1 && pct <= 50 ? Math.round(pct) : AUTOMATION_DEFAULTS.winBackPercent,
  };
}

export type FlowId = "welcome_code" | "welcome_reminder" | "review_request" | "win_back";

/** Timing, in plain numbers the engine and the Growth page share. */
export const FLOW_TIMING = {
  /** Welcome reminder: this many hours after signing up (and before the code expires) */
  welcomeReminderAfterHours: 48,
  /** Review request: days after the order was delivered */
  reviewAfterDays: 2,
  reviewWithinDays: 10,
  /** Win-back: days since their last order */
  winBackAfterDays: 45,
  winBackWithinDays: 120,
  winBackCodeDays: 14,
} as const;

export const FLOWS: { id: Exclude<FlowId, "welcome_code">; key: keyof AutomationSettings; title: string; when: string; who: string; subject: string }[] = [
  {
    id: "welcome_reminder",
    key: "welcomeReminder",
    title: "Your code is waiting",
    when: "2 days after someone takes your welcome offer but hasn't ordered",
    who: "People on your list who gave an email",
    subject: "Your {welcome}% code is waiting at {store}",
  },
  {
    id: "review_request",
    key: "reviewRequest",
    title: "Thank you + review",
    when: "2 days after an order is delivered",
    who: "Buyers who gave an email",
    subject: "How was your order from {store}?",
  },
  {
    id: "win_back",
    key: "winBack",
    title: "We miss you",
    when: "45 days after someone's last order, with a one-time comeback code",
    who: "Past buyers on your list who gave an email",
    subject: "We miss you! Here's {percent}% off at {store}",
  },
];
