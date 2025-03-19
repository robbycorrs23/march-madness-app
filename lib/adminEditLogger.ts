// lib/adminEditLogger.ts
import fs from 'fs';
import path from 'path';

/**
 * Logs admin edits to picks after tournament has started
 */
export async function logAdminEdit(details: {
  adminId: string;
  adminEmail: string;
  participantId: number | string;
  matchId: number;
  teamId: number;
  previousTeamId?: number;
  tournamentRound: string;
  timestamp: Date;
}) {
  try {
    // Create log directory if it doesn't exist
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Format timestamp
    const formattedDate = details.timestamp.toISOString();
    
    // Format log message
    const logMessage = `[${formattedDate}] ADMIN_EDIT: Admin (${details.adminId} - ${details.adminEmail}) changed pick for Participant ${details.participantId}, Match ${details.matchId}, ${details.previousTeamId ? `from TeamID ${details.previousTeamId}` : 'from no selection'} to TeamID ${details.teamId}. Current Tournament Round: ${details.tournamentRound}\n`;
    
    // Log file path - one file per day
    const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
    const logFile = path.join(logDir, `admin-edits-${today}.log`);
    
    // Append to log file
    fs.appendFileSync(logFile, logMessage);
    
    return true;
  } catch (error) {
    console.error('Error logging admin edit:', error);
    return false;
  }
}