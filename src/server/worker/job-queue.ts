/**
 * Job Queue Service using Redis
 * Implements a job queue system with Redis as the backend
 */

import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/utils/logger';
import { Job, JobStatus, JobPriority, JobData, JobOptions, JobProcessor, JobQueue } from './types';

export class RedisJobQueue implements JobQueue {
  private redis: Redis;
  private processors: Map<string, JobProcessor> = new Map();
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  get name(): string {
    return 'default';
  }

  async add(jobName: string, data: JobData, options: JobOptions = {}): Promise<Job> {
    const job: Job = {
      id: uuidv4(),
      name: jobName,
      data,
      options: {
        priority: JobPriority.NORMAL,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 0,
        removeOnFail: 5,
        timeout: 30000,
        ...options,
      },
      status: JobStatus.PENDING,
      progress: 0,
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: options.attempts || 3,
    };

    // Store job data
    await this.redis.hset(`job:${job.id}`, {
      id: job.id,
      name: job.name,
      data: JSON.stringify(job.data),
      options: JSON.stringify(job.options),
      status: job.status,
      progress: job.progress.toString(),
      createdAt: job.createdAt.toISOString(),
      attempts: job.attempts.toString(),
      maxAttempts: job.maxAttempts.toString(),
    });

    // Add to appropriate queue based on delay
    if (options.delay && options.delay > 0) {
      // Delayed job
      await this.redis.zadd('delayed_jobs', Date.now() + options.delay, job.id);
      logger.info(`Added delayed job ${job.id} (${jobName})`, { delay: options.delay });
    } else {
      // Immediate job - add to priority queue
      const priority = options.priority || JobPriority.NORMAL;
      await this.redis.zadd('job_queue', priority, job.id);
      logger.info(`Added job ${job.id} (${jobName})`, { priority });
    }

    return job;
  }

  process(processor: JobProcessor): void {
    this.processors.set(processor.name, processor);
    logger.info(`Registered processor: ${processor.name}`);
  }

  private async processNextJob(): Promise<void> {
    try {
      // Check for delayed jobs first
      const now = Date.now();
      const delayedJobs = await this.redis.zrangebyscore('delayed_jobs', 0, now, 'LIMIT', 0, 1);

      if (delayedJobs.length > 0) {
        const jobId = delayedJobs[0];
        await this.redis.zrem('delayed_jobs', jobId);
        await this.redis.zadd('job_queue', JobPriority.NORMAL, jobId);
        logger.info(`Moved delayed job ${jobId} to processing queue`);
      }

      // Get next job from queue
      const jobIds = await this.redis.zrevrange('job_queue', 0, 0); // Get highest priority job

      if (jobIds.length === 0) {
        return; // No jobs to process
      }

      const jobId = jobIds[0];
      logger.info(`Processing job ${jobId} from queue`);

      await this.redis.zrem('job_queue', jobId); // Remove from queue

      const job = await this.getJob(jobId);
      if (!job) {
        logger.warn(`Job ${jobId} not found`);
        return;
      }

      logger.info(`Found job ${jobId} (${job.name}), looking for processor...`);
      const processor = this.processors.get(job.name);
      if (!processor) {
        logger.warn(`No processor found for job type: ${job.name}`);
        await this.updateJobStatus(jobId, JobStatus.FAILED, {
          error: `No processor found for job type: ${job.name}`,
          completedAt: new Date(),
        });
        return;
      }

      logger.info(`Found processor for ${job.name}, executing...`);
      // Process the job
      await this.processJob(job, processor);
    } catch (error) {
      logger.error('Error processing job', undefined, error as Error);
    }
  }

  async getJob(jobId: string): Promise<Job | null> {
    const keys = await this.redis.keys(`job:${jobId}`);

    if (keys.length > 0) {
      const jobData = await this.redis.hgetall(keys[0]);
      if (jobData.id) {
        return this.deserializeJob(jobData);
      }
    }

    return null;
  }

