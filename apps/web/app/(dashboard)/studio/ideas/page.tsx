import { fetchStudioData } from '../_lib/fetch-studio-data';
import { IdeasClient } from './ideas-client';

export default async function IdeasPage() {
  const data = await fetchStudioData('post_ideas');
  return <IdeasClient theme={data.theme} mission={data.mission} platforms={data.platforms} previousResults={data.previousResults} previousMeta={data.previousMeta} />;
}
