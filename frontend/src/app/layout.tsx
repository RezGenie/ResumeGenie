import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { SparklingCursor } from "@/components/SparklingCursor";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RezGenie - Your Resume Genie",
  description: "Optimize your resume with AI-powered analysis and recommendations. Compare your resume against job descriptions and get personalized improvement suggestions.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
            <Toaster />
            <SparklingCursor />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
