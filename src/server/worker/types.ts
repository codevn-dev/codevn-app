/**
 * Job types and interfaces for worker system
 */

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying',
}

export enum JobPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  URGENT = 20,
}

// Job name constants
export const JOB_NAMES = {
  SYSTEM_SEND_MESSAGE: 'system-send-message',
  SYSTEM_SEND_BATCH_MESSAGE: 'system-send-batch-message',
} as const;

export interface JobData {
  [key: string]: any;
}

export interface SystemSendMessageJobData {
  systemUserId: string;
  toUserId: string;
  text: string;
}

export interface SystemSendMessageJobData {
  systemUserId: string;
  toUserIds?: string[];
  text: string;
  isSendAll: boolean;
}

export interface SystemSendBatchMessageJobData {
  systemUserId: string;
  toUserIds: string[];
  text: string;
}

export interface JobOptions {
  priority?: JobPriority;
  delay?: number; // milliseconds
  attempts?: number; // max retry attempts
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  removeOnComplete?: number; // keep last N completed jobs
  removeOnFail?: number; // keep last N failed jobs
  timeout?: number; // job timeout in milliseconds
}

export interface Job<T = JobData> {
  id: string;
  name: string;
  data: T;
  options: JobOptions;
  status: JobStatus;
  progress: number; // 0-100
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
  maxAttempts: number;
}

export interface JobProcessor<T = JobData> {
  name: string;
  process: (job: Job<T>) => Promise<any>;
  concurrency?: number;
}

export interface JobQueue {
  name: string;
  add: (jobName: string, data: JobData, options?: JobOptions) => Promise<Job>;
  process: (processor: JobProcessor<any>) => void;
  close: () => Promise<void>;
  getJob: (jobId: string) => Promise<Job | null>;
  getJobs: (status?: JobStatus, start?: number, end?: number) => Promise<Job[]>;
  removeJob: (jobId: string) => Promise<boolean>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  isPaused: () => Promise<boolean>;
}

export interface WorkerManager {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  addProcessor: (processor: JobProcessor<any>) => void;
  removeProcessor: (name: string) => void;
  getStats: () => Promise<{
    active: number;
    waiting: number;
    completed: number;
    failed: number;
    delayed: number;
  }>;
}

export interface ScheduledJob {
  id: string;
  name: string;
  cron: string;
  data: JobData;
  options: JobOptions;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export interface JobScheduler {
  addScheduledJob: (job: Omit<ScheduledJob, 'id'>) => Promise<ScheduledJob>;
  removeScheduledJob: (id: string) => Promise<boolean>;
  updateScheduledJob: (id: string, updates: Partial<ScheduledJob>) => Promise<ScheduledJob>;
  getScheduledJobs: () => Promise<ScheduledJob[]>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}
