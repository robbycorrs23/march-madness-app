// lib/calculateScores.ts
import { prisma } from './prisma';

// Map round number to points
const roundPointsMap = {
  1: 1,  // Round of 64
  2: 2,  // Round of 32
  3: 4,  // Sweet 16
  4: 8,  // Elite 8
  5: 15, // Final Four
  6: 25  // Championship
};

export async function calculateScores(tournamentId: number): Promise<void> {
  console.log(`Starting score calculation for tournament ${tournamentId}`);
  
  // Get all participants
  const participants = await prisma.participant.findMany({
    where: { tournamentId },
    select: { id: true, name: true }
  });
  
  console.log(`Found ${participants.length} participants to calculate scores for`);
  
  // Get completed matches with winners
  const completedMatches = await prisma.match.findMany({
    where: { 
      completed: true,
      winnerId: { not: null }
    },
    select: {
      id: true,
      round: true,
      winnerId: true
    }
  });
  
  console.log(`Found ${completedMatches.length} completed matches with winners`);
  
  // Process each participant
  for (const participant of participants) {
    console.log(`Processing scores for participant ${participant.id} (${participant.name})`);
    
    // 1. Process Match Picks
    const matchPicks = await prisma.matchPick.findMany({
      where: { participantId: participant.id },
      include: { match: true }
    });
    
    // Create a batch update for match picks
    const matchPickUpdates = [];
    
    for (const pick of matchPicks) {
      // Find if match is completed and has a winner
      const match = completedMatches.find(m => m.id === pick.matchId);
      
      if (match) {
        // Calculate if pick was correct
        const correct = pick.teamId === match.winnerId;
        
        // Calculate round score based on round
        const roundScore = correct ? (roundPointsMap[match.round as keyof typeof roundPointsMap] || 0) : 0;
        
        // Add to batch updates
        matchPickUpdates.push(
          prisma.matchPick.update({
            where: { id: pick.id },
            data: {
              correct,
              roundScore
            }
          })
        );
      }
    }
    
    // 2. Calculate Pre-Tournament Score
    // Get pre-tournament pick if exists
    const preTournamentPick = await prisma.preTournamentPick.findUnique({
      where: { participantId: participant.id },
      include: {
        finalFourPicks: true,
        finalsPicks: true,
        championPick: true,
        cinderellaPicks: true
      }
    });
    
    let preTournamentScore = 0;
    
    if (preTournamentPick) {
      // Process final four picks (5 pts each)
      for (const pick of preTournamentPick.finalFourPicks) {
        // Check if this team made it to the Final Four
        const madeItToFinalFour = await prisma.match.findFirst({
          where: {
            round: 5, // Final Four
            OR: [
              { team1Id: pick.teamId },
              { team2Id: pick.teamId }
            ]
          }
        });
        
        if (madeItToFinalFour) {
          preTournamentScore += 5;
        }
      }
      
      // Process finals picks (10 pts each)
      for (const pick of preTournamentPick.finalsPicks) {
        // Check if this team made it to the Championship
        const madeItToChampionship = await prisma.match.findFirst({
          where: {
            round: 6, // Championship
            OR: [
              { team1Id: pick.teamId },
              { team2Id: pick.teamId }
            ]
          }
        });
        
        if (madeItToChampionship) {
          preTournamentScore += 10;
        }
      }
      
      // Process champion pick (25 pts)
      if (preTournamentPick.championPick) {
        // Find the championship match
        const championshipMatch = await prisma.match.findFirst({
          where: {
            round: 6, // Championship
            completed: true,
            winnerId: { not: null }
          }
        });
        
        if (championshipMatch && championshipMatch.winnerId === preTournamentPick.championPick.teamId) {
          preTournamentScore += 25;
        }
      }
    }
    
    // 3. Calculate Cinderella Score
    let cinderellaScore = 0;
    
    if (preTournamentPick && preTournamentPick.cinderellaPicks.length > 0) {
      for (const cinderellaPick of preTournamentPick.cinderellaPicks) {
        // Get the team to check its seed
        const team = await prisma.team.findUnique({
          where: { id: cinderellaPick.teamId },
          select: { seed: true, name: true }
        });
        
        // Only teams seeded 11-16 qualify as Cinderellas
        if (team && team.seed >= 11 && team.seed <= 16) {
          // Find all completed matches where this team won
          const teamWins = await prisma.match.findMany({
            where: {
              completed: true,
              winnerId: cinderellaPick.teamId
            }
          });
          
          // Double points for each win
          for (const win of teamWins) {
            const basePoints = roundPointsMap[win.round as keyof typeof roundPointsMap] || 0;
            const doubledPoints = basePoints * 2;
            cinderellaScore += doubledPoints;
            
            console.log(`Cinderella points for ${team.name} (seed ${team.seed}) in round ${win.round}: ${basePoints} * 2 = ${doubledPoints}`);
          }
        }
      }
    }
    
    // 4. Calculate total score
    // Get sum of match pick scores
    const matchPicksTotal = await prisma.matchPick.aggregate({
      where: { participantId: participant.id },
      _sum: { roundScore: true }
    });
    
    // Get sum of game pick scores (if any)
    const gamePicksTotal = await prisma.gamePick.aggregate({
      where: { participantId: participant.id },
      _sum: { roundScore: true }
    });
    
    const totalScore = 
      (matchPicksTotal._sum.roundScore || 0) + 
      (gamePicksTotal._sum.roundScore || 0) + 
      preTournamentScore + 
      cinderellaScore;
    
    console.log(`Score breakdown for participant ${participant.id}:`);
    console.log(`- Match picks: ${matchPicksTotal._sum.roundScore || 0}`);
    console.log(`- Game picks: ${gamePicksTotal._sum.roundScore || 0}`);
    console.log(`- Pre-tournament: ${preTournamentScore}`);
    console.log(`- Cinderella: ${cinderellaScore}`);
    console.log(`- Total: ${totalScore}`);
    
    // Create a transaction for all updates
    const transactions = [];
    
    // Add match pick updates
    transactions.push(...matchPickUpdates);
    
    // Add pre-tournament pick update if it exists
    if (preTournamentPick) {
      transactions.push(
        prisma.preTournamentPick.update({
          where: { id: preTournamentPick.id },
          data: { 
            score: preTournamentScore,
            cinderellaScore // Store Cinderella score separately
          }
        })
      );
    }
    
    // Add participant total score update
    transactions.push(
      prisma.participant.update({
        where: { id: participant.id },
        data: { totalScore }
      })
    );
    
    // Execute all updates in a single transaction
    await prisma.$transaction(transactions);
    
    console.log(`Updated score for participant ${participant.id} to ${totalScore}`);
  }
  
  console.log('Score calculation complete');
}