import type { Metadata } from "next";
import "./globals.css";
import "./stitch-theme.css";

export const metadata: Metadata = {
  title: "BriliantAI Lab",
  description: "Không gian học thuật tương tác để hiểu sâu AI, Data và toán học nền tảng.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
