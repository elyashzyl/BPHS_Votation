import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, 'data', 'elections.db')

let _db = null

async function getDb() {
  if (_db) return _db
  const SQL = await initSqlJs()
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH)
    _db = new SQL.Database(buf)
  } else {
    _db = new SQL.Database()
  }
  _db.run('CREATE TABLE IF NOT EXISTS elections (year TEXT PRIMARY KEY, data TEXT NOT NULL)')
  return _db
}

function persist() {
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(DB_PATH, Buffer.from(_db.export()))
}

export async function getYear(year) {
  const db = await getDb()
  const stmt = db.prepare('SELECT data FROM elections WHERE year = ?')
  stmt.bind([year])
  if (stmt.step()) {
    const row = stmt.getAsObject()
    stmt.free()
    return JSON.parse(row.data)
  }
  stmt.free()
  return null
}

export async function saveYear(year, data) {
  const db = await getDb()
  db.run('INSERT OR REPLACE INTO elections (year, data) VALUES (?, ?)', [year, JSON.stringify(data)])
  persist()
}

export async function listYears() {
  const db = await getDb()
  const stmt = db.prepare('SELECT year FROM elections ORDER BY year ASC')
  const years = []
  while (stmt.step()) years.push(stmt.getAsObject().year)
  stmt.free()
  return years
}

export async function removeYear(year) {
  const db = await getDb()
  db.run('DELETE FROM elections WHERE year = ?', [year])
  persist()
}
