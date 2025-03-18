// app/api/cron/check-transitions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkAndProcessScheduledTransitions } from '../../../../lib/transition-scheduler';

// This route can be called by a cron job service
export async function GET(req: NextRequest) {
  try {
    // Check for a secret token to secure the endpoint
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    // Verify the token matches our secret
    // This prevents unauthorized access to the cron endpoint
    if (token !== process.env.CRON_SECRET_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Process any pending transitions
    const processedCount = await checkAndProcessScheduledTransitions();
    
    return NextResponse.json({
      success: true,
      processedCount,
      message: `Processed ${processedCount} scheduled transitions`
    });
  } catch (error) {
    console.error('Error in transition check cron:', error);
    return NextResponse.json(
      { error: 'Failed to process transitions' },
      { status: 500 }
    );
  }
}