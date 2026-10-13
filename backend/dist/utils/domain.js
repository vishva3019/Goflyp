"use strict";
/**
 * Alliance University Email Domain Validator
 * Supports the primary domain (e.g. alliance.edu.in) and department subdomains (e.g. ced.alliance.edu.in).
 * Configurable via ALLIANCE_EMAIL_DOMAIN environment variable.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllianceEmailDomain = getAllianceEmailDomain;
exports.isValidAllianceEmail = isValidAllianceEmail;
function getAllianceEmailDomain() {
    return (process.env.ALLIANCE_EMAIL_DOMAIN || 'alliance.edu.in')
        .toLowerCase()
        .trim()
        .replace(/^@/, '');
}
function isValidAllianceEmail(email, configuredDomain) {
    if (!email || typeof email !== 'string')
        return false;
    const cleanEmail = email.toLowerCase().trim();
    const atIndex = cleanEmail.indexOf('@');
    if (atIndex === -1 || atIndex === 0 || atIndex === cleanEmail.length - 1) {
        return false;
    }
    const domainPart = cleanEmail.slice(atIndex + 1);
    const targetDomain = (configuredDomain || getAllianceEmailDomain()).toLowerCase().trim().replace(/^@/, '');
    // Exact match (e.g., user@alliance.edu.in)
    if (domainPart === targetDomain) {
        return true;
    }
    // Subdomain match (e.g., user@ced.alliance.edu.in or user@asob.alliance.edu.in)
    if (domainPart.endsWith(`.${targetDomain}`)) {
        return true;
    }
    return false;
}
