import { fetchStudioData } from '../_lib/fetch-studio-data';
import { CaptionsClient } from './captions-client';

export default async function CaptionsPage() {
  const data = await fetchStudioData('captions');
  return <CaptionsClient theme={data.theme} mission={data.mission} platforms={data.platforms} previousResults={data.previousResults} previousMeta={data.previousMeta} />;
}
