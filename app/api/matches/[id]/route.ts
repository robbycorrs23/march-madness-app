// app/api/matches/[id]/route.ts
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

// Calculate scores for a match
async function calculateScoresForMatch(matchId: number, winnerId: number) {
  try {
    console.log(`Starting score calculation for match ${matchId} with winner ${winnerId}`);
    
    // 1. Get the match to determine round
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { round: true }
    });

    if (!match) {
      console.error(`Match not found: ${matchId}`);
      return;
    }

    // 2. Get points for this round
    const roundNumber = match.round;
    const pointsForCorrectPick = roundPointsMap[roundNumber as keyof typeof roundPointsMap] || 0;
    
    console.log(`Match is in round ${roundNumber}, worth ${pointsForCorrectPick} points`);

    // 3. Find all participant picks for this match
    const picks = await prisma.matchPick.findMany({
      where: { matchId },
      select: { id: true, participantId: true, teamId: true }
    });

    console.log(`Found ${picks.length} picks for match ${matchId}`);

    // 4. Update each pick's correctness and points
    for (const pick of picks) {
      const isCorrect = pick.teamId === winnerId;
      const roundScore = isCorrect ? pointsForCorrectPick : 0;
      
      console.log(`Participant ${pick.participantId} picked team ${pick.teamId}, correct: ${isCorrect}, points: ${roundScore}`);

      await prisma.matchPick.update({
        where: { id: pick.id },
        data: { 
          correct: isCorrect,
          roundScore: roundScore
        }
      });

      // 5. Update participant's total score
      await updateParticipantTotalScore(pick.participantId);
    }

    console.log(`Scores calculated successfully for match ${matchId}`);
  } catch (error) {
    console.error('Error calculating match scores:', error);
  }
}

// Update a participant's total score
async function updateParticipantTotalScore(participantId: number) {
  try {
    console.log(`Updating total score for participant ${participantId}`);
    
    // Get match pick scores
    const matchPickScores = await prisma.matchPick.aggregate({
      where: { participantId },
      _sum: { roundScore: true }
    });
    
    const matchPickTotal = matchPickScores._sum.roundScore || 0;
    console.log(`Match pick total: ${matchPickTotal}`);

    // Get pre-tournament score
    const preTournamentPick = await prisma.preTournamentPick.findUnique({
      where: { participantId },
      select: { score: true, id: true }
    });
    
    const preTournamentScore = preTournamentPick?.score || 0;
    console.log(`Pre-tournament score: ${preTournamentScore}`);

    // Calculate cinderella scores
    let cinderellaScore = 0;
    if (preTournamentPick) {
      // Get cinderella picks for this participant
      const cinderellaPicks = await prisma.cinderellaPick.findMany({
        where: { preTournamentPickId: preTournamentPick.id },
        include: { team: true }
      });

      // For each cinderella pick, find matches they won
      for (const pick of cinderellaPicks) {
        // Only count teams with seeds 11-16 as cinderellas
        if (pick.team.seed >= 11) {
          const cinderellaWins = await prisma.match.findMany({
            where: {
              winnerId: pick.teamId,
              completed: true
            },
            select: { round: true }
          });
          
          let teamPoints = 0;
          // Double points for each win
          for (const win of cinderellaWins) {
            const basePoints = roundPointsMap[win.round as keyof typeof roundPointsMap] || 0;
            const doubledPoints = basePoints * 2; // Double points for cinderella
            teamPoints += doubledPoints;
            console.log(`Cinderella team ${pick.team.name} (${pick.team.seed}) win in round ${win.round}: ${basePoints} × 2 = ${doubledPoints} points`);
          }
          
          cinderellaScore += teamPoints;
          console.log(`Cinderella team ${pick.team.name} total points: ${teamPoints}`);
        }
      }
    }
    
    console.log(`Total cinderella score: ${cinderellaScore}`);

    // Calculate total score
    const totalScore = matchPickTotal + preTournamentScore + cinderellaScore;
    console.log(`Total score for participant ${participantId}: ${totalScore}`);

    // Use a transaction to ensure the score update completes atomically
    await prisma.$transaction([
      prisma.participant.update({
        where: { id: participantId },
        data: { totalScore }
      })
    ]);

    console.log(`Successfully updated total score for participant ${participantId} to ${totalScore}`);
  } catch (error) {
    console.error(`Error updating total score for participant ${participantId}:`, error);
  }
}

