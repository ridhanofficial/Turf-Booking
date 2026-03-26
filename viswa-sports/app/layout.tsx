import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import AdPopupWrapper from "@/components/AdPopupWrapper";

export const metadata: Metadata = {
  title: "Viswa Sports — Book Your Game Like a Movie",
  description: "Premium turf booking platform. Book cricket, football, badminton and more at Viswa Sports.",
  keywords: "turf booking, cricket, football, sports, Viswa Sports",
  icons: {
    icon: "/LOGO_1.jpeg",
    apple: "/LOGO_1.jpeg",
  },
  openGraph: {
    title: "Viswa Sports",
    description: "Book Your Game Like a Movie",
    type: "website",
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
