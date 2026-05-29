import { fetchStudioData } from '../_lib/fetch-studio-data';
import { IdeasClient } from './ideas-client';

export default async function IdeasPage() {
  const data = await fetchStudioData();
  return <IdeasClient theme={data.theme} mission={data.mission} platforms={data.platforms} />;
}
