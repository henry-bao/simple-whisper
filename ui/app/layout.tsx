import type React from 'react';
import './globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import { ServerSettingsProvider } from '@/lib/settings-context';
import { Toaster } from '@/components/ui/toaster';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Snail Mailer',
    description: 'Record and transcribe audio with Whisper AI',
    generator: 'v0.dev',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Albert+Sans:wght@400;500;600;700&family=Happy+Monkey&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body className="bg-background text-foreground">
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                    <ServerSettingsProvider>
                        <div className="flex flex-col min-h-screen">
                            <header className="border-b border-gray-100 dark:border-gray-800">
                                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                                    <Link href="/" className="flex items-center">
                                        <span className="sr-only">Home</span>
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="h-6 w-6 mr-2"
                                        >
                                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                            <line x1="12" x2="12" y1="19" y2="22" />
                                        </svg>
                                        <span className="font-happy-monkey font-medium text-lg">Snail Mailer</span>
                                    </Link>
                                </div>
                            </header>
                            <main className="flex-1">{children}</main>
                        </div>
                        <Toaster />
                    </ServerSettingsProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
