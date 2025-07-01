import { ContentPublisher } from '@/components/dashboard/content-publisher';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';
import { getDictionary } from '@/lib/dictionaries';

export default async function PublisherPage({ params: { lang } }: { params: { lang: string } }) {
  const dict = await getDictionary(lang);
  return (
    // Suspense is required here because ContentPublisher uses useSearchParams
    <Suspense fallback={<Skeleton className='w-full h-96' />}>
      <ContentPublisher lang={lang} dict={dict.publisherPage} sharedDict={dict.shared} />
    </Suspense>
  );
}
