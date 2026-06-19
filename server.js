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
      username: 'eliot',
      password: 'Eliot123',
      coins: 999,
      isAdmin: true,
      createdAt: new Date().toISOString(),
      lastCoinsDate: new Date().toISOString().split('T')[0],
      anonymousNumber: 100000,
      displayName: 'Eliot'
    }
  ],
  events: [],
  bets: [],
  comments: [],
  chatMessages: [],
  companies: [],
  favorites: {},
  userChatNames: {},
  pinnedEvents: {},
  feedback: [],
  anonVotedEvents: {},
  hiddenCompanyIds: [],
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
    const { users, events, bets, comments, chatMessages, companies, favorites, pinnedEvents, feedback, anonVotedEvents, hiddenCompanyIds } = req.body
    const newData = {
      users: users || [],
      events: events || [],
      bets: bets || [],
      comments: comments || [],
      chatMessages: chatMessages || [],
      companies: companies || [],
      favorites: favorites || {},
      pinnedEvents: pinnedEvents || {},
      feedback: feedback || [],
      anonVotedEvents: anonVotedEvents || {},
      hiddenCompanyIds: hiddenCompanyIds || [],
    }
    await writeData(newData)
    return res.json({ ok: true, initialized: true })
  }
  res.json({ ok: true, initialized: false })
})

// ===== RESET =====
app.post('/api/reset', async (req, res) => {
  const { users, events, bets, comments, chatMessages, companies, favorites, pinnedEvents, feedback, anonVotedEvents, hiddenCompanyIds } = req.body
  // Reset to seed data - remove all non-admin users and their data
  const adminIds = users.filter(u => u.isAdmin).map(u => u.id)
  const seedUsers = users.filter(u => u.isAdmin)
  const seedEvents = events.filter(e => adminIds.includes(e.creatorId))

  const newData = {
    users: seedUsers,
    events: seedEvents,
    bets: [],
    comments: comments.filter(c => adminIds.includes(c.userId)),
    chatMessages: [],
    companies: companies,
    favorites: {},
    pinnedEvents: {},
    feedback: [],
    anonVotedEvents: {},
    hiddenCompanyIds: [],
  }
  await writeData(newData)
  res.json({ ok: true, reset: true })
})

// ===== USERS =====
app.post('/api/users/register', async (req, res) => {
  const { username, password, anonUserId } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' })

  const data = await readData()
  if (data.users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'User exists' })
  }

  let user
  let anonUser = null

  // Check if registering from anonymous user
  if (anonUserId) {
    anonUser = data.users.find(u => u.id === anonUserId && u.isAnonymous)
  }

  if (anonUser && anonUser.username === username) {
    // Same username - just convert anonymous user to normal user
    anonUser.password = password
    anonUser.isAnonymous = false
    user = anonUser
  } else {
    // Different username or no anonymous user - create new user
    const maxAnonNum = Math.max(...data.users.map(u => u.anonymousNumber ?? 0), 100000)
    user = {
      id: 'user-' + crypto.randomBytes(8).toString('hex'),
      username,
      password,
      coins: anonUser ? anonUser.coins : 100,
      isAdmin: false,
      createdAt: anonUser ? anonUser.createdAt : new Date().toISOString(),
      lastCoinsDate: new Date().toISOString().split('T')[0],
      anonymousNumber: maxAnonNum + 1,
      displayName: username,
    }
    data.users.push(user)

    // If registering with different username, migrate data from anonymous user
    if (anonUser) {
      // Migrate bets
      data.bets = data.bets.map(b => b.userId === anonUser.id ? { ...b, userId: user.id } : b)

      // Migrate favorites
      if (data.favorites[anonUser.id]) {
        data.favorites[user.id] = data.favorites[anonUser.id]
        delete data.favorites[anonUser.id]
      }

      // Migrate pinned events
      if (data.pinnedEvents[anonUser.id]) {
        data.pinnedEvents[user.id] = data.pinnedEvents[anonUser.id]
        delete data.pinnedEvents[anonUser.id]
      }

      // Mark anonymous user as inactive/migrated
      anonUser.migrated = true
      anonUser.migratedToUserId = user.id
    }
  }

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

  // Reset admin coins to 999 on every login
  if (user.isAdmin) {
    user.coins = 999
    await writeData(data)
  }

  res.json(user)
})

app.get('/api/next-anon-id', async (req, res) => {
  const data = await readData()
  const maxAnonNum = Math.max(...data.users.map(u => u.anonymousNumber ?? 0), 0)
  const nextNum = maxAnonNum + 1
  const username = `Anon${String(nextNum).padStart(7, '0')}`
  res.json({ username, nextNumber: nextNum })
})

