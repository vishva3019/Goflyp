/**
 * University Email Domain Utility (Frontend)
 * Derives allowed university domain from EXPO_PUBLIC_ALLIANCE_EMAIL_DOMAIN or defaults to alliance.edu.in.
 * Supports primary domain (alliance.edu.in) and department subdomains (e.g. ced.alliance.edu.in).
 */

export const ALLIANCE_DEFAULT_DOMAIN =
  process.env.EXPO_PUBLIC_ALLIANCE_EMAIL_DOMAIN || 'alliance.edu.in';

export function getAllianceEmailDomain(): string {
  return ALLIANCE_DEFAULT_DOMAIN.toLowerCase().trim().replace(/^@/, '');
}

export function isValidAllianceEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.toLowerCase().trim();
  const atIndex = clean.indexOf('@');
  if (atIndex === -1 || atIndex === 0 || atIndex === clean.length - 1) {
    return false;
  }

  const domainPart = clean.slice(atIndex + 1);
  const targetDomain = getAllianceEmailDomain();

  return domainPart === targetDomain || domainPart.endsWith(`.${targetDomain}`);
}
