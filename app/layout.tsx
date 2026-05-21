import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jacks Terminal | Momentum Stocks Dashboard",

  description:
    "Professional momentum stock dashboard with live NSE stock prices and QoQ momentum tracking.",

  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  openGraph: {
    title: "Jacks Terminal",
    description: "Momentum Stocks Dashboard",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}