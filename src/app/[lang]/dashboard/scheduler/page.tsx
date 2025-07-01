import { getDictionary } from '@/lib/dictionaries';
import { SchedulerPage } from '@/components/dashboard/scheduler-page';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default async function Scheduler({ params: { lang } }: { params: { lang: string } }) {
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<Skeleton className="w-full h-[600px]" />}>
        <SchedulerPage lang={lang} dict={dict.schedulerPage} sharedDict={dict.shared} />
    </Suspense>
  );
}
