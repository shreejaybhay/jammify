import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "next-auth/react";
import AuthProvider from "@/components/auth-provider";
import { MusicPlayerProvider } from "@/contexts/music-player-context";
import { MusicPlayerWrapper } from "@/components/music-player-wrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Jammify — Stream Music with Style",
  description:
    "Jammify is a modern, minimal, high-quality music streaming experience powered by clean UI, smooth animations, and fast search using the JioSaavn API.",
  keywords: [
    "Jammify",
    "music streaming",
    "songs",
    "playlists",
    "albums",
    "artists",
    "JioSaavn API",
    "clean UI",
    "modern music app",
  ],
  authors: [{ name: "Jammify Team" }],
  creator: "Jammify",
  openGraph: {
    title: "Jammify — Stream Music with Style",
    description:
      "A modern and minimal music streaming platform with fast search, clean UI, and smooth playback.",
    type: "website",
  },
};


export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <MusicPlayerProvider>
              {children}
              <MusicPlayerWrapper />
            </MusicPlayerProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
