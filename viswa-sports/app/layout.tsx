import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import AdPopupWrapper from "@/components/AdPopupWrapper";
import Script from "next/script";

export const metadata: Metadata = {
  metadataBase: new URL("https://viswasports.com"),
  verification: {
    google: "KqJjtk-Dscz7YvviGZxQD6R6lwORajTsPV9jMIJcO7g",
  },
  title: {
    default: "Viswa Sports Arena — Book Cricket & Football Turf | Kinathukadavu",
    template: "%s | Viswa Sports Arena",
  },
  description:
    "Book your cricket and football turf online at Viswa Sports Arena, Kinathukadavu, Tamil Nadu. Premium sports turf with floodlights, easy online booking, and instant confirmation.",
  keywords: [
    "Viswa Sports Arena",
    "Viswa Sports",
    "viswasports",
    "turf booking Kinathukadavu",
    "cricket turf Kinathukadavu",
    "football turf Kinathukadavu",
    "turf booking Tamil Nadu",
    "sports arena Coimbatore",
    "cricket ground Kinathukadavu",
    "book turf online",
    "net cricket Kinathukadavu",
    "Viswa Sports Arena booking",
  ],
  authors: [{ name: "Viswa Sports Arena" }],
  creator: "Viswa Sports Arena",
  publisher: "Viswa Sports Arena",
  category: "Sports & Recreation",
  alternates: {
    canonical: "https://viswasports.com",
  },
  openGraph: {
    title: "Viswa Sports Arena — Book Your Game. Own the Moment.",
    description:
      "Premium cricket and football turf in Kinathukadavu, Tamil Nadu. Book online in seconds — floodlit pitches, instant confirmation.",
    type: "website",
    url: "https://viswasports.com",
    siteName: "Viswa Sports Arena",
    locale: "en_IN",
    images: [
      {
        url: "https://viswasports.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Viswa Sports Arena — Cricket & Football Turf Kinathukadavu",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Viswa Sports Arena — Book Cricket & Football Turf",
    description:
      "Book floodlit cricket and football turfs online at Viswa Sports Arena, Kinathukadavu.",
    images: ["https://viswasports.com/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/LOGO_1.jpeg",
    apple: "/LOGO_1.jpeg",
    shortcut: "/LOGO_1.jpeg",
  },
  other: {
    "geo.region": "IN-TN",
    "geo.placename": "Kinathukadavu, Tamil Nadu",
    "geo.position": "10.9950;76.9170",
    ICBM: "10.9950, 76.9170",
  },
};

/* ── JSON-LD Structured Data ─────────────────────────────────────────────── */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsActivityLocation",
  name: "Viswa Sports Arena",
  alternateName: ["Viswa Sports", "Viswa Turf", "Viswa Sports Kinathukadavu"],
  description:
    "Premium cricket and football turf facility in Kinathukadavu, Tamil Nadu. Book online for floodlit pitches, net cricket, and football.",
  url: "https://viswasports.com",
  image: "https://viswasports.com/LOGO_1.jpeg",
  address: {
    "@type": "PostalAddress",
    streetAddress: "23 A Bhagavathypalyam Pirivu",
    addressLocality: "Kinathukadavu",
    addressRegion: "Tamil Nadu",
    postalCode: "641201",
    addressCountry: "IN",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 10.995,
    longitude: 76.917,
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [
      "Monday", "Tuesday", "Wednesday", "Thursday",
      "Friday", "Saturday", "Sunday",
    ],
    opens: "00:00",
    closes: "23:59",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "9",
    bestRating: "5",
  },
  sport: ["Cricket", "Football"],
  amenityFeature: [
    { "@type": "LocationFeatureSpecification", name: "Floodlights", value: true },
    { "@type": "LocationFeatureSpecification", name: "Online Booking", value: true },
    { "@type": "LocationFeatureSpecification", name: "Net Cricket", value: true },
  ],
  sameAs: [
    "https://viswasports.com",
    "https://viswasportsarena.netlify.app",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <Script
          id="local-business-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-black text-[#F0F4F8] antialiased" suppressHydrationWarning>
        <Navbar />
        <main>{children}</main>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "rgba(10,10,10,0.85)",
              backdropFilter: "blur(16px)",
              color: "#F0F4F8",
              border: "1px solid rgba(0,229,153,0.18)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            },
          }}
        />
        <AdPopupWrapper />
      </body>
    </html>
  );
}
