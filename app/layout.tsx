import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FocusOn AI — Interior Fit-Out OS",
  description: "Fast AI construction copilot and ERP workspace for commercial interior fit-out teams.",
  applicationName: "FocusOn AI",
  keywords: ["interior fit-out", "BOQ", "construction ERP", "quotation", "site report", "procurement"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
