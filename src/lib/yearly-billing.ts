// Server side of yearly billing: is the database ready for it?
// migrations/yearly_billing.sql adds subscription_payments.billing_cycle.
// Until it has run, yearly checkout is refused with a clear message and
// monthly billing carries on exactly as before.

import { queryOne } from "@/lib/db";

let ready: { value: boolean; at: number } | null = null;

export async function yearlyBillingReady(): Promise<boolean> {
  if (ready?.value) return true; // once there, it stays there
  if (ready && Date.now() - ready.at < 60_000) return false;
  try {
    const row = await queryOne(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_payments' AND column_name = 'billing_cycle'`,
      [],
    );
    ready = { value: !!row, at: Date.now() };
  } catch {
    ready = { value: false, at: Date.now() };
  }
  return ready.value;
}

export const YEARLY_NOT_READY = "Yearly billing is being switched on. Please choose monthly for now, or try again shortly.";
