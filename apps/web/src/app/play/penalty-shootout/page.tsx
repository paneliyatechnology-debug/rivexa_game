import { Metadata } from 'next';
import PenaltyShootoutGame from '@/components/game/penalty-shootout/PenaltyShootoutGame';

export const metadata: Metadata = {
  title: 'Play Penalty Nations Cup - Multiplier Shootout | GameHub',
  description: 'Pick your nation, score goals past the keeper, and claim high multipliers in Penalty Nations Cup.',
};

export default function PlayPenaltyPage() {
  return <PenaltyShootoutGame />;
}
