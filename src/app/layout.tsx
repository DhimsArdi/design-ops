import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppFrame } from "@/components/auth/app-frame";
import { Toaster } from "@/components/ui/sonner";
import { THEME_BOOT_SCRIPT } from "@/lib/theme/theme";
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
  title: "DesignOps",
  description: "Internal design portfolio and manpower planning tool.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The theme script below adds `dark` to this element before React
      // hydrates, which React would otherwise report as a mismatch on every
      // dark-mode load. Scoped to <html>'s own attributes, not its subtree.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* Before first paint: reads the theme the user last chose and puts the
            class on <html>, so a dark-mode user never sees a white flash.
            Inline because it has to run ahead of every bundle — see
            src/lib/theme/theme.ts. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <TooltipProvider>
          {/* Gates on sign-in and on the data cache being filled, except on the
              password-recovery routes, which a signed-out person has to be able
              to reach (see AppFrame). */}
          <AppFrame>{children}</AppFrame>
        </TooltipProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
