import { ImpactOverview } from '../../components/impact/ImpactOverview';
import { PageHeader } from '../../components/ui';
import api from '../../lib/api';
import { useDocumentTitle, useFetch } from '../../lib/hooks';

export default function ImpactPage() {
  useDocumentTitle('Impact');
  const { data, loading } = useFetch(async () => (await api.get('/public/impact')).data.data, []);

  return (
    <>
      <PageHeader
        eyebrow="Platform-wide"
        title={
          <>
            Community <em>impact</em>
          </>
        }
        scene
        description="Requests, volunteers, ratings and the goals they serve — live from the platform."
      />
      <ImpactOverview data={data} loading={loading} />
    </>
  );
}
