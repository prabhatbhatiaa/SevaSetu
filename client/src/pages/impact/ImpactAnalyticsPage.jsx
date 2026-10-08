import { ImpactOverview } from '../../components/impact/ImpactOverview';
import { PageHeader } from '../../components/ui';
import api from '../../lib/api';
import { useDocumentTitle, useFetch } from '../../lib/hooks';

/** Public, signed-out version of the impact report. */
export default function ImpactAnalyticsPage() {
  useDocumentTitle('Community impact');
  const { data, loading } = useFetch(async () => (await api.get('/public/impact')).data.data, []);

  return (
    <div className="container-page">
      <PageHeader
        eyebrow="Transparency"
        title={
          <>
            Community <em>impact</em>
          </>
        }
        scene
        description="Live, public numbers for every request, volunteer and review on SevaSetu."
      />
      <ImpactOverview data={data} loading={loading} />
    </div>
  );
}
