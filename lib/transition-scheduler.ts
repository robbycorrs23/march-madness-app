// lib/transition-scheduler.ts
import { prisma } from './prisma';

/**
 * Checks for scheduled transitions that should be executed and advances tournaments
 * to their next round if the scheduled time has passed.
 */
export async function checkAndProcessScheduledTransitions() {
  try {
    // Find all transitions scheduled for the past
    const pendingTransitions = await prisma.scheduledTransition.findMany({
      where: {
        scheduledTime: {
          lte: new Date() // Less than or equal to current time
        }
      },
      include: {
        tournament: true
      }
    });
    
    // Process each pending transition
    for (const transition of pendingTransitions) {
      try {
        // Check if the tournament is still in the expected "from" round
        if (transition.tournament.currentRound !== transition.fromRound) {
          // Tournament round has already changed, just clean up
          await prisma.scheduledTransition.delete({
            where: { id: transition.id }
          });
          continue;
        }
        
        // Update the tournament round
        await prisma.tournament.update({
          where: { id: transition.tournamentId },
          data: { currentRound: transition.toRound }
        });
        
        // Generate next round matches if needed (from Pre-Tournament to Round of 64)
        if (transition.fromRound === 'Pre-Tournament' && transition.toRound === 'Round of 64') {
          try {
            // Call your existing bracket generation logic
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/tournament/generate-bracket`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                tournamentId: transition.tournamentId
              })
            });
          } catch (error) {
            console.error('Failed to generate bracket:', error);
          }
        }
        
        // Delete the processed transition
        await prisma.scheduledTransition.delete({
          where: { id: transition.id }
        });
        
        console.log(`Successfully advanced tournament ${transition.tournamentId} from ${transition.fromRound} to ${transition.toRound}`);
      } catch (error) {
        console.error(`Error processing transition ${transition.id}:`, error);
      }
    }
    
    return pendingTransitions.length;
  } catch (error) {
    console.error('Error checking scheduled transitions:', error);
    return 0;
  }
}

export async function setupTransitionChecker() {
  // For Next.js app, you might want to check on app startup
  await checkAndProcessScheduledTransitions();
  
  // For server environments where you can run background processes
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
    // Check every minute in production
    setInterval(async () => {
      await checkAndProcessScheduledTransitions();
    }, 60 * 1000); // 60 seconds
  }
}