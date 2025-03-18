// cleanup-duplicates.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupDuplicateTeams() {
  console.log('Starting cleanup of duplicate teams...');
  
  // Get all teams
  const allTeams = await prisma.team.findMany({
    orderBy: { id: 'asc' } // Keep the earliest entries (lowest IDs)
  });
  
  console.log(`Found ${allTeams.length} total teams`);
  
  // Find duplicates (same name, seed, and region)
  const uniqueTeamKeys = new Map();
  const duplicateIds = [];
  
  allTeams.forEach(team => {
    const key = `${team.name}-${team.seed}-${team.region}`;
    if (uniqueTeamKeys.has(key)) {
      duplicateIds.push(team.id);
    } else {
      uniqueTeamKeys.set(key, team.id);
    }
  });
  
  console.log(`Found ${duplicateIds.length} duplicate teams to remove`);
  
  if (duplicateIds.length === 0) {
    console.log('No duplicates to remove.');
    await prisma.$disconnect();
    return;
  }
  
  try {
    // First, find and handle related records that reference these teams
    // For each duplicate team ID, check for associated records
    
    // 1. Check GamePicks
    const gamePicks = await prisma.gamePick.findMany({
      where: { teamId: { in: duplicateIds } }
    });
    console.log(`Found ${gamePicks.length} related GamePicks`);
    
    // 2. Check FinalFourPicks
    const finalFourPicks = await prisma.finalFourPick.findMany({
      where: { teamId: { in: duplicateIds } }
    });
    console.log(`Found ${finalFourPicks.length} related FinalFourPicks`);
    
    // 3. Check FinalsPicks
    const finalsPicks = await prisma.finalsPick.findMany({
      where: { teamId: { in: duplicateIds } }
    });
    console.log(`Found ${finalsPicks.length} related FinalsPicks`);
    
    // 4. Check ChampionPicks
    const championPicks = await prisma.championPick.findMany({
      where: { teamId: { in: duplicateIds } }
    });
    console.log(`Found ${championPicks.length} related ChampionPicks`);
    
    // 5. Check CinderellaPicks
    const cinderellaPicks = await prisma.cinderellaPick.findMany({
      where: { teamId: { in: duplicateIds } }
    });
    console.log(`Found ${cinderellaPicks.length} related CinderellaPicks`);
    
    // 6. Check Games
    const gamesAsTeam1 = await prisma.game.findMany({
      where: { team1Id: { in: duplicateIds } }
    });
    console.log(`Found ${gamesAsTeam1.length} Games where duplicate is team1`);
    
    const gamesAsTeam2 = await prisma.game.findMany({
      where: { team2Id: { in: duplicateIds } }
    });
    console.log(`Found ${gamesAsTeam2.length} Games where duplicate is team2`);
    
    const gamesAsWinner = await prisma.game.findMany({
      where: { winnerId: { in: duplicateIds } }
    });
    console.log(`Found ${gamesAsWinner.length} Games where duplicate is winner`);
    
    // 7. Check Matches
    const matchesAsTeam1 = await prisma.match.findMany({
      where: { team1Id: { in: duplicateIds } }
    });
    console.log(`Found ${matchesAsTeam1.length} Matches where duplicate is team1`);
    
    const matchesAsTeam2 = await prisma.match.findMany({
      where: { team2Id: { in: duplicateIds } }
    });
    console.log(`Found ${matchesAsTeam2.length} Matches where duplicate is team2`);
    
    const matchesAsWinner = await prisma.match.findMany({
      where: { winnerId: { in: duplicateIds } }
    });
    console.log(`Found ${matchesAsWinner.length} Matches where duplicate is winner`);
    
    // If there are any related records, we need to handle them
    if (gamePicks.length > 0 || finalFourPicks.length > 0 || finalsPicks.length > 0 || 
        championPicks.length > 0 || cinderellaPicks.length > 0 || 
        gamesAsTeam1.length > 0 || gamesAsTeam2.length > 0 || gamesAsWinner.length > 0 ||
        matchesAsTeam1.length > 0 || matchesAsTeam2.length > 0 || matchesAsWinner.length > 0) {
      
      console.log('Found related records. Need to reassign them to the kept versions...');
      
      // For each duplicate, get the ID of the team we're keeping
      const reassignMap = new Map();
      
      duplicateIds.forEach(duplicateId => {
        // Find the team to replace it with
        const duplicateTeam = allTeams.find(t => t.id === duplicateId);
        if (!duplicateTeam) return;
        
        const key = `${duplicateTeam.name}-${duplicateTeam.seed}-${duplicateTeam.region}`;
        const keepId = uniqueTeamKeys.get(key);
        
        if (keepId && keepId !== duplicateId) {
          reassignMap.set(duplicateId, keepId);
        }
      });
      
      console.log(`Will reassign relations for ${reassignMap.size} duplicate teams`);
      
      // Now update all the relationships
      for (const [oldId, newId] of reassignMap.entries()) {
        // Update GamePicks
        await prisma.gamePick.updateMany({
          where: { teamId: oldId },
          data: { teamId: newId }
        });
        
        // Update FinalFourPicks
        await prisma.finalFourPick.updateMany({
          where: { teamId: oldId },
          data: { teamId: newId }
        });
        
        // Update FinalsPicks
        await prisma.finalsPick.updateMany({
          where: { teamId: oldId },
          data: { teamId: newId }
        });
        
        // Update ChampionPicks
        await prisma.championPick.updateMany({
          where: { teamId: oldId },
          data: { teamId: newId }
        });
        
        // Update CinderellaPicks
        await prisma.cinderellaPick.updateMany({
          where: { teamId: oldId },
          data: { teamId: newId }
        });
        
        // Update Games (team1)
        await prisma.game.updateMany({
          where: { team1Id: oldId },
          data: { team1Id: newId }
        });
        
        // Update Games (team2)
        await prisma.game.updateMany({
          where: { team2Id: oldId },
          data: { team2Id: newId }
        });
        
        // Update Games (winner)
        await prisma.game.updateMany({
          where: { winnerId: oldId },
          data: { winnerId: newId }
        });
        
        // Update Matches (team1)
        await prisma.match.updateMany({
          where: { team1Id: oldId },
          data: { team1Id: newId }
        });
        
        // Update Matches (team2)
        await prisma.match.updateMany({
          where: { team2Id: oldId },
          data: { team2Id: newId }
        });
        
        // Update Matches (winner)
        await prisma.match.updateMany({
          where: { winnerId: oldId },
          data: { winnerId: newId }
        });
      }
      
      console.log('Finished reassigning relations');
    }
    
    // Now delete the duplicate teams
    const result = await prisma.team.deleteMany({
      where: { id: { in: duplicateIds } }
    });
    
    console.log(`Successfully removed ${result.count} duplicate teams`);
  } catch (error) {
    console.error('Error removing duplicates:', error);
  }
  
  await prisma.$disconnect();
}

cleanupDuplicateTeams()
  .catch(e => {
    console.error(e);
    process.exit(1);
  });