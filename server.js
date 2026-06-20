import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import { db, prisma } from './src/server/db.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// API Routes

// ===== INIT =====
app.post('/api/init', async (req, res) => {
  const users = await db.getUsers()
  if (users.length === 0) {
    const { users: newUsers, events, bets, comments, chatMessages, companies } = req.body
    for (const user of newUsers || []) {
      await db.createUser(user)
    }
    for (const company of companies || []) {
      await db.createCompany(company)
    }
    for (const event of events || []) {
      await db.createEvent(event)
    }
    for (const bet of bets || []) {
      await db.createBet(bet)
    }
    for (const comment of comments || []) {
      await db.createComment(comment)
    }
    for (const msg of chatMessages || []) {
      await db.createChatMessage(msg)
    }
    return res.json({ ok: true, initialized: true })
  }
  res.json({ ok: true, initialized: false })
})

// ===== RESET =====
app.post('/api/reset', async (req, res) => {
  const { users, events, comments, companies } = req.body
  const adminIds = (users || []).filter(u => u.isAdmin).map(u => u.id)

  // Delete all bets
  const allBets = await db.getBets()
  for (const bet of allBets) {
    await db.deleteBet(bet.id)
  }

  // Delete non-admin users
  const allUsers = await db.getUsers()
  for (const user of allUsers) {
    if (!user.isAdmin) {
      await db.deleteUser(user.id)
    }
  }

  res.json({ ok: true, reset: true })
})

// ===== USERS =====
app.post('/api/users/register', async (req, res) => {
  const { username, password, anonUserId } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' })

  const existing = await db.getUserByUsername(username)
  if (existing) {
    return res.status(400).json({ error: 'User exists' })
  }

  let user
  let anonUser = null

  if (anonUserId) {
    anonUser = await db.getUser(anonUserId)
  }

  if (anonUser && anonUser.username === username) {
    user = await db.updateUser(anonUser.id, {
      password,
      isAnonymous: false
    })
  } else {
    const allUsers = await db.getUsers()
    const maxAnonNum = Math.max(...allUsers.map(u => u.anonymousNumber ?? 0), 100000)

    user = await db.createUser({
      id: 'user-' + crypto.randomBytes(8).toString('hex'),
      username,
      password,
      coins: anonUser ? anonUser.coins : 100,
      isAdmin: false,
      createdAt: anonUser ? new Date(anonUser.createdAt) : new Date(),
      lastCoinsDate: new Date().toISOString().split('T')[0],
      anonymousNumber: maxAnonNum + 1,
      displayName: username,
    })

    if (anonUser) {
      const anonBets = await db.getBets()
      for (const bet of anonBets.filter(b => b.userId === anonUser.id)) {
        await db.updateBet(bet.id, { userId: user.id })
      }

      const anonFavorites = await db.getFavorites(anonUser.id)
      for (const fav of anonFavorites) {
        await db.deleteFavorite(anonUser.id, fav.companyId)
        await db.createFavorite(user.id, fav.companyId)
      }

      const anonPinned = await db.getPinnedEvents(anonUser.id)
      for (const pin of anonPinned) {
        await db.deletePinnedEvent(anonUser.id, pin.eventId)
        await db.createPinnedEvent(user.id, pin.eventId)
      }
    }
  }

  res.json(user)
})

app.get('/api/users', async (req, res) => {
  const users = await db.getUsers()
  res.json(users)
})

app.post('/api/users/login', async (req, res) => {
  const { username, password } = req.body
  const user = await db.getUserByUsername(username)

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  if (user.isAdmin) {
    await db.updateUser(user.id, { coins: 999 })
    user.coins = 999
  }

  res.json(user)
})

app.get('/api/next-anon-id', async (req, res) => {
  const users = await db.getUsers()
  const maxAnonNum = Math.max(...users.map(u => u.anonymousNumber ?? 0), 0)
  const nextNum = maxAnonNum + 1
  const username = `Anon${String(nextNum).padStart(7, '0')}`
  res.json({ username, nextNumber: nextNum })
})

app.post('/api/users/anonymous', async (req, res) => {
  const { anonUserId } = req.body

  if (anonUserId) {
    const existing = await db.getUser(anonUserId)
    if (existing) {
      return res.json(existing)
    }
  }

  const users = await db.getUsers()
  const maxAnonNum = Math.max(...users.map(u => u.anonymousNumber ?? 0), 0)
  const nextNum = maxAnonNum + 1
  const anonUsername = `Anon${String(nextNum).padStart(7, '0')}`

  const user = await db.createUser({
    id: 'anon-' + crypto.randomBytes(8).toString('hex'),
    username: anonUsername,
    password: null,
    coins: 50,
    isAdmin: false,
    isAnonymous: true,
    createdAt: new Date(),
    lastCoinsDate: new Date().toISOString().split('T')[0],
    anonymousNumber: nextNum,
    displayName: anonUsername,
  })

  res.json(user)
})

