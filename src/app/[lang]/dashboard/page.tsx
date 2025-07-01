import { Dashboard } from "@/components/dashboard/dashboard";
import { getDictionary } from '@/lib/dictionaries';

export default async function DashboardPage({ params: { lang } }: { params: { lang: string } }) {
  const dict = await getDictionary(lang);
  return <Dashboard dict={dict} />;
}
