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

const BASE_URL = 'https://allyjen.ie'

// Generate metadata conditionally
export async function generateMetadata(): Promise<Metadata> {
  const isProduction = process.env.NODE_ENV === 'production';
  const isGitHubCodespaces = !!process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default: 'AllyJen | Allergen Management Software for Restaurants',
      template: '%s | AllyJen',
    },
    description:
      'AllyJen helps restaurants and food businesses in Ireland manage allergens digitally. Real-time kiosk displays, staff management tools, and full EU food allergen regulation compliance.',
    keywords: [
      'allergen management software',
      'restaurant allergen compliance Ireland',
      'EU allergen regulations',
      'food allergen kiosk',
      'digital allergen labels',
      'food safety software Ireland',
      'allergen information system',
      "Natasha's Law compliance",
      'food business allergen tracking',
      'restaurant management software Ireland',
      'allergen menu builder',
    ],
    authors: [{ name: 'AllyJen', url: BASE_URL }],
    creator: 'AllyJen',
    publisher: 'AllyJen',
    category: 'Food Safety Technology',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
    },
    openGraph: {
      type: 'website',
      url: BASE_URL,
      siteName: 'AllyJen',
      title: 'AllyJen | Allergen Management Software for Restaurants',
      description:
        'AllyJen helps restaurants and food businesses in Ireland manage allergens digitally. Real-time kiosk displays, staff tools, and full EU allergen regulation compliance.',
      images: [
        {
          url: '/AllyJen Logo (1200 x 630 px).png',
          width: 1200,
          height: 630,
          alt: 'AllyJen - Allergen Management Platform',
        },
      ],
      locale: 'en_IE',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'AllyJen | Allergen Management Software for Restaurants',
      description:
        'AllyJen helps restaurants and food businesses in Ireland manage allergens digitally. Real-time kiosk displays and EU allergen compliance tools.',
      images: ['/AllyJen Logo (1200 x 630 px).png'],
    },
    alternates: {
      canonical: BASE_URL,
    },
    ...(isProduction && !isGitHubCodespaces && { manifest: '/manifest.json' }),
    icons: {
      icon: [{ url: '/Logo-AllyJen.png', type: 'image/png' }],
      apple: '/Logo-AllyJen.png',
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'AllyJen',
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': `${BASE_URL}/#organization`,
                  name: 'AllyJen',
                  url: BASE_URL,
                  logo: {
                    '@type': 'ImageObject',
                    url: `${BASE_URL}/AllyJen Logo (1200 x 630 px).png`,
                    width: 1200,
                    height: 630,
                  },
                  description:
                    'Digital allergen management platform for restaurants and food businesses in Ireland.',
                  sameAs: [],
                },
                {
                  '@type': 'SoftwareApplication',
                  '@id': `${BASE_URL}/#software`,
                  name: 'AllyJen',
                  applicationCategory: 'BusinessApplication',
                  operatingSystem: 'Web, iOS, Android',
                  url: BASE_URL,
                  description:
                    'AllyJen is a digital allergen management platform enabling restaurants and food businesses to manage, display, and communicate allergen information in compliance with EU regulations.',
                  offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'EUR',
                    description: 'Free trial available',
                  },
                  publisher: { '@id': `${BASE_URL}/#organization` },
                },
                {
                  '@type': 'WebSite',
                  '@id': `${BASE_URL}/#website`,
                  url: BASE_URL,
                  name: 'AllyJen',
                  publisher: { '@id': `${BASE_URL}/#organization` },
                },
              ],
            }),
          }}
        />
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