// Recalculate pre-tournament scores if needed (for Final Four, Championship rounds)
async function updatePreTournamentScores() {
  try {
    console.log("Recalculating pre-tournament scores");
    
    // Get all pre-tournament picks
    const preTournamentPicks = await prisma.preTournamentPick.findMany({
      include: {
        participant: true,
        finalFourPicks: { include: { team: true } },
        finalsPicks: { include: { team: true } },
        championPick: { include: { team: true } }
      }
    });
    
    console.log(`Found ${preTournamentPicks.length} pre-tournament picks to recalculate`);
    
    // Get final four teams (if available)
    const finalFourMatches = await prisma.match.findMany({
      where: { round: 5 }, // Final Four
    });
    
    const finalFourTeamIds = new Set<number>();
    finalFourMatches.forEach(match => {
      finalFourTeamIds.add(match.team1Id);
      finalFourTeamIds.add(match.team2Id);
    });
    
    // Get championship teams (if available)
    const championshipMatch = await prisma.match.findFirst({
      where: { round: 6 } // Championship
    });
    
    const championshipTeamIds = new Set<number>();
    if (championshipMatch) {
      championshipTeamIds.add(championshipMatch.team1Id);
      championshipTeamIds.add(championshipMatch.team2Id);
    }
    
    // Get champion (if available)
    let championId: number | null = null;
    if (championshipMatch?.completed && championshipMatch?.winnerId) {
      championId = championshipMatch.winnerId;
    }
    
    // Process each pre-tournament pick
    for (const pretPick of preTournamentPicks) {
      let score = 0;
      
      // Final Four picks (5 pts each)
      for (const pick of pretPick.finalFourPicks) {
        if (finalFourTeamIds.has(pick.teamId)) {
          score += 5;
          console.log(`Participant ${pretPick.participant.name}: Final Four pick correct for ${pick.team.name}, +5 points`);
        }
      }
      
      // Finals picks (10 pts each)
      for (const pick of pretPick.finalsPicks) {
        if (championshipTeamIds.has(pick.teamId)) {
          score += 10;
          console.log(`Participant ${pretPick.participant.name}: Finals pick correct for ${pick.team.name}, +10 points`);
        }
      }
      
      // Champion pick (25 pts)
      if (pretPick.championPick && championId === pretPick.championPick.teamId) {
        score += 25;
        console.log(`Participant ${pretPick.participant.name}: Champion pick correct for ${pretPick.championPick.team.name}, +25 points`);
      }
      
      console.log(`Participant ${pretPick.participant.name}: Total pre-tournament score: ${score}`);
      
      // Update pre-tournament pick score
      await prisma.preTournamentPick.update({
        where: { id: pretPick.id },
        data: { score }
      });
      
      // Update participant's total score
      await updateParticipantTotalScore(pretPick.participantId);
    }
    
    console.log("Pre-tournament scores recalculated successfully");
  } catch (error) {
    console.error("Error updating pre-tournament scores:", error);
  }
}

// PATCH: Update match result
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse match ID from params
    const resolvedParams = await params;
    const matchId = parseInt(resolvedParams.id);
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const forceRecalculate = searchParams.get('forceRecalculate') === 'true';
    
    // Get the match before updating
    const existingMatch = await prisma.match.findUnique({
      where: { id: matchId },
      select: { 
        winnerId: true, 
        completed: true,
        round: true
      }
    });
    
    if (!existingMatch) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }
    
    // Parse request body - now we accept partial updates
    const data = await request.json();
    const { winnerId, team1Score, team2Score, completed } = data;
    
    // Build update object with only provided fields
    const updateData: any = {};
    
    if (winnerId !== undefined) {
      updateData.winnerId = winnerId;
      updateData.completed = true;
    }
    
    if (team1Score !== undefined) {
      updateData.team1Score = team1Score;
    }
    
    if (team2Score !== undefined) {
      updateData.team2Score = team2Score;
    }
    
    if (completed !== undefined) {
      updateData.completed = completed;
    }
    
    // Update match in the database
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: updateData,
      include: {
        team1: true,
        team2: true
      }
    });
    
    // Calculate scores if a winner is set and match is completed or force recalculate is true
    if (updatedMatch.winnerId && (updatedMatch.completed || forceRecalculate)) {
      // Only calculate if something relevant changed or force recalculate is true
      const winnerChanged = winnerId !== undefined && winnerId !== existingMatch.winnerId;
      const completedChanged = completed !== undefined && completed !== existingMatch.completed;
      
      if (winnerChanged || completedChanged || forceRecalculate) {
        console.log(`Triggering score calculation for match ${matchId}`);
        
        // Calculate scores for this match
        await calculateScoresForMatch(matchId, updatedMatch.winnerId);
        
        // If this is a Final Four or Championship match, update pre-tournament scores too
        if (existingMatch.round >= 5) {
          console.log(`Match ${matchId} is in round ${existingMatch.round} (Final Four or Championship), updating pre-tournament scores`);
          await updatePreTournamentScores();
        }
      }
    }
    
    // If this is the Championship match and we have a winner, update eliminated status
    if (winnerId !== undefined && existingMatch.round === 6) { // Championship round
      console.log(`Updating eliminated status for Championship match ${matchId}`);
      
      const losingTeamId = winnerId === updatedMatch.team1.id 
        ? updatedMatch.team2.id 
        : updatedMatch.team1.id;
      
      await prisma.team.update({
        where: { id: losingTeamId },
        data: { eliminated: true }
      });
      
      console.log(`Marked team ${losingTeamId} as eliminated`);
    }
    
    return NextResponse.json(updatedMatch);
  } catch (error) {
    console.error('Error updating match:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update match',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// GET: Retrieve match details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const resolvedParams = await params;
    const matchId = parseInt(resolvedParams.id);
    
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        team1: true,
        team2: true,
        winner: true,
        matchPicks: {
          include: {
            team: true,
            participant: true
          }
        }
      }
    });
    
    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(match);
  } catch (error) {
    console.error('Error retrieving match:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve match' },
      { status: 500 }
    );
  }
}