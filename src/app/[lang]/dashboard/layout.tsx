import { getDictionary } from '@/lib/dictionaries';
import type { ReactNode } from 'react';
import { DashboardLayoutClient } from '@/components/dashboard/dashboard-layout-client';

export default async function DashboardLayout({
  children,
  params: { lang },
}: {
  children: ReactNode;
  params: { lang: string };
}) {
  const dict = await getDictionary(lang);
  return (
    <DashboardLayoutClient lang={lang} dict={dict.dashboardLayout}>
      {children}
    </DashboardLayoutClient>
  );
}
