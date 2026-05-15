import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Duka by Awarizon", template: "%s | Duka" },
  description: "Discover and shop from verified Nigerian vendors — Duka by Awarizon",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                borderRadius: "12px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: "14px",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
