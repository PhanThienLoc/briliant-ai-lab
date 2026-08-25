import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BriliantAI Lab",
  description: "Phòng gym tư duy tương tác dành cho AI và Data.",
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
