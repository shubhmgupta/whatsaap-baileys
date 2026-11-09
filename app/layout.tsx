import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Codefy Whatsapp Solutions",
  description: "Codefy Whatsapp Solutions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="font-sans antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
