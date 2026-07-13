/**
 * Utility to normalize email addresses across the application.
 * This ensures consistency when querying, storing, or comparing emails.
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}
