/**
 * Worker Service
 * Main worker service that manages job processing
 */

import Redis from 'ioredis';
import { logger } from '@/lib/utils/logger';
import { config } from '@/config';
import { createJobQueue } from './job-queue';
import { createWorkerManager } from './worker-manager';
import { createJobScheduler } from './job-scheduler';
import { JobQueue, WorkerManager, JobScheduler, JobProcessor } from './types';
import { processors } from './processors';

export class WorkerService {
  private redis: Redis;
  private jobQueue: JobQueue;
  private workerManager: WorkerManager;
  private jobScheduler: JobScheduler;
  private isRunning = false;

  constructor() {
    // Initialize Redis connection using config
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      db: config.redis.db,
      maxRetriesPerRequest: 3,
    });

    // Initialize job queue
    this.jobQueue = createJobQueue(this.redis);

    // Initialize worker manager
    this.workerManager = createWorkerManager(this.jobQueue);

    // Initialize job scheduler
    this.jobScheduler = createJobScheduler(this.jobQueue);

    // Setup Redis event handlers
    this.setupRedisHandlers();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Worker service is already running');
      return;
    }

    try {
      logger.info('🔄 Starting worker manager...');
      // Start worker manager
      await this.workerManager.start();

      logger.info('🔄 Starting job scheduler...');
      // Start job scheduler
      await this.jobScheduler.start();

      logger.info('🔄 Registering processors...');
      // Register default processors
      this.registerDefaultProcessors();

      this.isRunning = true;
      logger.info('🚀 Worker service started successfully');
    } catch (error) {
      logger.error('Failed to start worker service', undefined, error as Error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Worker service is not running');
      return;
    }

    try {
      // Stop job scheduler
      await this.jobScheduler.stop();

      // Stop worker manager
      await this.workerManager.stop();

      // Close job queue
      await this.jobQueue.close();

      // Close Redis connection
      await this.redis.quit();

      this.isRunning = false;
      logger.info('Worker service stopped');
    } catch (error) {
      logger.error('Error stopping worker service', undefined, error as Error);
    }
  }

  // Public methods for adding jobs
  async addJob(name: string, data: any, options?: any): Promise<any> {
    return this.jobQueue.add(name, data, options);
  }

  async getJobStats(): Promise<any> {
    return this.workerManager.getStats();
  }

  // Register job processors
  registerProcessor(processor: JobProcessor<any>): void {
    this.workerManager.addProcessor(processor);
  }

  private registerDefaultProcessors(): void {
    // Register all processors from processors.ts
    processors.forEach((processor) => {
      this.registerProcessor(processor);
    });
  }

  private setupRedisHandlers(): void {
    this.redis.on('connect', () => {
      logger.info('Redis connected');
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error', undefined, error);
    });

    this.redis.on('close', () => {
      logger.warn('Redis connection closed');
    });

    this.redis.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });
  }
}

// Singleton instance
let workerService: WorkerService | null = null;

export function getWorkerService(): WorkerService {
  if (!workerService) {
    workerService = new WorkerService();
  }
  return workerService;
}

export async function startWorkerService(): Promise<WorkerService> {
  const service = getWorkerService();
  await service.start();
  return service;
}

export async function stopWorkerService(): Promise<void> {
  if (workerService) {
    await workerService.stop();
    workerService = null;
  }
}

// Export types for external use
export * from './types';
