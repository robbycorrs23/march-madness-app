// app/api/debug/fix-scores/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from "../../../../lib/auth";
import { prisma } from '../../../../lib/prisma';

// Map round numbers to points
const roundPointsMap = {
  1: 1,  // Round of 64
  2: 2,  // Round of 32
  3: 4,  // Sweet 16
  4: 8,  // Elite 8
  5: 15, // Final Four
  6: 25  // Championship
};

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const diagnostic = {
      participants: [] as any[],
      matches: [] as any[],
      matchPicks: [] as any[],
      preTournamentPicks: [] as any[],
      updates: [] as any[],
    };

    // 1. Get all participants
    const participants = await prisma.participant.findMany({
      include: {
        matchPicks: true,
        preTournamentPick: {
          include: {
            finalFourPicks: true,
            finalsPicks: true,
            championPick: true,
            cinderellaPicks: true
          }
        }
      }
    });

    diagnostic.participants = participants.map(p => ({
      id: p.id,
      name: p.name,
      currentScore: p.totalScore,
      matchPickCount: p.matchPicks.length,
      hasPreTournamentPick: !!p.preTournamentPick
    }));

    // 2. Get completed matches
    const completedMatches = await prisma.match.findMany({
      where: {
        completed: true,
        winnerId: { not: null }
      }
    });

    diagnostic.matches = completedMatches.map(m => ({
      id: m.id,
      round: m.round,
      winnerId: m.winnerId,
      completed: m.completed
    }));

    // 3. Verify match picks have correct score values
    const matchPicks = await prisma.matchPick.findMany({
      include: {
        match: true
      }
    });

    diagnostic.matchPicks = matchPicks.map(mp => ({
      id: mp.id,
      participantId: mp.participantId,
      matchId: mp.matchId,
      teamId: mp.teamId,
      correct: mp.correct,
      roundScore: mp.roundScore,
      matchCompleted: mp.match.completed,
      matchWinnerId: mp.match.winnerId
    }));

    // 4. Fix scores
    console.log("Beginning score correction process");
    
    for (const participant of participants) {
      console.log(`Processing participant ${participant.id} (${participant.name})`);
      
      // Reset participant scores to recalculate from scratch
      let totalMatchScore = 0;
      let totalPreTournamentScore = 0;
      let totalCinderellaScore = 0;
      
      // Process match picks
      const participantMatchPicks = matchPicks.filter(mp => 
        mp.participantId === participant.id && 
        mp.match.completed && 
        mp.match.winnerId
      );
      
      for (const pick of participantMatchPicks) {
        const isCorrect = pick.teamId === pick.match.winnerId;
        const roundPoints = roundPointsMap[pick.match.round as keyof typeof roundPointsMap] || 0;
        const pickScore = isCorrect ? roundPoints : 0;
        
        // Update the pick's correct and roundScore values
        await prisma.matchPick.update({
          where: { id: pick.id },
          data: {
            correct: isCorrect,
            roundScore: pickScore
          }
        });
        
        totalMatchScore += pickScore;
        
        diagnostic.updates.push({
          type: 'matchPick',
          id: pick.id,
          participantId: participant.id,
          matchId: pick.matchId,
          isCorrect,
          roundPoints,
          newScore: pickScore
        });
      }
      
      // Process pre-tournament picks if they exist
      if (participant.preTournamentPick) {
        let preTournamentScore = 0;
        
        // Get Final Four teams
        const finalFourMatches = await prisma.match.findMany({
          where: { round: 5 }, // Final Four
        });
        
        const finalFourTeamIds = new Set<number>();
        finalFourMatches.forEach(match => {
          finalFourTeamIds.add(match.team1Id);
          finalFourTeamIds.add(match.team2Id);
        });
        
        // Get Championship teams
        const championshipMatch = await prisma.match.findFirst({
          where: { round: 6 } // Championship
        });
        
        const championshipTeamIds = new Set<number>();
        if (championshipMatch) {
          championshipTeamIds.add(championshipMatch.team1Id);
          championshipTeamIds.add(championshipMatch.team2Id);
        }
        
        // Get Champion
        let championId: number | null = null;
        if (championshipMatch?.completed && championshipMatch?.winnerId) {
          championId = championshipMatch.winnerId;
        }
        
        // Process Final Four picks (5 pts each)
        for (const pick of participant.preTournamentPick.finalFourPicks) {
          if (finalFourTeamIds.has(pick.teamId)) {
            preTournamentScore += 5;
            diagnostic.updates.push({
              type: 'finalFourPick',
              participantId: participant.id,
              teamId: pick.teamId,
              points: 5
            });
          }
        }
        
        // Process Finals picks (10 pts each)
        for (const pick of participant.preTournamentPick.finalsPicks) {
          if (championshipTeamIds.has(pick.teamId)) {
            preTournamentScore += 10;
            diagnostic.updates.push({
              type: 'finalsPick',
              participantId: participant.id,
              teamId: pick.teamId,
              points: 10
            });
          }
        }
        
        // Process Champion pick (25 pts)
        if (participant.preTournamentPick.championPick && championId === participant.preTournamentPick.championPick.teamId) {
          preTournamentScore += 25;
          diagnostic.updates.push({
            type: 'championPick',
            participantId: participant.id,
            teamId: participant.preTournamentPick.championPick.teamId,
            points: 25
          });
        }
        
        // Update pre-tournament pick score
        await prisma.preTournamentPick.update({
          where: { id: participant.preTournamentPick.id },
          data: { score: preTournamentScore }
        });
        
        totalPreTournamentScore = preTournamentScore;
        
        // Process Cinderella picks
        for (const cinderellaPick of participant.preTournamentPick.cinderellaPicks) {
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
            
            let teamCinderellaPoints = 0;
            
            // Double points for each win
            for (const win of teamWins) {
              const basePoints = roundPointsMap[win.round as keyof typeof roundPointsMap] || 0;
              const doubledPoints = basePoints * 2;
              teamCinderellaPoints += doubledPoints;
              
              diagnostic.updates.push({
                type: 'cinderellaPick',
                participantId: participant.id,
                teamId: cinderellaPick.teamId,
                teamName: team.name,
                teamSeed: team.seed,
                matchId: win.id,
                round: win.round,
                basePoints,
                doubledPoints
              });
            }
            
            totalCinderellaScore += teamCinderellaPoints;
          }
        }
      }
      
      // Calculate total score
      const totalScore = totalMatchScore + totalPreTournamentScore + totalCinderellaScore;
      
      // Update participant's total score
      await prisma.participant.update({
        where: { id: participant.id },
        data: { totalScore }
      });
      
      diagnostic.updates.push({
        type: 'participantTotalScore',
        participantId: participant.id,
        participantName: participant.name,
        previousScore: participant.totalScore,
        newScore: totalScore,
        breakdown: {
          matchScore: totalMatchScore,
          preTournamentScore: totalPreTournamentScore,
          cinderellaScore: totalCinderellaScore
        }
      });
      
      console.log(`Updated score for participant ${participant.id} to ${totalScore}`);
    }

    return NextResponse.json({
      success: true,
      message: "Score correction process completed",
      diagnostic
    });
  } catch (error) {
    console.error('Error fixing scores:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fix scores',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
