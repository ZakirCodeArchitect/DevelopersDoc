import type { Metadata } from "next";
import { Geist, Geist_Mono, Open_Sans, Inter, Shadows_Into_Light, Source_Code_Pro } from "next/font/google";
import "./globals.css";
import { FontLoader } from "@/components/FontLoader";
import { ClerkProvider } from "@clerk/nextjs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const shadowsIntoLight = Shadows_Into_Light({
  variable: "--font-shadows-into-light",
  subsets: ["latin"],
  weight: "400",
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Developers Doc",
  description: "Developers Doc is a platform for developers to share their knowledge and learn from each other.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${openSans.variable} ${inter.variable} ${shadowsIntoLight.variable} ${sourceCodePro.variable} antialiased`}
      >
        <FontLoader />
        {children}
      </body>
    </html>
    </ClerkProvider>
  );
}
