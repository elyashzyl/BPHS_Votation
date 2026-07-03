import express from 'express'
import cors from 'cors'
import { getYear, saveYear, listYears, removeYear } from './db.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.get('/api/elections', async (req, res) => {
  try {
    const years = await listYears()
    res.json(years)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/elections/:year', async (req, res) => {
  try {
    const data = await getYear(req.params.year)
    res.json(data || null)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.put('/api/elections/:year', async (req, res) => {
  try {
    await saveYear(req.params.year, req.body)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/elections/:year', async (req, res) => {
  try {
    await removeYear(req.params.year)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SBO backend running on http://0.0.0.0:${PORT}`)
})
