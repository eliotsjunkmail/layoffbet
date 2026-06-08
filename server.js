import express from 'express'
import cors from 'cors'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// Data file
const DATA_FILE = path.join(__dirname, 'data.json')

// Default data structure
const DEFAULT_DATA = {
  users: [
    {
      id: 'user-admin',
      username: 'admin',
      password: 'admin123',
      coins: 100,
      isAdmin: true,
      createdAt: new Date().toISOString(),
      lastCoinsDate: new Date().toISOString().split('T')[0],
      anonymousNumber: 100000,
      displayName: 'Admin'
    }
  ],
  events: [],
  bets: [],
  comments: [],
  companies: [],
  favorites: {},
  pinnedEvents: {},
  feedback: [],
  anonVotedEvents: {},
}

// Initialize data file if it doesn't exist
const initData = async () => {
  try {
    await fs.stat(DATA_FILE)
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2))
  }
}

// Read all data
const readData = async () => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return { ...DEFAULT_DATA }
  }
}

// Write all data
const writeData = async (data) => {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2))
}

// API Routes

// ===== INIT =====
app.post('/api/init', async (req, res) => {
  const data = await readData()
  // Only init if empty
  if (data.users.length === 0) {
    const { users, events, bets, comments, companies, favorites, pinnedEvents, feedback, anonVotedEvents } = req.body
    const newData = {
      users: users || [],
      events: events || [],
      bets: bets || [],
      comments: comments || [],
      companies: companies || [],
      favorites: favorites || {},
      pinnedEvents: pinnedEvents || {},
      feedback: feedback || [],
      anonVotedEvents: anonVotedEvents || {},
    }
    await writeData(newData)
    return res.json({ ok: true, initialized: true })
  }
  res.json({ ok: true, initialized: false })
})

// ===== RESET =====
app.post('/api/reset', async (req, res) => {
  const { users, events, bets, comments, companies, favorites, pinnedEvents, feedback, anonVotedEvents } = req.body
  // Reset to seed data - remove all non-admin users and their data
  const adminIds = users.filter(u => u.isAdmin).map(u => u.id)
  const seedUsers = users.filter(u => u.isAdmin)
  const seedEvents = events.filter(e => adminIds.includes(e.creatorId))

  const newData = {
    users: seedUsers,
    events: seedEvents,
    bets: [],
    comments: comments.filter(c => adminIds.includes(c.userId)),
    companies: companies,
    favorites: {},
    pinnedEvents: {},
    feedback: [],
    anonVotedEvents: {},
  }
  await writeData(newData)
  res.json({ ok: true, reset: true })
})

// ===== USERS =====
app.post('/api/users/register', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' })

  const data = await readData()
  if (data.users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'User exists' })
  }

  const maxAnonNum = Math.max(...data.users.map(u => u.anonymousNumber ?? 0), 100000)
  const user = {
    id: 'user-' + crypto.randomBytes(8).toString('hex'),
    username,
    password,
    coins: 100,
    isAdmin: false,
    createdAt: new Date().toISOString(),
    lastCoinsDate: new Date().toISOString().split('T')[0],
    anonymousNumber: maxAnonNum + 1,
    displayName: `Anon${maxAnonNum + 1}`,
  }
  data.users.push(user)
  await writeData(data)
  res.json(user)
})

app.get('/api/users', async (req, res) => {
  const data = await readData()
  res.json(data.users)
})

app.post('/api/users/login', async (req, res) => {
  const { username, password } = req.body
  const data = await readData()
  const user = data.users.find(u => u.username === username && u.password === password)
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  res.json(user)
})

app.put('/api/users/:id', async (req, res) => {
  const data = await readData()
  const user = data.users.find(u => u.id === req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  Object.assign(user, req.body)
  await writeData(data)
  res.json(user)
})

app.delete('/api/users/:id', async (req, res) => {
  const data = await readData()
  const idx = data.users.findIndex(u => u.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'User not found' })
  data.users.splice(idx, 1)
  data.comments = data.comments.filter(c => c.userId !== req.params.id)
  data.bets = data.bets.filter(b => b.userId !== req.params.id)
  await writeData(data)
  res.json({ ok: true })
})

// ===== EVENTS =====
app.get('/api/events', async (req, res) => {
  const data = await readData()
  res.json(data.events)
})

app.post('/api/events', async (req, res) => {
  const data = await readData()
  const event = { id: 'evt-' + crypto.randomBytes(8).toString('hex'), ...req.body }
  data.events.push(event)
  await writeData(data)
  res.json(event)
})

app.put('/api/events/:id', async (req, res) => {
  const data = await readData()
  const event = data.events.find(e => e.id === req.params.id)
  if (!event) return res.status(404).json({ error: 'Event not found' })
  Object.assign(event, req.body)
  await writeData(data)
  res.json(event)
})

