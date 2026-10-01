import { WheelSector } from './types';

// 38 Wheel Sectors Definition matching casino roulette & safari spin design
export const SECTORS: Array<WheelSector> = [
  { number: 16, color: 'yellow', animal: 'lion', label: '16', multiplier: 2.0 },
  { number: 32, color: 'green', animal: 'elephant', label: '32', multiplier: 2.0 },
  { number: 5, color: 'yellow', animal: 'lion', label: '5', multiplier: 2.0 },
  { number: 35, color: 'green', animal: 'elephant', label: '35', multiplier: 2.0 },
  { number: 3, color: 'yellow', animal: 'lion', label: '3', multiplier: 2.0 },
  { number: 34, color: 'green', animal: 'elephant', label: '34', multiplier: 2.0 },
  { number: 14, color: 'yellow', animal: 'lion', label: '14', multiplier: 2.0 },
  { number: 0, color: 'red', animal: 'bull', label: '0', multiplier: 18.0 },
  { number: 28, color: 'green', animal: 'elephant', label: '28', multiplier: 2.0 },
  { number: 15, color: 'yellow', animal: 'lion', label: '15', multiplier: 2.0 },
  { number: 36, color: 'green', animal: 'elephant', label: '36', multiplier: 2.0 },
  { number: 12, color: 'yellow', animal: 'lion', label: '12', multiplier: 2.0 },
  { number: 27, color: 'green', animal: 'elephant', label: '27', multiplier: 2.0 },
  { number: 8, color: 'yellow', animal: 'lion', label: '8', multiplier: 2.0 },
  { number: 33, color: 'green', animal: 'elephant', label: '33', multiplier: 2.0 },
  { number: 13, color: 'yellow', animal: 'lion', label: '13', multiplier: 2.0 },
  { number: 30, color: 'green', animal: 'elephant', label: '30', multiplier: 2.0 },
  { number: 9, color: 'yellow', animal: 'lion', label: '9', multiplier: 2.0 },
  { number: 26, color: 'green', animal: 'elephant', label: '26', multiplier: 2.0 },
  { number: 4, color: 'gold', animal: 'crown', label: '👑', multiplier: 50.0 },
  { number: 23, color: 'green', animal: 'elephant', label: '23', multiplier: 2.0 },
  { number: 10, color: 'yellow', animal: 'lion', label: '10', multiplier: 2.0 },
  { number: 21, color: 'green', animal: 'elephant', label: '21', multiplier: 2.0 },
  { number: 17, color: 'yellow', animal: 'lion', label: '17', multiplier: 2.0 },
  { number: 25, color: 'green', animal: 'elephant', label: '25', multiplier: 2.0 },
  { number: 6, color: 'yellow', animal: 'lion', label: '6', multiplier: 2.0 },
  { number: 37, color: 'red', animal: 'bull', label: '00', multiplier: 18.0 },
  { number: 22, color: 'green', animal: 'elephant', label: '22', multiplier: 2.0 },
  { number: 7, color: 'yellow', animal: 'lion', label: '7', multiplier: 2.0 },
  { number: 19, color: 'green', animal: 'elephant', label: '19', multiplier: 2.0 },
  { number: 1, color: 'yellow', animal: 'lion', label: '1', multiplier: 2.0 },
  { number: 31, color: 'green', animal: 'elephant', label: '31', multiplier: 2.0 },
  { number: 11, color: 'yellow', animal: 'lion', label: '11', multiplier: 2.0 },
  { number: 24, color: 'green', animal: 'elephant', label: '24', multiplier: 2.0 },
  { number: 18, color: 'yellow', animal: 'lion', label: '18', multiplier: 2.0 },
  { number: 29, color: 'green', animal: 'elephant', label: '29', multiplier: 2.0 },
  { number: 2, color: 'yellow', animal: 'lion', label: '2', multiplier: 2.0 },
  { number: 20, color: 'green', animal: 'elephant', label: '20', multiplier: 2.0 },
];

// Dynamically extracted unique sector options
export const UNIQUE_WHEEL_NUMBERS: Array<WheelSector> = Array.from(
  new Map(
    SECTORS.map((sec) => [
      sec.label,
      {
        ...sec,
        multiplier: sec.color === 'red' ? 18.0 : sec.color === 'gold' ? 50.0 : 36.0,
      },
    ])
  ).values()
).sort((a, b) => a.number - b.number);
