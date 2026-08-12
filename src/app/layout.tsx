import type { Metadata } from "next";
import "./globals.css";
import "./theme.css";
import ThemeProvider from "../components/ThemeProvider";
import AppShell from "../components/AppShell";

export const metadata: Metadata = {
  title: "BRICS Bank Admin",
  description: "Административная панель BRICS Bank",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
