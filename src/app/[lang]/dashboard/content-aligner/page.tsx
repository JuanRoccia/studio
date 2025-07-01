import { PlatformContentAligner } from '@/components/dashboard/platform-content-aligner';
import { getDictionary } from '@/lib/dictionaries';

export default async function ContentAlignerPage({ params: { lang } }: { params: { lang: string } }) {
  const dict = await getDictionary(lang);
  return <PlatformContentAligner lang={lang} dict={dict.contentAlignerPage} sharedDict={dict.shared} showPublisherButton={true} />;
}
