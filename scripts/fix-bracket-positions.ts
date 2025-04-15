const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixBracketPositions() {
  try {
    // Get all Round 1 matches
    const round1Matches = await prisma.match.findMany({
      where: {
        round: 1
      },
      include: {
        team1: true,
        team2: true
      }
    });

    // Update Round 1 positions
    for (const match of round1Matches) {
      const regionCode = match.region.charAt(0);
      const seed1 = parseInt(String(match.team1?.seed)) || 0;
      const seed2 = parseInt(String(match.team2?.seed)) || 0;
      
      let position = 0;
      if ((seed1 === 1 && seed2 === 16) || (seed1 === 16 && seed2 === 1)) position = 1;
      else if ((seed1 === 8 && seed2 === 9) || (seed1 === 9 && seed2 === 8)) position = 2;
      else if ((seed1 === 5 && seed2 === 12) || (seed1 === 12 && seed2 === 5)) position = 3;
      else if ((seed1 === 4 && seed2 === 13) || (seed1 === 13 && seed2 === 4)) position = 4;
      else if ((seed1 === 6 && seed2 === 11) || (seed1 === 11 && seed2 === 6)) position = 5;
      else if ((seed1 === 3 && seed2 === 14) || (seed1 === 14 && seed2 === 3)) position = 6;
      else if ((seed1 === 7 && seed2 === 10) || (seed1 === 10 && seed2 === 7)) position = 7;
      else if ((seed1 === 2 && seed2 === 15) || (seed1 === 15 && seed2 === 2)) position = 8;

      if (position > 0) {
        await prisma.match.update({
          where: { id: match.id },
          data: { bracketPosition: `${regionCode}1${position}` }
        });
        console.log(`Updated match ${match.id} to position ${regionCode}1${position}`);
      }
    }

    console.log('Successfully updated Round 1 bracket positions');
  } catch (error) {
    console.error('Error fixing bracket positions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBracketPositions(); 