app.put('/api/users/:id', async (req, res) => {
  const user = await db.getUser(req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const updated = await db.updateUser(req.params.id, req.body)
  res.json(updated)
})

app.post('/api/users/:id/coins', async (req, res) => {
  const user = await db.getUser(req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const updated = await db.updateUser(req.params.id, {
    coins: (user.coins || 0) + 1
  })
  res.json(updated)
})

app.delete('/api/users/:id', async (req, res) => {
  const user = await db.getUser(req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found' })

  await db.deleteUser(req.params.id)
  res.json({ ok: true })
})

// ===== EVENTS =====
app.get('/api/events', async (req, res) => {
  const events = await db.getEvents()
  res.json(events)
})

app.post('/api/events', async (req, res) => {
  const event = await db.createEvent({
    id: 'evt-' + crypto.randomBytes(8).toString('hex'),
    ...req.body,
    createdAt: new Date()
  })
  res.json(event)
})

app.put('/api/events/:id', async (req, res) => {
  const event = await db.getEventById(req.params.id)
  if (!event) return res.status(404).json({ error: 'Event not found' })

  const updated = await db.updateEvent(req.params.id, req.body)
  res.json(updated)
})

app.delete('/api/events/:id', async (req, res) => {
  const event = await db.getEventById(req.params.id)
  if (!event) return res.status(404).json({ error: 'Event not found' })

  await db.deleteEvent(req.params.id)
  res.json({ ok: true })
})

// ===== BETS =====
app.get('/api/bets', async (req, res) => {
  const bets = await db.getBets()
  res.json(bets)
})

app.post('/api/bets', async (req, res) => {
  const bet = await db.createBet({
    id: 'bet-' + crypto.randomBytes(8).toString('hex'),
    ...req.body,
    createdAt: new Date()
  })
  res.json(bet)
})

app.put('/api/bets/:id', async (req, res) => {
  const bet = await db.getBetById(req.params.id)
  if (!bet) return res.status(404).json({ error: 'Bet not found' })

  const updated = await db.updateBet(req.params.id, req.body)
  res.json(updated)
})

app.delete('/api/bets/:id', async (req, res) => {
  const bet = await db.getBetById(req.params.id)
  if (!bet) return res.status(404).json({ error: 'Bet not found' })

  await db.deleteBet(req.params.id)
  res.json({ ok: true })
})

// ===== COMMENTS =====
app.get('/api/comments', async (req, res) => {
  const comments = await db.getComments()
  res.json(comments)
})

app.post('/api/comments', async (req, res) => {
  const { id, eventId, companyId, userId, content, createdAt, displayName } = req.body
  if (!id || !content || !userId || !createdAt) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const comment = await db.createComment({
    id,
    eventId,
    companyId,
    userId,
    content,
    createdAt: new Date(createdAt),
    displayName,
    upvotes: 0
  })
  res.json(comment)
})

app.put('/api/comments/:id', async (req, res) => {
  const { content, editedAt } = req.body
  const comment = await db.getCommentById(req.params.id)
  if (!comment) return res.status(404).json({ error: 'Comment not found' })

  const updated = await db.updateComment(req.params.id, {
    content,
    editedAt: editedAt ? new Date(editedAt) : undefined
  })
  res.json(updated)
})

app.delete('/api/comments/:id', async (req, res) => {
  const comment = await db.getCommentById(req.params.id)
  if (!comment) return res.status(404).json({ error: 'Comment not found' })

  await db.deleteComment(req.params.id)
  res.json({ ok: true })
})

app.post('/api/comments/:id/upvote', async (req, res) => {
  const comment = await db.getCommentById(req.params.id)
  if (!comment) return res.status(404).json({ error: 'Comment not found' })

  const updated = await db.updateComment(req.params.id, {
    upvotes: (comment.upvotes ?? 0) + 1
  })
  res.json(updated)
})

// ===== CHAT MESSAGES =====
app.get('/api/companies/:companyId/chat', async (req, res) => {
  const messages = await db.getChatMessages(req.params.companyId)
  res.json(messages)
})

app.post('/api/companies/:companyId/chat', async (req, res) => {
  const message = await db.createChatMessage({
    id: 'msg-' + crypto.randomBytes(8).toString('hex'),
    companyId: req.params.companyId,
    ...req.body,
    createdAt: new Date()
  })
  res.json(message)
})

app.delete('/api/companies/:companyId/chat/:messageId', async (req, res) => {
  const message = await db.getChatMessageById(req.params.messageId)
  if (!message || message.companyId !== req.params.companyId) {
    return res.status(404).json({ error: 'Message not found' })
  }

  await db.deleteChatMessage(req.params.messageId)
  res.json({ ok: true })
})

app.delete('/api/companies/:companyId/chat', async (req, res) => {
  await db.deleteChatMessagesByCompany(req.params.companyId)
  res.json({ ok: true })
})

app.put('/api/companies/:companyId/chat/:messageId/reactions', async (req, res) => {
  const message = await db.getChatMessageById(req.params.messageId)
  if (!message || message.companyId !== req.params.companyId) {
    return res.status(404).json({ error: 'Message not found' })
  }

  const updated = await db.updateChatMessage(req.params.messageId, {
    reactions: req.body.reactions
  })
  res.json(updated)
})

// ===== COMPANIES =====
app.get('/api/companies', async (req, res) => {
  const companies = await db.getCompanies()
  res.json(companies)
})

app.post('/api/companies', async (req, res) => {
  const company = await db.createCompany({
    id: 'comp-' + crypto.randomBytes(8).toString('hex'),
    ...req.body,
    createdAt: new Date()
  })
  res.json(company)
})

app.put('/api/companies/:id', async (req, res) => {
  const company = await db.getCompanyById(req.params.id)
  if (!company) return res.status(404).json({ error: 'Company not found' })

  const updated = await db.updateCompany(req.params.id, req.body)
  res.json(updated)
})

app.delete('/api/companies/:id', async (req, res) => {
  const company = await db.getCompanyById(req.params.id)
  if (!company) return res.status(404).json({ error: 'Company not found' })

  await db.deleteCompany(req.params.id)
  res.json({ ok: true })
})

app.post('/api/companies/:id/toggle-hidden', async (req, res) => {
  const hidden = await db.getHiddenCompanies(req.body.userId)
  const isHidden = hidden.some(h => h.companyId === req.params.id)

  if (isHidden) {
    await db.deleteHiddenCompany(req.body.userId, req.params.id)
  } else {
    await db.createHiddenCompany(req.body.userId, req.params.id)
  }

  res.json({ ok: true, hidden: !isHidden })
})

// Generate next available chat name (A, B, ..., Z, A1, B1, ..., Z1, A2, etc.)
const generateNextChatName = (count) => {
  if (count < 26) {
    return String.fromCharCode(65 + count)
  }
  const remainder = (count - 26) % 26
  const cycle = Math.floor((count - 26) / 26) + 1
  return String.fromCharCode(65 + remainder) + cycle
}

app.post('/api/companies/:companyId/chat-names/:userId', async (req, res) => {
  const existing = await db.getUserChatName(req.params.userId, req.params.companyId)
  if (existing) {
    return res.json({ chatName: existing.displayName })
  }

  const allNames = await prisma.userChatName.findMany({
    where: { companyId: req.params.companyId }
  })

  const chatName = generateNextChatName(allNames.length)
  await db.createUserChatName(req.params.userId, req.params.companyId, chatName)

  res.json({ chatName })
})

app.get('/api/companies/:companyId/chat-settings', async (req, res) => {
  const settings = await db.getChatSettings(req.params.companyId)
  const displayName = settings?.displayName || `${req.query.companyName || ''} Chat`
  res.json({ displayName })
})

app.put('/api/companies/:companyId/chat-settings', async (req, res) => {
  const updated = await db.updateChatSettings(req.params.companyId, req.body.displayName)
  res.json({ displayName: updated.displayName })
})

// ===== STATE SYNC =====
app.get('/api/sync', async (req, res) => {
  const data = await db.getAllData()
  res.json(data)
})

app.post('/api/favorites/:userId/:companyId', async (req, res) => {
  await db.createFavorite(req.params.userId, req.params.companyId)
  res.json({ ok: true })
})

app.delete('/api/favorites/:userId/:companyId', async (req, res) => {
  await db.deleteFavorite(req.params.userId, req.params.companyId)
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

// Initialize database and start server
const startServer = async () => {
  try {
    console.log('Initializing database...')

    // Check if database is accessible and create tables if needed
    try {
      const users = await db.getUsers()
      console.log(`✓ Database accessible with ${users.length} user(s)`)
    } catch (err) {
      console.log('Note: Database tables may not exist yet. Run: npm run db:migrate')
      console.log('Error details:', err.message)
    }

    // Start the server
    const PORT = process.env.PORT || 3000
    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`)
      console.log(`✓ Database via Prisma`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...')
  await db.disconnect()
  process.exit(0)
})
