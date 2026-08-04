import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FocusOn AI — Construction Copilot",
  description: "AI Interior Fit-Out ERP for commercial fit-out companies",
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
