import type { Metadata, Viewport } from "next";
import { Inter, Manrope, JetBrains_Mono, Playfair_Display, Cookie } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { CallProvider } from "@/contexts/CallContext";
import { PremiumProvider } from "@/contexts/PremiumContext";
import { PushNotificationProvider } from "@/components/PushNotificationProvider";
import GlobalOverlays from "@/components/GlobalOverlays";

// Font optimization: reduced weights to only those actually used in the design
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400"],
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["600", "700"],
  display: "swap",
});

const cookieFont = Cookie({
  subsets: ["latin"],
  variable: "--font-script",
  weight: ["400"],
  display: "swap",
});

// PWA Viewport Configuration
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1650EB" },
    { media: "(prefers-color-scheme: dark)", color: "#020218" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Quizy - Master Your Exams",
  description: "A modern academic testing platform for students and teachers. Practice tests, track progress, and excel in your studies. Created by Nihal Pawar.",
  keywords: ["education", "testing", "exams", "quiz", "students", "teachers", "academic", "Nihal Pawar"],
  authors: [{ name: "Nihal Pawar" }],
  creator: "Nihal Pawar",
  publisher: "Nihal Pawar",
  // PWA Metadata
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Quizy",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "Quizy - Master Your Exams",
    description: "A modern academic testing platform for students and teachers. By Nihal Pawar.",
    type: "website",
    siteName: "Quizy",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quizy - Master Your Exams",
    description: "A modern academic testing platform by Nihal Pawar.",
    creator: "@nihalpawar",
  },
  icons: {
    icon: [
      { url: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
      { url: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/icons/icon-96x96.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Quizy",
    "application-name": "Quizy",
    "msapplication-TileColor": "#1650EB",
    "msapplication-TileImage": "/icons/icon-144x144.png",
    "msapplication-config": "none",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        {/* Preconnect to Firebase (actual data source) — removed fonts.googleapis.com preconnect since next/font self-hosts */}
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
        <link rel="dns-prefetch" href="https://identitytoolkit.googleapis.com" />
        {/* Splash screen for iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Quizy" />
      </head>
      <body
        className={`${inter.variable} ${manrope.variable} ${jetbrainsMono.variable} ${playfair.variable} ${cookieFont.variable} antialiased bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>
            <PremiumProvider>
              <ChatProvider>
                <CallProvider>
                  <PushNotificationProvider>
                    {children}
                  </PushNotificationProvider>
                  {/* Lazy-loaded global overlays — deferred to after first paint */}
                  <GlobalOverlays />
                </CallProvider>
              </ChatProvider>
            </PremiumProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
