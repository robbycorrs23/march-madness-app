// @ts-nocheck
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Map round numbers to points
const roundPointsMap = {
  1: 1,  // Round of 64
  2: 2,  // Round of 32
  3: 4,  // Sweet 16
  4: 8,  // Elite 8
  5: 15, // Final Four
  6: 25  // Championship
};

async function fixScores() {
  try {
    console.log('Starting score fix process...');

    // Get current tournament
    const tournament = await prisma.tournament.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!tournament) {
      console.error('No tournament found');
      return;
    }

    console.log(`Processing tournament: ${tournament.name} (${tournament.year})`);

    // Get all participants
    const participants = await prisma.participant.findMany({
      where: { tournamentId: tournament.id },
      include: {
        preTournamentPick: {
          include: {
            finalFourPicks: {
              include: { team: true }
            },
            finalsPicks: {
              include: { team: true }
            },
            championPick: {
              include: { team: true }
            },
            cinderellaPicks: {
              include: { team: true }
            }
          }
        },
        matchPicks: {
          include: {
            match: {
              include: {
                team1: true,
                team2: true
              }
            },
            team: true
          }
        }
      }
    });

    console.log(`Found ${participants.length} participants to process`);

    // Get all completed matches
    const completedMatches = await prisma.match.findMany({
      where: {
        completed: true,
        winnerId: { not: null }
      },
      include: {
        team1: true,
        team2: true,
        winner: true
      }
    });

    console.log(`Found ${completedMatches.length} completed matches`);

    // Process each participant
    for (const participant of participants) {
      console.log(`\nProcessing participant: ${participant.name}`);
      console.log('----------------------------------------');

      let totalScore = 0;
      let matchScore = 0;
      let preTournamentScore = 0;
      let cinderellaScore = 0;

      // 1. Calculate match pick scores
      for (const pick of participant.matchPicks) {
        const match = completedMatches.find(m => m.id === pick.matchId);
        if (match) {
          const isCorrect = pick.teamId === match.winnerId;
          const roundPoints = roundPointsMap[match.round] || 0;
          const points = isCorrect ? roundPoints : 0;
          
          matchScore += points;
          
          console.log(`Match ${match.id} (Round ${match.round}): ${isCorrect ? 'Correct' : 'Incorrect'}`);
          console.log(`- Picked: ${pick.team.name} (${pick.team.seed})`);
          console.log(`- Winner: ${match.winner.name}`);
          console.log(`- Points: ${points}`);

          // Add Cinderella points for correct picks of teams seeded 11-16
          if (isCorrect && pick.team.seed >= 11 && pick.team.seed <= 16) {
            const doubledPoints = roundPoints * 2;
            cinderellaScore += doubledPoints;
            console.log(`\nCinderella win in match picks:`);
            console.log(`- Team: ${pick.team.name} (seed ${pick.team.seed})`);
            console.log(`- Round: ${match.round}`);
            console.log(`- Base points: ${roundPoints}`);
            console.log(`- Doubled points: ${doubledPoints}`);
            console.log(`- Running Cinderella total: ${cinderellaScore}`);
          }
        }
      }

      // 2. Calculate pre-tournament scores
      if (participant.preTournamentPick) {
        // Final Four picks (5 pts each)
        for (const pick of participant.preTournamentPick.finalFourPicks) {
          const madeItToFinalFour = completedMatches.some(match => 
            match.round === 5 && 
            (match.team1Id === pick.teamId || match.team2Id === pick.teamId)
          );

          if (madeItToFinalFour) {
            preTournamentScore += 5;
            console.log(`Final Four pick correct: ${pick.team.name} (+5)`);
          }
        }

        // Finals picks (10 pts each)
        for (const pick of participant.preTournamentPick.finalsPicks) {
          const madeItToFinals = completedMatches.some(match => 
            match.round === 6 && 
            (match.team1Id === pick.teamId || match.team2Id === pick.teamId)
          );

          if (madeItToFinals) {
            preTournamentScore += 10;
            console.log(`Finals pick correct: ${pick.team.name} (+10)`);
          }
        }

        // Champion pick (25 pts)
        if (participant.preTournamentPick.championPick) {
          const championshipMatch = completedMatches.find(match => match.round === 6);
          if (championshipMatch && championshipMatch.winnerId === participant.preTournamentPick.championPick.teamId) {
            preTournamentScore += 25;
            console.log(`Champion pick correct: ${participant.preTournamentPick.championPick.team.name} (+25)`);
          }
        }
      }

      // Calculate total score
      totalScore = matchScore + preTournamentScore + cinderellaScore;

      // Log score breakdown
      console.log('\nScore Breakdown:');
      console.log(`- Match Picks: ${matchScore}`);
      console.log(`- Pre-Tournament: ${preTournamentScore}`);
      console.log(`- Cinderella: ${cinderellaScore}`);
      console.log(`- Total: ${totalScore}`);

      // Update scores in database
      const updates = [];

      // Create or update pre-tournament pick
      if (!participant.preTournamentPick) {
        updates.push(
          prisma.preTournamentPick.create({
            data: {
              participantId: participant.id,
              score: preTournamentScore,
              cinderellaScore: cinderellaScore
            }
          })
        );
      } else {
        updates.push(
          prisma.preTournamentPick.update({
            where: { participantId: participant.id },
            data: {
              score: preTournamentScore,
              cinderellaScore: cinderellaScore
            }
          })
        );
      }

      // Update participant total score
      updates.push(
        prisma.participant.update({
          where: { id: participant.id },
          data: {
            totalScore: totalScore
          }
        })
      );

      await prisma.$transaction(updates);
      console.log('Scores updated in database');
      console.log('----------------------------------------');
    }

    console.log('\nScore fix process completed successfully');
  } catch (error) {
    console.error('Error fixing scores:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixScores()
  .catch(console.error)
  .finally(() => process.exit()); 