app.delete('/api/events/:id', async (req, res) => {
  const data = await readData()
  const idx = data.events.findIndex(e => e.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Event not found' })
  data.events.splice(idx, 1)
  data.comments = data.comments.filter(c => c.eventId !== req.params.id)
  data.bets = data.bets.filter(b => b.eventId !== req.params.id)
  await writeData(data)
  res.json({ ok: true })
})

// ===== BETS =====
app.get('/api/bets', async (req, res) => {
  const data = await readData()
  res.json(data.bets)
})

app.post('/api/bets', async (req, res) => {
  const data = await readData()
  const bet = { id: 'bet-' + crypto.randomBytes(8).toString('hex'), ...req.body, createdAt: new Date().toISOString() }
  data.bets.push(bet)
  await writeData(data)
  res.json(bet)
})

app.delete('/api/bets/:id', async (req, res) => {
  const data = await readData()
  const idx = data.bets.findIndex(b => b.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Bet not found' })
  data.bets.splice(idx, 1)
  await writeData(data)
  res.json({ ok: true })
})

// ===== COMMENTS =====
app.get('/api/comments', async (req, res) => {
  const data = await readData()
  res.json(data.comments)
})

app.post('/api/comments', async (req, res) => {
  const { id, eventId, companyId, userId, content, createdAt, displayName } = req.body
  if (!id || !content || !userId || !createdAt) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const data = await readData()
  const comment = { id, eventId, companyId, userId, content, createdAt, displayName, upvotes: 0 }
  data.comments.push(comment)
  await writeData(data)
  res.json(comment)
})

app.put('/api/comments/:id', async (req, res) => {
  const { id } = req.params
  const { content, editedAt } = req.body

  const data = await readData()
  const comment = data.comments.find(c => c.id === id)
  if (!comment) return res.status(404).json({ error: 'Comment not found' })

  comment.content = content
  comment.editedAt = editedAt
  await writeData(data)
  res.json(comment)
})

app.delete('/api/comments/:id', async (req, res) => {
  const { id } = req.params
  const data = await readData()
  const idx = data.comments.findIndex(c => c.id === id)
  if (idx === -1) return res.status(404).json({ error: 'Comment not found' })
  data.comments.splice(idx, 1)
  await writeData(data)
  res.json({ ok: true })
})

app.post('/api/comments/:id/upvote', async (req, res) => {
  const { id } = req.params
  const data = await readData()
  const comment = data.comments.find(c => c.id === id)
  if (!comment) return res.status(404).json({ error: 'Comment not found' })
  comment.upvotes = (comment.upvotes ?? 0) + 1
  await writeData(data)
  res.json(comment)
})

// ===== COMPANIES =====
app.get('/api/companies', async (req, res) => {
  const data = await readData()
  res.json(data.companies)
})

app.post('/api/companies', async (req, res) => {
  const data = await readData()
  const company = { id: 'comp-' + crypto.randomBytes(8).toString('hex'), ...req.body, createdAt: new Date().toISOString() }
  data.companies.push(company)
  await writeData(data)
  res.json(company)
})

app.put('/api/companies/:id', async (req, res) => {
  const data = await readData()
  const company = data.companies.find(c => c.id === req.params.id)
  if (!company) return res.status(404).json({ error: 'Company not found' })
  Object.assign(company, req.body)
  await writeData(data)
  res.json(company)
})

app.delete('/api/companies/:id', async (req, res) => {
  const data = await readData()
  const idx = data.companies.findIndex(c => c.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Company not found' })
  data.companies.splice(idx, 1)
  await writeData(data)
  res.json({ ok: true })
})

// ===== STATE SYNC =====
app.get('/api/sync', async (req, res) => {
  const data = await readData()
  res.json({
    users: data.users,
    events: data.events,
    bets: data.bets,
    comments: data.comments,
    companies: data.companies,
    favorites: data.favorites || {},
    pinnedEvents: data.pinnedEvents || {},
    feedback: data.feedback || [],
    anonVotedEvents: data.anonVotedEvents || {},
  })
})

app.post('/api/favorites/:userId/:companyId', async (req, res) => {
  const data = await readData()
  if (!data.favorites) data.favorites = {}
  if (!data.favorites[req.params.userId]) data.favorites[req.params.userId] = []
  if (!data.favorites[req.params.userId].includes(req.params.companyId)) {
    data.favorites[req.params.userId].push(req.params.companyId)
  }
  await writeData(data)
  res.json({ ok: true })
})

app.delete('/api/favorites/:userId/:companyId', async (req, res) => {
  const data = await readData()
  if (data.favorites && data.favorites[req.params.userId]) {
    data.favorites[req.params.userId] = data.favorites[req.params.userId].filter(id => id !== req.params.companyId)
  }
  await writeData(data)
  res.json({ ok: true })
})

// Serve static frontend
app.use(express.static(path.join(__dirname, 'dist')))

// Fallback to index.html for SPA
app.get(/^(?!\/api\/).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

// Error handling
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

// Start server
const PORT = process.env.PORT || 3000
initData().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}).catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
