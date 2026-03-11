// app/layout.tsx
import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Arsenal } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import AccessibilityPanel from "@/components/shared/AccessibilityPanel";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import DarkModeInitializer from "@/components/DarkModeInitializer";

const atkinson = Atkinson_Hyperlegible({
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-atkinson",
});

const arsenal = Arsenal({
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-arsenal",
});

// Generate metadata conditionally
export async function generateMetadata(): Promise<Metadata> {
  const isProduction = process.env.NODE_ENV === 'production';
  const isGitHubCodespaces = !!process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;

  return {
    title: "AllyJen - Allergen Management Platform",
    description: "Digital allergen management platform for restaurants and food businesses",
    ...(isProduction && !isGitHubCodespaces && { manifest: "/manifest.json" }),
    icons: {
      icon: [
        { url: '/AllyJen Logo 1702251917.svg', type: 'image/svg+xml' },
      ],
      apple: '/AllyJen Logo 1702251917.svg',
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Ally Kiosk",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Only show AccessibilityPanel in kiosk mode
  const isKiosk = typeof window !== 'undefined' && window.location.pathname.startsWith('/kiosk');
  return (
    <html lang="en" className={`${atkinson.variable} ${arsenal.variable}`}> 
      <head>
          <link rel="icon" type="image/svg+xml" href="/Logo-AllyJen.svg" />
        <meta name="theme-color" content="#42b8ac" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="font-sans antialiased min-h-screen bg-background text-foreground">
        <DarkModeInitializer />
        <AuthProvider>
          {children}
          {isKiosk && <AccessibilityPanel />}
          <ServiceWorkerRegistrar />
        </AuthProvider>
      </body>
    </html>
  );
}