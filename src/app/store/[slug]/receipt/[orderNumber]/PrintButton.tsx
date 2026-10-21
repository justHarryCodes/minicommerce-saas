"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="sf-btn border border-surface-200 px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800"
    >
      <Printer className="h-4 w-4" /> Print / Save PDF
    </button>
  );
}
