import { fetchStudioData } from '../_lib/fetch-studio-data';
import { BioClient } from './bio-client';

export default async function BioPage() {
  const data = await fetchStudioData('bio');
  return <BioClient theme={data.theme} mission={data.mission} platforms={data.platforms} previousResults={data.previousResults} previousMeta={data.previousMeta} />;
}
