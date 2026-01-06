import type { Metadata } from "next";
import { Epilogue } from "next/font/google";
import "./globals.css";

const epilogue = Epilogue({
  variable: "--font-epilogue",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "TechXpo Registration",
  description: "Event registration platform for TechXpo",
  icons: {
    icon: '/logo.webp',
  },
};

import Navbar from "@/components/Navbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${epilogue.variable} antialiased font-sans`}
      >
        <Navbar />
        <div className="min-h-[calc(100vh-140px)]">
          {children}
        </div>
        <footer className="py-6 text-center text-emerald-200/60 text-sm border-t border-emerald-900/50 mt-8">
          Made with ❤️ by Team TechnoJam
        </footer>
      </body>
    </html>
  );
}
