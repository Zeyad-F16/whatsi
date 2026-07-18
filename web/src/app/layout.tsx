import { Plus_Jakarta_Sans, Tajawal } from "next/font/google";
import CustomCursor from "../components/CustomCursor";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "700", "800", "900"],
  variable: "--font-tajawal",
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
      className={`${jakarta.variable} ${tajawal.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="font-tajawal bg-[#f4f7f5] text-gray-900" suppressHydrationWarning>
        <SmoothScrolling>
          <CustomCursor />
          {children}
        </SmoothScrolling>
      </body>
    </html>
  );
}
