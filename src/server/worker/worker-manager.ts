/**
 * Worker Manager
 * Manages job processors and provides statistics
 */

import { logger } from '@/lib/utils/logger';
import { JobQueue, JobProcessor, WorkerManager } from './types';

export class DefaultWorkerManager implements WorkerManager {
  private processors: Map<string, JobProcessor> = new Map();
  private isRunning = false;

  constructor(private jobQueue: JobQueue) {}

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Worker manager is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Worker manager started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Worker manager is not running');
      return;
    }

    this.isRunning = false;
    await this.jobQueue.pause();
    logger.info('Worker manager stopped');
  }

  addProcessor(processor: JobProcessor): void {
    this.processors.set(processor.name, processor);
    this.jobQueue.process(processor);
    logger.info(`Added processor: ${processor.name}`);
  }

  removeProcessor(name: string): void {
    if (this.processors.delete(name)) {
      logger.info(`Removed processor: ${name}`);
    } else {
      logger.warn(`Processor not found: ${name}`);
    }
  }

  async getStats(): Promise<{
    active: number;
    waiting: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [active, waiting, completed, failed, delayed] = await Promise.all([
      this.jobQueue.getJobs('running' as any),
      this.jobQueue.getJobs('pending' as any),
      this.jobQueue.getJobs('completed' as any),
      this.jobQueue.getJobs('failed' as any),
      this.jobQueue.getJobs('retrying' as any),
    ]);

    return {
      active: active.length,
      waiting: waiting.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  getProcessors(): JobProcessor[] {
    return Array.from(this.processors.values());
  }

  getProcessor(name: string): JobProcessor | undefined {
    return this.processors.get(name);
  }
}

export function createWorkerManager(jobQueue: JobQueue): WorkerManager {
  return new DefaultWorkerManager(jobQueue);
}
