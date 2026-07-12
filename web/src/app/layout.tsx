import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import CustomCursor from "../components/CustomCursor";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export const metadata = {
  title: "WhatsiPro - Smart WhatsApp Management",
  description: "Advanced tool to manage multiple WhatsApp accounts in one place",
};

import SmoothScrolling from "../components/SmoothScrolling";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      translate="no"
      dir="ltr"
      className={`${jakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans bg-[#f4f7f5] text-gray-900" suppressHydrationWarning>
        <SmoothScrolling>
          <CustomCursor />
          {children}
        </SmoothScrolling>
      </body>
    </html>
  );
}
