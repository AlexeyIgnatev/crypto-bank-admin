import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./theme.css";
import ThemeProvider from "../components/ThemeProvider";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bank Admin",
  description: "Admin panel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <div className="flex">
            <Sidebar />
            <div className="flex-1 min-h-screen flex flex-col">
              <Topbar title="Главная" />
              <main className="flex-1 overflow-hidden p-4 max-w-[1400px] mx-auto flex flex-col gap-4">{children}</main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
