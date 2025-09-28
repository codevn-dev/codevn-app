/**
 * Job Scheduler
 * Handles cron-based job scheduling
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/utils/logger';
import { JobQueue, JobScheduler, ScheduledJob } from './types';

interface CronExpression {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

export class DefaultJobScheduler implements JobScheduler {
  private scheduledJobs: Map<string, ScheduledJob> = new Map();
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(private jobQueue: JobQueue) {}

  async addScheduledJob(job: Omit<ScheduledJob, 'id'>): Promise<ScheduledJob> {
    const scheduledJob: ScheduledJob = {
      id: uuidv4(),
      ...job,
      nextRun: this.calculateNextRun(job.cron),
    };

    this.scheduledJobs.set(scheduledJob.id, scheduledJob);
    logger.info(`Added scheduled job: ${scheduledJob.name} (${scheduledJob.cron})`);

    return scheduledJob;
  }

  async removeScheduledJob(id: string): Promise<boolean> {
    const removed = this.scheduledJobs.delete(id);
    if (removed) {
      logger.info(`Removed scheduled job: ${id}`);
    }
    return removed;
  }

  async updateScheduledJob(id: string, updates: Partial<ScheduledJob>): Promise<ScheduledJob> {
    const job = this.scheduledJobs.get(id);
    if (!job) {
      throw new Error(`Scheduled job not found: ${id}`);
    }

    const updatedJob = { ...job, ...updates };

    // Recalculate next run if cron expression changed
    if (updates.cron) {
      updatedJob.nextRun = this.calculateNextRun(updates.cron);
    }

    this.scheduledJobs.set(id, updatedJob);
    logger.info(`Updated scheduled job: ${id}`);

    return updatedJob;
  }

  async getScheduledJobs(): Promise<ScheduledJob[]> {
    return Array.from(this.scheduledJobs.values());
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Job scheduler is already running');
      return;
    }

    this.isRunning = true;

    // Check every minute for jobs to run
    this.interval = setInterval(() => {
      this.checkAndRunJobs().catch((error) => {
        logger.error('Error checking scheduled jobs', undefined, error as Error);
      });
    }, 60000); // Check every minute

    logger.info('Job scheduler started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Job scheduler is not running');
      return;
    }

    this.isRunning = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    logger.info('Job scheduler stopped');
  }

  private async checkAndRunJobs(): Promise<void> {
    const now = new Date();

    for (const [_, job] of this.scheduledJobs) {
      if (!job.enabled || !job.nextRun) continue;

      if (now >= job.nextRun) {
        try {
          // Add job to queue
          await this.jobQueue.enqueue(job.name, job.data, job.options);

          // Update last run and calculate next run
          job.lastRun = now;
          job.nextRun = this.calculateNextRun(job.cron);

          logger.info(`Scheduled job executed: ${job.name}`);
        } catch (error) {
          logger.error(`Failed to execute scheduled job: ${job.name}`, undefined, error as Error);
        }
      }
    }
  }

  private calculateNextRun(cronExpression: string): Date {
    const cron = this.parseCronExpression(cronExpression);
    const now = new Date();

    // Simple cron parser - handles basic patterns
    // For production, consider using a library like 'node-cron'
    const nextRun = new Date(now);
    nextRun.setSeconds(0);
    nextRun.setMilliseconds(0);

    // Handle minute
    if (cron.minute !== '*') {
      const minute = parseInt(cron.minute);
      if (minute > nextRun.getMinutes()) {
        nextRun.setMinutes(minute);
      } else {
        nextRun.setMinutes(minute);
        nextRun.setHours(nextRun.getHours() + 1);
      }
    } else {
      nextRun.setMinutes(nextRun.getMinutes() + 1);
    }

    // Handle hour
    if (cron.hour !== '*') {
      const hour = parseInt(cron.hour);
      if (hour > nextRun.getHours()) {
        nextRun.setHours(hour);
        nextRun.setMinutes(0);
      } else if (hour < nextRun.getHours()) {
        nextRun.setHours(hour);
        nextRun.setMinutes(0);
        nextRun.setDate(nextRun.getDate() + 1);
      }
    }

    // Handle day of month
    if (cron.dayOfMonth !== '*') {
      const day = parseInt(cron.dayOfMonth);
      if (day > nextRun.getDate()) {
        nextRun.setDate(day);
        nextRun.setHours(0);
        nextRun.setMinutes(0);
      } else if (day < nextRun.getDate()) {
        nextRun.setMonth(nextRun.getMonth() + 1);
        nextRun.setDate(day);
        nextRun.setHours(0);
        nextRun.setMinutes(0);
      }
    }

    // Handle month
    if (cron.month !== '*') {
      const month = parseInt(cron.month) - 1; // JavaScript months are 0-based
      if (month > nextRun.getMonth()) {
        nextRun.setMonth(month);
        nextRun.setDate(1);
        nextRun.setHours(0);
        nextRun.setMinutes(0);
      } else if (month < nextRun.getMonth()) {
        nextRun.setFullYear(nextRun.getFullYear() + 1);
        nextRun.setMonth(month);
        nextRun.setDate(1);
        nextRun.setHours(0);
        nextRun.setMinutes(0);
      }
    }

    // Handle day of week
    if (cron.dayOfWeek !== '*') {
      const dayOfWeek = parseInt(cron.dayOfWeek);
      const currentDayOfWeek = nextRun.getDay();

      if (dayOfWeek > currentDayOfWeek) {
        const daysToAdd = dayOfWeek - currentDayOfWeek;
        nextRun.setDate(nextRun.getDate() + daysToAdd);
        nextRun.setHours(0);
        nextRun.setMinutes(0);
      } else if (dayOfWeek < currentDayOfWeek) {
        const daysToAdd = 7 - currentDayOfWeek + dayOfWeek;
        nextRun.setDate(nextRun.getDate() + daysToAdd);
        nextRun.setHours(0);
        nextRun.setMinutes(0);
      }
    }

    return nextRun;
  }

  private parseCronExpression(cron: string): CronExpression {
    const parts = cron.trim().split(/\s+/);

    if (parts.length !== 5) {
      throw new Error(
        `Invalid cron expression: ${cron}. Expected format: "minute hour day month dayOfWeek"`
      );
    }

    return {
      minute: parts[0],
      hour: parts[1],
      dayOfMonth: parts[2],
      month: parts[3],
      dayOfWeek: parts[4],
    };
  }
}

export function createJobScheduler(jobQueue: JobQueue): JobScheduler {
  return new DefaultJobScheduler(jobQueue);
}
