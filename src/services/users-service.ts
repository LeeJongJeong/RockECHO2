import { listUsers, getUserById } from '../repositories/users-repository'

export async function listAllUsers(db: D1Database) {
  const users = await listUsers(db)
  return { items: users.results }
}

export async function getUserDetail(db: D1Database, id: string) {
  return getUserById(db, id)
}
