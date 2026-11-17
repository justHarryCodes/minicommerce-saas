import type { Metadata } from "next";

// Hand-off page for the vendor app's Google sign-in: never in search results.
export const metadata: Metadata = {
  title: "Sign in to Duka Vendors",
  robots: { index: false, follow: false },
};

export default function AppSignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
