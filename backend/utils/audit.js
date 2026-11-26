const SENSITIVE_KEYS = new Set(['password', 'password_hash', 'currentPassword', 'newPassword', 'token', 'jwt', 'secret']);

function sanitizeDetails(details) {
  if (!details || typeof details !== 'object') return {};
  const clean = {};
  for (const [key, value] of Object.entries(details)) {
    if (SENSITIVE_KEYS.has(key)) continue;
    clean[key] = value;
  }
  return clean;
}

export async function logAuditEvent(db, {
  actorId = null,
  actorEmail = null,
  action,
  entityType = null,
  entityId = null,
  details = {},
  ipAddress = null,
}) {
  if (!db?.query || !action) return;
  try {
    await db.query(
      `INSERT INTO audit_logs (actor_id, actor_email, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
      [
        actorId || null,
        actorEmail || null,
        String(action).slice(0, 120),
        entityType ? String(entityType).slice(0, 80) : null,
        entityId !== null && entityId !== undefined ? String(entityId).slice(0, 80) : null,
        JSON.stringify(sanitizeDetails(details)),
        ipAddress ? String(ipAddress).slice(0, 80) : null,
      ]
    );
  } catch (error) {
    console.warn('[audit] Impossible de journaliser l’événement:', error.message);
  }
}
