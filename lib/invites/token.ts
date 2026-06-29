/**
 * 32-character URL-safe token generator for assessment invites.
 *
 * Uses crypto.randomUUID() for entropy. Tokens are single-use —
 * each invite gets a unique token. Never expose patient ID in the URL.
 */
export function generateInviteToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}