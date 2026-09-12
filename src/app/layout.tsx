import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/shell/AppShell";
import "./globals.css";

// Geist is the product's single font family (headings, body, labels,
// tables, buttons, forms, navigation) — one font load, no mixed-font
// pairing. --font-sans and --font-heading both alias to it in
// globals.css rather than loading Geist a second time under a different
// variable name. Geist Mono is kept only for tabular/monospace data.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Design Portfolio Planner",
  description: "Internal design portfolio and manpower planning tool.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <AppShell>{children}</AppShell>
        </TooltipProvider>
      </body>
    </html>
  );
}
