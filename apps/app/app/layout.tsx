import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/layouts/ThemeProvider';
import { QueryProvider } from '@/components/layouts/QueryProvider';
import { SSEProvider } from '@/context/SSEContext';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RoozyLabs Prism — Universal AI Control Plane',
  description: 'AI Infrastructure Control Plane, Model Gateway, Credential Rotation & Governance',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <QueryProvider>
          <SSEProvider>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
              {children}
              <Toaster position="top-right" richColors closeButton />
            </ThemeProvider>
          </SSEProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
