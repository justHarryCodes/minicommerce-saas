import { CalendarClock } from "lucide-react";

/** "When does the money reach my bank?" — shown in Duka Pay settings and Earnings. */
export default function PayoutTimingNote({ className = "" }: { className?: string }) {
  return (
    <div className={`flex gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200 ${className}`}>
      <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" />
      <div className="space-y-1 text-[13px] leading-relaxed">
        <p className="font-bold">When does the money reach my bank?</p>
        <p>
          Paystack pays your share into your bank account <strong>the next working day</strong> after the customer pays. Sales on Friday,
          Saturday or Sunday arrive on <strong>Monday</strong>, and public holidays can add a day.
        </p>
        <p className="text-sky-800/80 dark:text-sky-300/80">
          This is Paystack&apos;s schedule for every business in Nigeria. The payment is already confirmed and the order is safe to fulfil. Only
          the bank deposit follows a day later.
        </p>
      </div>
    </div>
  );
}
