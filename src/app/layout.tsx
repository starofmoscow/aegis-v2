import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EE AEGIS V2.0 — Engineering Intelligence',
  description: 'Autonomous EPC Platform for LLC Energy & Engineering',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
