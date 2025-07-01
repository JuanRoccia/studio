import { ContentPublisher } from '@/components/dashboard/content-publisher';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';

export default function PublisherPage() {
  return (
    // Suspense is required here because ContentPublisher uses useSearchParams
    <Suspense fallback={<Skeleton className='w-full h-96' />}>
      <ContentPublisher />
    </Suspense>
  );
}
