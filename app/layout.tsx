import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import Nav from '@/components/Nav';
import './globals.css';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Personal Finance Advisor',
  description: 'AI-powered monthly cash allocation planner',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-gray-50 min-h-screen`}>
        <Nav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
        <footer className="border-t border-gray-200 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <p className="text-xs text-gray-500 text-center">
              This tool provides educational guidance based on widely accepted personal finance
              principles. It is not a substitute for advice from a licensed financial advisor,
              accountant, or tax professional.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
