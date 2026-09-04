import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AppWrapper from '../components/layout/AppWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Enterprise Tender Discovery Platform',
  description: 'AI-Powered Tender Discovery and Matching SaaS platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Apply saved theme before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('theme')==='light')document.documentElement.classList.add('light');}catch(e){}` }} />
      </head>
      <body className={`${inter.className} min-h-screen bg-gray-950 text-white`}>
        <AppWrapper>{children}</AppWrapper>
      </body>
    </html>
  );
}
