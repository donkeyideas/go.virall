import { fetchStudioData } from '../_lib/fetch-studio-data';
import { CaptionsClient } from './captions-client';

export default async function CaptionsPage() {
  const data = await fetchStudioData();
  return <CaptionsClient theme={data.theme} mission={data.mission} platforms={data.platforms} />;
}
