import { PrismaClient } from '../src/generated/client/index.js';
import * as crypto from 'node:crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('Seeding Database...');

  // 1. Seed Games Catalog
  const gamesData = [
    { slug: 'jet', name: 'Jet Crash', category: 'crash', engine: 'canvas', rtpPercentage: 96.0, minBet: 10, maxBet: 10000 },
    { slug: 'crash', name: 'Classic Crash', category: 'crash', engine: 'canvas', rtpPercentage: 96.0, minBet: 10, maxBet: 10000 },
    { slug: 'mines', name: 'Mines', category: 'arcade', engine: 'interactive', rtpPercentage: 96.0, minBet: 10, maxBet: 50000 },
    { slug: 'andar-bahar', name: 'Andar Bahar', category: 'cards', engine: 'interactive', rtpPercentage: 97.0, minBet: 10, maxBet: 10000 },
    { slug: 'fast-parity', name: 'Fast Parity', category: 'color-prediction', engine: 'realtime', rtpPercentage: 95.0, minBet: 10, maxBet: 20000 },
    { slug: 'spin', name: 'Spin Wheel', category: 'wheel', engine: 'canvas', rtpPercentage: 95.0, minBet: 10, maxBet: 5000 },
    { slug: 'dice', name: 'Dice Roll', category: 'dice', engine: 'interactive', rtpPercentage: 98.0, minBet: 10, maxBet: 10000 },
    { slug: 'pushparani', name: 'Pushparani', category: 'crash', engine: 'canvas', rtpPercentage: 95.0, minBet: 10, maxBet: 100000 },
    { slug: 'coin-flip', name: 'Coin Flip', category: 'arcade', engine: 'interactive', rtpPercentage: 98.0, minBet: 10, maxBet: 50000 },
    { slug: 'hilo', name: 'HILO', category: 'cards', engine: 'interactive', rtpPercentage: 96.0, minBet: 10, maxBet: 50000 },
    { slug: 'chicken-road', name: 'Chicken Road', category: 'arcade', engine: 'interactive', rtpPercentage: 97.0, minBet: 10, maxBet: 100000 },
    { slug: 'penalty-shootout', name: 'Penalty Nations Cup', category: 'arcade', engine: 'interactive', rtpPercentage: 97.0, minBet: 10, maxBet: 100000 },
  ];

  for (const g of gamesData) {
    await prisma.game.upsert({
      where: { slug: g.slug },
      update: g,
      create: g,
    });
  }

  // 2. Seed Default Merchant Account for Manual Deposit
  const existingMerchant = await prisma.merchantAccount.findFirst();
  if (!existingMerchant) {
    await prisma.merchantAccount.create({
      data: {
        name: 'Rivexa Official Collection Account',
        accountHolder: 'Rivexa Gaming Tech Pvt Ltd',
        upiId: 'rivexa.pay@upi',
        qrImage: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=rivexa.pay@upi&pn=RivexaGames',
        bankName: 'HDFC Bank',
        accountNumber: '50100987654321',
        ifsc: 'HDFC0001234',
        status: 'active',
        dailyLimit: 500000.00,
        currentDailyTotal: 0.00,
        priority: 1,
        supportedPaymentTypes: ['upi', 'bank_transfer', 'qr'],
      },
    });
  }

  // 3. Seed Demo Users & Wallets
  const passwordHash = hashPassword('password123');
  const adminPasswordHash = hashPassword('admin123');

  // Player User
  const player = await prisma.user.upsert({
    where: { email: 'player@rivexa.com' },
    update: {},
    create: {
      email: 'player@rivexa.com',
      name: 'Player One',
      phone: '+919876543210',
      passwordHash,
      role: 'PLAYER',
      referralCode: 'PLAYER123',
      wallet: {
        create: {
          mainBalance: 5000.0,
          bonusBalance: 100.0,
          commissionBalance: 0.0,
        },
      },
    },
    include: { wallet: true },
  });

  // Admin User
  await prisma.user.upsert({
    where: { email: 'admin@rivexa.com' },
    update: {},
    create: {
      email: 'admin@rivexa.com',
      name: 'Admin User',
      phone: '+919999999999',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      referralCode: 'ADMIN123',
      wallet: {
        create: {
          mainBalance: 100000.0,
        },
      },
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
