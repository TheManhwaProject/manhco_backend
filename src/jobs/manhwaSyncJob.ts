import cron from 'node-cron';
import { prisma } from '@libs/prisma';
import * as manhwaService from '@services/manhwaService';
import EventEmitter from 'events';

class ManhwaSyncJob extends EventEmitter {
  private queue: Array<{ 
    id: number; 
    mangadexId: string;
    priority: number;
    retries: number;
  }> = [];
  private isProcessing = false;
  private batchSize = parseInt(process.env.SYNC_BATCH_SIZE || '10');
  private maxRetries = 3;
  
  constructor() {
    super();
    this.setupCronJobs();
  }
  
  private setupCronJobs(): void {
    const schedule = process.env.SYNC_CRON_SCHEDULE || '0 */6 * * *'; // Every 6 hours
    
    cron.schedule(schedule, async () => {
      console.log('[ManhwaSyncJob] Starting scheduled sync...');
      await this.queueOutdatedManhwa();
      this.processQueue();
    });
    
    console.log(`[ManhwaSyncJob] Scheduled with pattern: ${schedule}`);
  }
  
  async queueOutdatedManhwa(): Promise<void> {
    try {
      // Find manhwa needing sync
      const outdated = await prisma.manhwa.findMany({
        where: {
          dataSource: 'MANGADX',
          mangadexId: { not: null },
          OR: [
            { lastSyncedAt: null },
            {
              lastSyncedAt: {
                lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours
              }
            },
            { syncStatus: 'FAILED' } // Retry failed syncs
          ]
        },
        select: { 
          id: true, 
          mangadexId: true,
          syncStatus: true
        },
        take: 100,
        orderBy: [
          { syncStatus: 'asc' }, // Failed first
          { lastSyncedAt: 'asc' } // Oldest first
        ]
      });
      
      // Add to queue with appropriate priority
      for (const manhwa of outdated) {
        if (manhwa.mangadexId) {
          this.addToQueue(
            manhwa.id, 
            manhwa.mangadexId,
            manhwa.syncStatus === 'FAILED' ? 0 : 1 // Higher priority for failed
          );
        }
      }
      
      console.log(`[ManhwaSyncJob] Queued ${outdated.length} manhwa for sync`);
    } catch (error) {
      console.error('[ManhwaSyncJob] Failed to queue manhwa:', error);
      this.emit('queue:error', error);
    }
  }
  
  addToQueue(
    id: number, 
    mangadexId: string,
    priority: number = 5
  ): void {
    // Check if already queued
    if (this.queue.some(item => item.id === id)) {
      return;
    }
    
    this.queue.push({ 
      id, 
      mangadexId,
      priority, 
      retries: 0 
    });
    
    // Sort by priority (lower number = higher priority)
    this.queue.sort((a, b) => a.priority - b.priority);
  }
  
  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // Process in batches
      const batch = this.queue.splice(0, this.batchSize);
      
      console.log(`[ManhwaSyncJob] Processing batch of ${batch.length}`);
      
      // Process with concurrency control
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          try {
            await manhwaService.syncFromMangadex(item.id, item.mangadexId);
            this.emit('sync:success', item.id);
            console.log(`[ManhwaSyncJob] Synced manhwa ${item.id}`);
          } catch (error) {
            console.error(`[ManhwaSyncJob] Failed to sync ${item.id}:`, error);
            
            // Retry logic
            if (item.retries < this.maxRetries) {
              item.retries++;
              item.priority = Math.min(item.priority + 1, 10); // Lower priority
              this.queue.push(item); // Re-queue
              this.emit('sync:retry', item.id, item.retries);
            } else {
              this.emit('sync:failed', item.id, error);
            }
            
            throw error;
          }
        })
      );
      
      // Log results
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`[ManhwaSyncJob] Batch complete: ${succeeded} succeeded, ${failed} failed`);
      
      // Continue if more items
      if (this.queue.length > 0) {
        // Wait a bit to avoid hammering the API
        setTimeout(() => this.processQueue(), 2000);
      }
    } finally {
      this.isProcessing = false;
    }
  }
  
  getStatus(): {
    queueLength: number;
    isProcessing: boolean;
    queuedItems: Array<{ id: number; priority: number; retries: number }>;
  } {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      queuedItems: this.queue.map(({ id, priority, retries }) => ({
        id,
        priority,
        retries
      }))
    };
  }
  
  // Manual sync trigger
  async syncNow(manhwaId: number, mangadexId: string): Promise<void> {
    this.addToQueue(manhwaId, mangadexId, 0); // Highest priority
    if (!this.isProcessing) {
      this.processQueue();
    }
  }
}

// Export singleton
export const manhwaSyncJob = new ManhwaSyncJob();

// Log sync events
manhwaSyncJob.on('sync:success', (id) => {
  console.log(`[ManhwaSyncJob] Successfully synced manhwa ${id}`);
});

manhwaSyncJob.on('sync:failed', (id, error) => {
  console.error(`[ManhwaSyncJob] Failed to sync manhwa ${id} after retries:`, error);
});

manhwaSyncJob.on('sync:retry', (id, attempt) => {
  console.log(`[ManhwaSyncJob] Retrying sync for manhwa ${id} (attempt ${attempt})`);
});