import { fetchStudioData } from '../_lib/fetch-studio-data';
import { ScriptsClient } from './scripts-client';

export default async function ScriptsPage() {
  const data = await fetchStudioData('scripts');
  return <ScriptsClient theme={data.theme} mission={data.mission} platforms={data.platforms} previousResults={data.previousResults} previousMeta={data.previousMeta} />;
}
