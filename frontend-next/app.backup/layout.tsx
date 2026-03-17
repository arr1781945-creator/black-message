import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth/context';

export const metadata: Metadata = {
  title: 'BlackMess — Enterprise Banking Messenger',
  description: 'E2EE Banking Communication Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0a0f] text-white antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
