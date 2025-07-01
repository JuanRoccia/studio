import { ThemeGeneratorPage } from '@/components/dashboard/theme-generator-page';
import { getDictionary } from '@/lib/dictionaries';

export default async function ThemeGenerator({ params: { lang } }: { params: { lang: string } }) {
  const dict = await getDictionary(lang);
  return <ThemeGeneratorPage lang={lang} dict={dict} />;
}