  async getJobs(status?: JobStatus, start = 0, end = -1): Promise<Job[]> {
    const pattern = 'job:*';
    const keys = await this.redis.keys(pattern);

    if (keys.length === 0) return [];

    const jobs: Job[] = [];
    for (const key of keys.slice(start, end === -1 ? undefined : end + 1)) {
      const jobData = await this.redis.hgetall(key);
      if (jobData.id) {
        const job = this.deserializeJob(jobData);
        // Filter by status if specified
        if (!status || job.status === status) {
          jobs.push(job);
        }
      }
    }

    return jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async removeJob(jobId: string): Promise<boolean> {
    const deleted = await this.redis.del(`job:${jobId}`);
    if (deleted > 0) {
      await this.redis.zrem('job_queue', jobId);
      await this.redis.zrem('delayed_jobs', jobId);
      return true;
    }

    return false;
  }

  async pause(): Promise<void> {
    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    logger.info('Job queue paused');
  }

  async resume(): Promise<void> {
    if (!this.isProcessing) {
      this.startProcessing();
    }
    logger.info('Job queue resumed');
  }

  async isPaused(): Promise<boolean> {
    return !this.isProcessing;
  }

  // Public method to manually cleanup completed jobs
  async cleanupAllCompletedJobs(keepCount: number = 3): Promise<number> {
    logger.info(`Manual cleanup: keeping ${keepCount} most recent completed jobs`);

    const completedJobs = await this.getJobs(JobStatus.COMPLETED);
    logger.info(`Found ${completedJobs.length} completed jobs`);

    if (completedJobs.length > keepCount) {
      const jobsToRemove = completedJobs.slice(keepCount);
      logger.info(`Removing ${jobsToRemove.length} old completed jobs`);

      for (const jobToRemove of jobsToRemove) {
        const keys = await this.redis.keys(`job:${jobToRemove.id}`);
        if (keys.length > 0) {
          await this.redis.del(keys[0]);
          logger.info(`Deleted completed job: ${jobToRemove.id}`);
          break;
        }
      }

      return jobsToRemove.length;
    }

    logger.info('No completed jobs to cleanup');
    return 0;
  }

  async close(): Promise<void> {
    await this.pause();
    logger.info('Job queue closed');
  }

  private startProcessing(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processingInterval = setInterval(async () => {
      await this.processNextJob();
    }, 1000); // Check every second

    logger.info('Job processing started');
  }

  private async processJobs(): Promise<void> {
    try {
      // Process delayed jobs first
      await this.processDelayedJobs();

      // Process regular jobs
      await this.processRegularJobs();
    } catch (error) {
      logger.error('Error processing jobs', undefined, error as Error);
    }
  }

  private async processDelayedJobs(): Promise<void> {
    const now = Date.now();
    const delayedJobs = await this.redis.zrangebyscore('delayed_jobs', 0, now);

    for (const jobId of delayedJobs) {
      // Move from delayed to regular queue
      await this.redis.zrem('delayed_jobs', jobId);
      await this.redis.zadd('job_queue', JobPriority.NORMAL, jobId);
      logger.info(`Moved delayed job ${jobId} to regular queue`);
    }
  }

  private async processRegularJobs(): Promise<void> {
    // Get highest priority job
    const jobIds = await this.redis.zrevrange('job_queue', 0, 0);
    if (jobIds.length === 0) return;

    const jobId = jobIds[0];
    const job = await this.getJob(jobId);
    if (!job) {
      await this.redis.zrem('job_queue', jobId);
      return;
    }

    const processor = this.processors.get(job.name);
    if (!processor) {
      logger.warn(`No processor found for job ${job.name}`);
      await this.redis.zrem('job_queue', jobId);
      return;
    }

    // Remove from queue and mark as running
    await this.redis.zrem('job_queue', jobId);
    await this.updateJobStatus(jobId, JobStatus.RUNNING, { startedAt: new Date() });

    // Process job
    this.processJob(job, processor).catch(async (error) => {
      logger.error(`Job ${jobId} failed`, undefined, error as Error);
      await this.handleJobFailure(job, error);
    });
  }

  private async processJob(job: Job, processor: JobProcessor): Promise<void> {
    const startTime = Date.now();

    try {
      // Set timeout if specified
      let timeoutId: NodeJS.Timeout | null = null;
      if (job.options.timeout) {
        timeoutId = setTimeout(async () => {
          await this.handleJobTimeout(job);
        }, job.options.timeout);
      }

      // Process the job
      const result = await processor.process(job);

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Mark as completed
      await this.updateJobStatus(job.id, JobStatus.COMPLETED, {
        completedAt: new Date(),
        result: JSON.stringify(result),
        progress: 100,
      });

      const duration = Date.now() - startTime;
      logger.info(`Job ${job.id} completed in ${duration}ms`);

      // Cleanup old completed jobs
      await this.cleanupJobs(job, JobStatus.COMPLETED);
    } catch (error) {
      await this.handleJobFailure(job, error as Error);
    }
  }

  private async handleJobFailure(job: Job, error: Error): Promise<void> {
    const newAttempts = job.attempts + 1;

    if (newAttempts < job.maxAttempts) {
      // Retry job
      const backoffDelay = this.calculateBackoff(job.options.backoff!, newAttempts);

      await this.updateJobStatus(job.id, JobStatus.RETRYING, {
        attempts: newAttempts,
        error: error.message,
      });

      // Add back to delayed queue for retry
      await this.redis.zadd('delayed_jobs', Date.now() + backoffDelay, job.id);

      logger.info(
        `Job ${job.id} will retry in ${backoffDelay}ms (attempt ${newAttempts}/${job.maxAttempts})`
      );
    } else {
      // Max attempts reached, mark as failed
      await this.updateJobStatus(job.id, JobStatus.FAILED, {
        completedAt: new Date(),
        error: error.message,
        attempts: newAttempts,
      });

      logger.error(`Job ${job.id} failed after ${newAttempts} attempts`, undefined, error);

      // Cleanup old failed jobs
      await this.cleanupJobs(job, JobStatus.FAILED);
    }
  }

  private async handleJobTimeout(job: Job): Promise<void> {
    await this.updateJobStatus(job.id, JobStatus.FAILED, {
      completedAt: new Date(),
      error: 'Job timeout',
    });

    logger.error(`Job ${job.id} timed out after ${job.options.timeout}ms`);
  }

  private calculateBackoff(backoff: { type: string; delay: number }, attempts: number): number {
    if (backoff.type === 'exponential') {
      return backoff.delay * Math.pow(2, attempts - 1);
    }
    return backoff.delay;
  }

  private async updateJobStatus(
    jobId: string,
    status: JobStatus,
    updates: Partial<Job> = {}
  ): Promise<void> {
    const updateData: Record<string, string> = { status };

    if (updates.progress !== undefined) updateData.progress = updates.progress.toString();
    if (updates.startedAt) updateData.startedAt = updates.startedAt.toISOString();
    if (updates.completedAt) updateData.completedAt = updates.completedAt.toISOString();
    if (updates.attempts !== undefined) updateData.attempts = updates.attempts.toString();
    if (updates.error) updateData.error = updates.error;
    if (updates.result) updateData.result = updates.result;

    await this.redis.hset(`job:${jobId}`, updateData);
  }

  private async cleanupJobs(job: Job, status: JobStatus): Promise<void> {
    const isCompleted = status === JobStatus.COMPLETED;
    const keepCount = isCompleted
      ? (job.options.removeOnComplete ?? 0)
      : job.options.removeOnFail || 5;

    const logPrefix = isCompleted ? 'Cleaned completed job' : 'Cleaned failed job';

    // Special case: if removeOnComplete is explicitly set to -1, disable cleanup for completed jobs
    if (isCompleted && keepCount === -1) {
      return;
    }

    if (keepCount <= 0) return;

    const jobs = await this.getJobs(status);
    if (jobs.length > keepCount) {
      const jobsToRemove = jobs.slice(keepCount);

      for (const jobToRemove of jobsToRemove) {
        await this.redis.del(`job:${jobToRemove.id}`);
        logger.info(`${logPrefix}: ${jobToRemove.id}`);
      }
    }
  }

  private deserializeJob(jobData: Record<string, string>): Job {
    return {
      id: jobData.id,
      name: jobData.name,
      data: JSON.parse(jobData.data || '{}'),
      options: JSON.parse(jobData.options || '{}'),
      status: jobData.status as JobStatus,
      progress: parseInt(jobData.progress || '0'),
      result: jobData.result ? JSON.parse(jobData.result) : undefined,
      error: jobData.error,
      createdAt: new Date(jobData.createdAt),
      startedAt: jobData.startedAt ? new Date(jobData.startedAt) : undefined,
      completedAt: jobData.completedAt ? new Date(jobData.completedAt) : undefined,
      attempts: parseInt(jobData.attempts || '0'),
      maxAttempts: parseInt(jobData.maxAttempts || '3'),
    };
  }
}

export function createJobQueue(redis: Redis): JobQueue {
  const queue = new RedisJobQueue(redis);
  queue.resume(); // Start processing immediately
  return queue;
}
