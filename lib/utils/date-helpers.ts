import {
  format,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  differenceInDays,
  addDays,
  subDays,
  isMonday,
  parseISO,
  isSameDay,
} from "date-fns";

/**
 * Get the start of the week (Monday) for a given date
 */
export function getWeekStart(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 }); // 1 = Monday
}

/**
 * Get the end of the week (Sunday) for a given date
 */
export function getWeekEnd(date: Date = new Date()): Date {
  return endOfWeek(date, { weekStartsOn: 1 });
}

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Format a timestamp for display
 */
export function formatTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === "string" ? parseISO(timestamp) : timestamp;
  return format(date, "MMM d, yyyy 'at' h:mm a");
}

/**
 * Get the start of today
 */
export function getTodayStart(): Date {
  return startOfDay(new Date());
}

/**
 * Get the end of today
 */
export function getTodayEnd(): Date {
  return endOfDay(new Date());
}

/**
 * Get yesterday's date
 */
export function getYesterday(): Date {
  return subDays(new Date(), 1);
}

/**
 * Check if a given date is today
 */
export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return isSameDay(dateObj, new Date());
}

/**
 * Check if today is Monday
 */
export function isTodayMonday(): boolean {
  return isMonday(new Date());
}

/**
 * Get the number of days since a given date
 */
export function getDaysSince(date: Date | string): number {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return differenceInDays(new Date(), dateObj);
}

/**
 * Get the start date of the current week (Monday)
 */
export function getCurrentWeekStart(): string {
  return formatDate(getWeekStart());
}

/**
 * Get the start date of the previous week (Monday)
 */
export function getPreviousWeekStart(): string {
  const lastWeek = subDays(new Date(), 7);
  return formatDate(getWeekStart(lastWeek));
}

/**
 * Get an array of dates for the current week
 */
export function getCurrentWeekDates(): Date[] {
  const weekStart = getWeekStart();
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/**
 * Get an array of dates for a specific week
 */
export function getWeekDates(weekStartDate: Date | string): Date[] {
  const start = typeof weekStartDate === "string" ? parseISO(weekStartDate) : weekStartDate;
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * Check if a date is in the current week
 */
export function isInCurrentWeek(date: Date | string): boolean {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();
  return dateObj >= weekStart && dateObj <= weekEnd;
}

/**
 * Get a formatted date range string (e.g., "Jan 1 - Jan 7, 2024")
 */
export function formatWeekRange(weekStartDate: Date | string): string {
  const start = typeof weekStartDate === "string" ? parseISO(weekStartDate) : weekStartDate;
  const end = endOfWeek(start, { weekStartsOn: 1 });
  
  const startMonth = format(start, "MMM d");
  const endFormatted = format(end, "MMM d, yyyy");
  
  return `${startMonth} - ${endFormatted}`;
}

