import { JsonLd } from '@/app/components/JsonLd';
import { LandingPage } from '@/app/components/LandingPage';
import { buildSoftwareApplicationJsonLd } from '@/app/lib/structured-data';

export default function HomePage() {
  return <><JsonLd data={buildSoftwareApplicationJsonLd('zh')} /><LandingPage language="zh" /></>;
}
