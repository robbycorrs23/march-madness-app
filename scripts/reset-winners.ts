import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetWinners() {
  try {
    // Reset all match winners to null
    await prisma.match.updateMany({
      data: {
        winnerId: null,
        completed: false
      }
    });

    console.log('Successfully reset all match winners');
  } catch (error) {
    console.error('Error resetting winners:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetWinners(); 