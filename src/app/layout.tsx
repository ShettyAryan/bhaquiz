import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { EventFooter, EventHeader } from "@/components/event-chrome";
import { EVENT_NAME, QUIZ_NAME } from "@/lib/branding";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: `${QUIZ_NAME} · ${EVENT_NAME}`,
  description: `${QUIZ_NAME} at ${EVENT_NAME}`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-dvh overflow-hidden antialiased`}
    >
      <body className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-background text-foreground">
        <EventHeader />
        <div className="app-shell flex min-h-0 flex-1 flex-col">{children}</div>
        <EventFooter />
      </body>
    </html>
  );
}
