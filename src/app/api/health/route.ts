import { NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    // Check database health
    const dbHealthy = await checkDatabaseHealth();

    // Overall health status (only database now)
    const overallStatus = dbHealthy ? 'healthy' : 'unhealthy';

    const healthData = {
      status: overallStatus,
      timestamp,
      services: {
        database: {
          status: dbHealthy ? 'healthy' : 'unhealthy',
        },
      },
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 503;

    return NextResponse.json(healthData, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    // Simple query to check database connectivity
    const result = await db().$client`SELECT 1 as health`;
    return result.length > 0;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
