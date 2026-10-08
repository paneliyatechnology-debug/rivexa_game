import { Metadata } from 'next';
import ChickenRoadGame from '@/components/game/chicken-road/ChickenRoadGame';

export const metadata: Metadata = {
  title: 'Chicken Road - Original Crossing Multiplier Game | GameHub',
  description: 'Guide the cartoon chicken across dangerous multi-lane traffic checkpoints. Provably fair multiplier game with instant cashouts.',
};

export default function ChickenRoadPage() {
  return <ChickenRoadGame />;
}
