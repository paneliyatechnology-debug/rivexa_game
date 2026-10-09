import { WheelSlot } from './types';

// Exactly 24 segments matching the casino spin wheel:
// 11 GREEN (1.90x), 11 BLUE (1.90x), 2 RED (9.50x)
// Slot 1 (12 o'clock under pointer) is RED (9.5x)
// Slot 11 is RED (9.5x)
export const WHEEL_SLOTS: Array<WheelSlot> = [
  { index: 0, slotNumber: 1, color: 'red', multiplier: 9.5, label: '1' },
  { index: 1, slotNumber: 2, color: 'blue', multiplier: 1.90, label: '2' },
  { index: 2, slotNumber: 3, color: 'green', multiplier: 1.90, label: '3' },
  { index: 3, slotNumber: 4, color: 'blue', multiplier: 1.90, label: '4' },
  { index: 4, slotNumber: 5, color: 'green', multiplier: 1.90, label: '5' },
  { index: 5, slotNumber: 6, color: 'blue', multiplier: 1.90, label: '6' },
  { index: 6, slotNumber: 7, color: 'green', multiplier: 1.90, label: '7' },
  { index: 7, slotNumber: 8, color: 'blue', multiplier: 1.90, label: '8' },
  { index: 8, slotNumber: 9, color: 'green', multiplier: 1.90, label: '9' },
  { index: 9, slotNumber: 10, color: 'blue', multiplier: 1.90, label: '10' },
  { index: 10, slotNumber: 11, color: 'red', multiplier: 9.5, label: '11' },
  { index: 11, slotNumber: 12, color: 'green', multiplier: 1.90, label: '12' },
  { index: 12, slotNumber: 13, color: 'blue', multiplier: 1.90, label: '13' },
  { index: 13, slotNumber: 14, color: 'green', multiplier: 1.90, label: '14' },
  { index: 14, slotNumber: 15, color: 'blue', multiplier: 1.90, label: '15' },
  { index: 15, slotNumber: 16, color: 'green', multiplier: 1.90, label: '16' },
  { index: 16, slotNumber: 17, color: 'blue', multiplier: 1.90, label: '17' },
  { index: 17, slotNumber: 18, color: 'green', multiplier: 1.90, label: '18' },
  { index: 18, slotNumber: 19, color: 'blue', multiplier: 1.90, label: '19' },
  { index: 19, slotNumber: 20, color: 'green', multiplier: 1.90, label: '20' },
  { index: 20, slotNumber: 21, color: 'blue', multiplier: 1.90, label: '21' },
  { index: 21, slotNumber: 22, color: 'green', multiplier: 1.90, label: '22' },
  { index: 22, slotNumber: 23, color: 'blue', multiplier: 1.90, label: '23' },
  { index: 23, slotNumber: 24, color: 'green', multiplier: 1.90, label: '24' },
];
