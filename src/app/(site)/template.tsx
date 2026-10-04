import { PageTransition } from '@/components/site/PageTransition';

export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
