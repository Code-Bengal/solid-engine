import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthProvider from "@/components/AuthProvider";
import { MCPProvider } from "@/components/MCPProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ElevenLabsWidget from "@/components/ElevenLabsWidget";
import { MCPControlPanel } from "@/components/MCPControlPanel";
import { Toaster } from 'sonner';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hotel Demo",
  description: "A Next.js based hotel booking demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <AuthProvider>
          <MCPProvider autoConnect={process.env.NODE_ENV === 'development'}>
            <Header />
            <main className="min-h-screen">
              {children}
            </main>
            <Footer />
            <ElevenLabsWidget />
            
            {/* MCP Control Panel - Only show in development */}
            {process.env.NODE_ENV === 'development' && (
              <MCPControlPanel compact={true} showElementsList={false} />
            )}
          </MCPProvider>
          
          {/* Toast notifications */}
          <Toaster 
            position="top-right" 
            toastOptions={{
              duration: 5000,
              className: 'toast-custom',
            }}
            closeButton
            richColors
          />
        </AuthProvider>

        {/* Razorpay Script */}
        <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
      </body>
    </html>
  );
}
