// Minimal auth helpers for dev: login stores token and role in localStorage
export type Role = 'citizen' | 'technical_office_staff' | 'municipal_public_relations_officer' | 'municipal_administrator' | 'external_maintainer' | null;

export function setToken(token: string) {
  localStorage.setItem('token', token);
}

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setRole(role: Role[]) {
  if (role) localStorage.setItem('role', JSON.stringify(role));
  else localStorage.removeItem('role');
}

export function getRole(): Role[] | null {
  try{
    const roleStr = localStorage.getItem('role');
    return roleStr ? (JSON.parse(roleStr) as Role[]) : null;
  } catch {
    localStorage.removeItem('token');
    return null;
  }
}

export function setPicture(picture: string) {
  if (picture) localStorage.setItem('picture', picture);
  else localStorage.removeItem('picture');
}

export function clearPicture() {
  localStorage.removeItem('picture');
}

export function getPicture(): string | null {
  return localStorage.getItem('picture');
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  // notify listeners; navigation handled by caller if desired
  globalThis.dispatchEvent(new Event('authChange'));
}

// Try to decode a JWT and extract the payload. Returns null if not a JWT or invalid.
export function decodeJwt(token: string | null): any {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1];
    // atob with URL-safe base64
    const b64 = payload.replaceAll('_', '+').replaceAll('_', '/');
    const json = decodeURIComponent(
      atob(b64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.codePointAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(json);
  } catch (e) {
    console.error('Failed to decode JWT:', e);
    return null;
  }
}

export function getRoleFromToken(token: string | null): Role[] | null {
  const result: Role[] = [];
  const data = decodeJwt(token);
  if (!data) return null;

  if (data.type && Array.isArray(data.type)) {
    const allowedRoles = new Set([
      'technical_office_staff',
      'municipal_public_relations_officer',
      'municipal_administrator',
      'external_maintainer',
    ]);

    data.type.forEach(typeStr => {
      if (allowedRoles.has(typeStr)) {
        result.push(typeStr as Role);
      }
    });
  }

  if (typeof data.scope === 'string') {
    if (data.scope.includes('technical_office_staff')) result.push('technical_office_staff' as Role);
    if (data.scope.includes('municipal_public_relations_officer')) result.push('municipal_public_relations_officer' as Role);
    if (data.scope.includes('municipal_administrator')) result.push('municipal_administrator' as Role);
    if (data.scope.includes('external_maintainer')) result.push('external_maintainer' as Role);

  }

  return result.length > 0 ? result : null;
}

export interface DecodedUser {
  username?: string;
  sub?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  email?: string;
}

export function getUserFromToken(token: string | null): DecodedUser | null {
  const data = decodeJwt(token);
  if (!data) return null;
  const user: DecodedUser = {};
  if (data.username) user.username = data.username;
  if (data.sub) user.sub = data.sub;
  if (data.given_name) user.given_name = data.given_name;
  if (data.family_name) user.family_name = data.family_name;
  if (data.name) user.name = data.name;
  if (data.email) user.email = data.email;
  return user;
}

export function getOfficerIdFromToken(token: string | null): string | null {
  const data = decodeJwt(token);
  if (!data) return null;
  if (data.id) return data.id;
  return null;
}

export function getUserIdFromToken(token: string | null): number | null {
  const data = decodeJwt(token);
  if (!data) return null;
  // Try common claim names for user ID
  if (data.userId) return Number(data.userId);
  if (data.id) return Number(data.id);
  if (data.sub && !Number.isNaN(Number(data.sub))) return Number(data.sub);
  return null;
}
