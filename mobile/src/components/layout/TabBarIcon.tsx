import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface TabBarIconProps {
  name: 'home' | 'analytics' | 'ai' | 'schedule' | 'profile';
  color: string;
  size?: number;
}

const paths: Record<TabBarIconProps['name'], string> = {
  home: 'M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z',
  analytics: 'M3 3v18h18V3H3zm16 16H5V5h14v14zM7 12h2v5H7v-5zm4-3h2v8h-2V9zm4-2h2v10h-2V7z',
  ai: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2v-2h2v-2h-2V9h-2v3H9v2h2v1z',
  schedule: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z',
  profile: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
};

export function TabBarIcon({ name, color, size = 24 }: TabBarIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={paths[name]} />
    </Svg>
  );
}
