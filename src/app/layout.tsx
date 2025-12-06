import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Quizy - Master Your Exams",
  description: "A modern academic testing platform for students and teachers. Practice tests, track progress, and excel in your studies.",
  keywords: ["education", "testing", "exams", "quiz", "students", "teachers", "academic"],
  authors: [{ name: "Quizy Team" }],
  openGraph: {
    title: "Quizy - Master Your Exams",
    description: "A modern academic testing platform for students and teachers.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${inter.className} antialiased bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

