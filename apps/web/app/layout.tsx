import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { sans } from '@/ui/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Канвас',
  description: 'Редактор цепочки текст → генератор → результат',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className={sans.className}>{children}</body>
    </html>
  );
}
