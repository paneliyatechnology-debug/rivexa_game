import { Metadata } from 'next';
import ChickenRoadGame from '@/components/game/chicken-road/ChickenRoadGame';

export const metadata: Metadata = {
  title: 'Play Chicken Road - Multiplier Game | GameHub',
  description: 'Cross the road, survive traffic checkpoints, and cash out big multipliers.',
};

export default function PlayChickenRoadPage() {
  return <ChickenRoadGame />;
}
