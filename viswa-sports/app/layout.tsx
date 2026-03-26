import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import AdPopupWrapper from "@/components/AdPopupWrapper";

export const metadata: Metadata = {
  title: "Viswa Sports Arena — Book Your Game Like a Movie",
  description: "Lights. Pitch. Action. The field is calling — book your turf at Viswa Sports Arena.",
  keywords: "turf booking, cricket, football, sports, Viswa Sports Arena",
  icons: {
    icon: "/LOGO_1.jpeg",
    apple: "/LOGO_1.jpeg",
  },
  openGraph: {
    title: "Viswa Sports Arena",
    description: "Book Your Game Like a Movie 🎬",
    type: "website",
    url: "https://viswasports.com",
    siteName: "Viswa Sports Arena",
    images: [
      {
        url: "https://viswasports.com/LOGO_1.jpeg",
        width: 800,
        height: 800,
        alt: "Viswa Sports Arena",
      },
    ],
  },
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
