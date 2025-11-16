import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';

// Admin endpoint to clean up all inactive session files
export async function POST(request: Request) {
  try {
    const { adminKey } = await request.json();
    
    // Simple admin key validation (in production, use proper auth)
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const sessionsDir = path.join(process.cwd(), 'sessions');
    
    if (!await fs.pathExists(sessionsDir)) {
      return NextResponse.json({ 
        message: 'No sessions directory found',
        cleaned: 0 
      });
    }
    
    const userDirs = await fs.readdir(sessionsDir);
    let totalSize = 0;
    let fileCount = 0;
    let cleaned = 0;
    
    // Calculate current size
    for (const dir of userDirs) {
      if (!dir.startsWith('user_')) continue;
      
      const sessionPath = path.join(sessionsDir, dir);
      const stats = await fs.stat(sessionPath);
      
      if (stats.isDirectory()) {
        const files = await fs.readdir(sessionPath);
        fileCount += files.length;
        
        for (const file of files) {
          const filePath = path.join(sessionPath, file);
          const fileStats = await fs.stat(filePath);
          totalSize += fileStats.size;
        }
      }
    }
    
    // Clean up sessions older than 7 days
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    for (const dir of userDirs) {
      if (!dir.startsWith('user_')) continue;
      
      const sessionPath = path.join(sessionsDir, dir);
      const stats = await fs.stat(sessionPath);
      
      if (stats.mtimeMs < thirtyDaysAgo) {
        await fs.remove(sessionPath);
        cleaned++;
      }
    }
    
    return NextResponse.json({ 
      message: `Cleanup completed`,
      stats: {
        totalUsers: userDirs.length,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        totalFiles: fileCount,
        cleanedFolders: cleaned,
        remainingUsers: userDirs.length - cleaned
      }
    });
    
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ 
      error: 'Cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to check current session storage usage
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const adminKey = searchParams.get('adminKey');
    
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const sessionsDir = path.join(process.cwd(), 'sessions');
    
    if (!await fs.pathExists(sessionsDir)) {
      return NextResponse.json({ 
        totalUsers: 0,
        totalSizeMB: 0,
        totalFiles: 0,
        oldestSessionDays: 0
      });
    }
    
    const userDirs = await fs.readdir(sessionsDir);
    let totalSize = 0;
    let fileCount = 0;
    let oldestTime = Date.now();
    
    for (const dir of userDirs) {
      if (!dir.startsWith('user_')) continue;
      
      const sessionPath = path.join(sessionsDir, dir);
      const stats = await fs.stat(sessionPath);
      
      if (stats.mtimeMs < oldestTime) {
        oldestTime = stats.mtimeMs;
      }
      
      if (stats.isDirectory()) {
        const files = await fs.readdir(sessionPath);
        fileCount += files.length;
        
        for (const file of files) {
          const filePath = path.join(sessionPath, file);
          const fileStats = await fs.stat(filePath);
          totalSize += fileStats.size;
        }
      }
    }
    
    const daysSinceOldest = Math.floor((Date.now() - oldestTime) / (24 * 60 * 60 * 1000));
    
    return NextResponse.json({ 
      totalUsers: userDirs.filter(d => d.startsWith('user_')).length,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      totalFiles: fileCount,
      oldestSessionDays: daysSinceOldest,
      avgSizePerUserKB: userDirs.length > 0 ? ((totalSize / userDirs.length) / 1024).toFixed(2) : 0
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ 
      error: 'Failed to get stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