app.post('/api/users/anonymous', async (req, res) => {
  const { anonUserId } = req.body
  const data = await readData()

  // If anonUserId provided, try to get existing user
  if (anonUserId) {
    const existing = data.users.find(u => u.id === anonUserId)
    if (existing) {
      return res.json(existing)
    }
  }

  // Create new anonymous user
  const maxAnonNum = Math.max(...data.users.map(u => u.anonymousNumber ?? 0), 0)
  const nextNum = maxAnonNum + 1
  const anonUsername = `Anon${String(nextNum).padStart(7, '0')}`
  const user = {
    id: 'anon-' + crypto.randomBytes(8).toString('hex'),
    username: anonUsername,
    password: null,
    coins: 50,
    isAdmin: false,
    isAnonymous: true,
    createdAt: new Date().toISOString(),
    lastCoinsDate: new Date().toISOString().split('T')[0],
    anonymousNumber: nextNum,
    displayName: anonUsername,
  }
  data.users.push(user)
  await writeData(data)
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

app.post('/api/users/:id/coins', async (req, res) => {
  const data = await readData()
  const user = data.users.find(u => u.id === req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  user.coins = (user.coins || 0) + 1
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

app.put('/api/bets/:id', async (req, res) => {
  const data = await readData()
  const bet = data.bets.find(b => b.id === req.params.id)
  if (!bet) return res.status(404).json({ error: 'Bet not found' })
  Object.assign(bet, req.body)
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

// ===== CHAT MESSAGES =====
app.get('/api/companies/:companyId/chat', async (req, res) => {
  const data = await readData()
  const messages = data.chatMessages.filter(m => m.companyId === req.params.companyId)
  res.json(messages)
})

app.post('/api/companies/:companyId/chat', async (req, res) => {
  const data = await readData()
  const message = {
    id: 'msg-' + crypto.randomBytes(8).toString('hex'),
    companyId: req.params.companyId,
    ...req.body,
    createdAt: new Date().toISOString(),
  }
  if (!data.chatMessages) data.chatMessages = []
  data.chatMessages.push(message)
  await writeData(data)
  res.json(message)
})

app.delete('/api/companies/:companyId/chat/:messageId', async (req, res) => {
  const data = await readData()
  const idx = data.chatMessages.findIndex(m => m.id === req.params.messageId && m.companyId === req.params.companyId)
  if (idx === -1) return res.status(404).json({ error: 'Message not found' })
  data.chatMessages.splice(idx, 1)
  await writeData(data)
  res.json({ ok: true })
})

app.delete('/api/companies/:companyId/chat', async (req, res) => {
  const data = await readData()
  data.chatMessages = data.chatMessages.filter(m => m.companyId !== req.params.companyId)
  // Also clear chat names for this company
  if (data.userChatNames && data.userChatNames[req.params.companyId]) {
    delete data.userChatNames[req.params.companyId]
  }
  await writeData(data)
  res.json({ ok: true })
})

app.put('/api/companies/:companyId/chat/:messageId/reactions', async (req, res) => {
  const data = await readData()
  const message = data.chatMessages.find(m => m.id === req.params.messageId && m.companyId === req.params.companyId)
  if (!message) return res.status(404).json({ error: 'Message not found' })
  message.reactions = req.body.reactions
  await writeData(data)
  res.json(message)
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

app.post('/api/companies/:id/toggle-hidden', async (req, res) => {
  const data = await readData()
  if (!data.hiddenCompanyIds) data.hiddenCompanyIds = []
  const isHidden = data.hiddenCompanyIds.includes(req.params.id)
  if (isHidden) {
    data.hiddenCompanyIds = data.hiddenCompanyIds.filter(id => id !== req.params.id)
  } else {
    data.hiddenCompanyIds.push(req.params.id)
  }
  await writeData(data)
  res.json({ ok: true, hidden: !isHidden })
})

// Generate next available chat name (A, B, ..., Z, A1, B1, ..., Z1, A2, etc.)
const generateNextChatName = (count) => {
  if (count < 26) {
    return String.fromCharCode(65 + count) // A-Z
  }
  const remainder = (count - 26) % 26
  const cycle = Math.floor((count - 26) / 26) + 1
  return String.fromCharCode(65 + remainder) + cycle
}

// Get or assign chat name for a user in a company
app.post('/api/companies/:companyId/chat-names/:userId', async (req, res) => {
  const data = await readData()
  if (!data.userChatNames) data.userChatNames = {}
  if (!data.userChatNames[req.params.companyId]) {
    data.userChatNames[req.params.companyId] = {}
  }

  const companyNames = data.userChatNames[req.params.companyId]

  // Check if user already has a name
  if (companyNames[req.params.userId]) {
    return res.json({ chatName: companyNames[req.params.userId] })
  }

  // Assign new name based on count of users who have chatted
  const nextCount = Object.keys(companyNames).length
  const chatName = generateNextChatName(nextCount)
  companyNames[req.params.userId] = chatName

  await writeData(data)
  res.json({ chatName })
})

// Chat settings (display name)
app.get('/api/companies/:companyId/chat-settings', async (req, res) => {
  const data = await readData()
  if (!data.chatSettings) data.chatSettings = {}
  const settings = data.chatSettings[req.params.companyId] || { displayName: `${req.query.companyName || ''} Chat` }
  res.json(settings)
})

app.put('/api/companies/:companyId/chat-settings', async (req, res) => {
  const data = await readData()
  if (!data.chatSettings) data.chatSettings = {}
  data.chatSettings[req.params.companyId] = req.body
  await writeData(data)
  res.json(data.chatSettings[req.params.companyId])
})

// ===== STATE SYNC =====
app.get('/api/sync', async (req, res) => {
  const data = await readData()
  res.json({
    users: data.users,
    events: data.events,
    bets: data.bets,
    comments: data.comments,
    chatMessages: data.chatMessages || [],
    companies: data.companies,
    favorites: data.favorites || {},
    pinnedEvents: data.pinnedEvents || {},
    feedback: data.feedback || [],
    anonVotedEvents: data.anonVotedEvents || {},
    hiddenCompanyIds: data.hiddenCompanyIds || [],
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

// Migrate comments to include companyId
const migrateComments = async () => {
  const data = await readData()
  let updated = 0
  data.comments = data.comments.map(comment => {
    if (!comment.companyId && comment.eventId) {
      const event = data.events.find(e => e.id === comment.eventId)
      if (event && event.companyId) {
        comment.companyId = event.companyId
        updated++
      }
    }
    return comment
  })
  if (updated > 0) {
    await writeData(data)
    console.log(`Migrated ${updated} comments to include companyId`)
  }
}

// Start server
const PORT = process.env.PORT || 3000
initData().then(() => {
  migrateComments().catch(err => console.error('Migration failed:', err))
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}).catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
