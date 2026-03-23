export async function listUsers(db: D1Database) {
  return db.prepare('SELECT * FROM users ORDER BY role, name').all()
}

export async function getUserById(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first()
}
