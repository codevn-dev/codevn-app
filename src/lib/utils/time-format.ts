/**
 * Common time formatting utilities
 */

/**
 * Format a timestamp to relative time (e.g., "Just now" for < 5s, then date time)
 */
export function formatRelativeTime(timestamp: number | string | Date): string {
  // Use a more stable approach to avoid hydration mismatch
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  // Only show "Just now" for messages less than 5 seconds old
  if (diffSec < 5) return 'Just now';

  // For everything else, show date time
  return formatDateTime(timestamp);
}

/**
 * Format a timestamp to time string (e.g., "14:30", "02:15")
 */
export function formatTime(timestamp: number | string | Date): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a timestamp to full datetime string (e.g., "Dec 15, 2023 14:30")
 */
export function formatDateTime(timestamp: number | string | Date): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a timestamp to smart display (relative time for recent, date for older)
 */
export function formatSmartTime(timestamp: number | string | Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Show relative time for last 7 days
  if (diffDays < 7) {
    return formatRelativeTime(timestamp);
  }

  // Show date for older messages
  return formatDate(timestamp);
}

/**
 * Format timestamp for chat messages (like Telegram)
 * - "Just now" for < 5s
 * - Time only for all messages (date shown in separators)
 */
export function formatChatTime(timestamp: number | string | Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  // Show "Just now" for messages less than 5 seconds old
  if (diffSec < 5) return 'Just now';

  // Show time only (date is shown in separators)
  return formatTime(timestamp);
}

/**
 * Check if timestamp is start of a new day (for chat date separators)
 */
export function isNewDay(
  timestamp: number | string | Date,
  previousTimestamp?: number | string | Date
): boolean {
  if (!previousTimestamp) return true;

  const date = new Date(timestamp);
  const prevDate = new Date(previousTimestamp);

  return date.toDateString() !== prevDate.toDateString();
}

/**
 * Format date with smart relative display (Today, Yesterday, Weekday, or Date)
 */
export function formatDate(timestamp: number | string | Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Today
  if (diffDays === 0) return 'Today';

  // Yesterday
  if (diffDays === 1) return 'Yesterday';

  // This week
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  // Older dates
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
