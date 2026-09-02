import crypto from 'crypto';

const sessions = new Map();
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function createSession(account) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    role: account.role,
    loginId: account.loginId,
    staffId: account.staffId || null,
    studentId: account.studentId || null,
    createdAt: Date.now(),
  });
  return token;
}

export function getSession(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(token);
    return null;
  }
  return session;
}

export function destroySession(token) {
  if (token) sessions.delete(token);
}

export function readToken(req) {
  const auth = req.header('Authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return String(req.header('X-Session-Token') || '').trim();
}
