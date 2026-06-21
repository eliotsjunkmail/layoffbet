import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import { db } from './src/server/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(cors())
app.use(express.json())

// ===== INIT =====
app.post('/api/init', async (req, res) => {
  try {
    const users = await db.getUsers()
    if (users.length === 0) {
      const { users: u, events: e, bets: b, comments: c, chatMessages: cm, companies: co } = req.body
      for (const user of (u || [])) await db.createUser(user).catch(() => {})
      for (const company of (co || [])) await db.createCompany(company).catch(() => {})
      for (const event of (e || [])) await db.createEvent(event).catch(() => {})
      for (const bet of (b || [])) await db.createBet(bet).catch(() => {})
      for (const comment of (c || [])) await db.createComment(comment).catch(() => {})
      for (const msg of (cm || [])) await db.createChatMessage(msg).catch(() => {})
      return res.json({ ok: true, initialized: true })
    }
    res.json({ ok: true, initialized: false })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ===== RESET =====
app.post('/api/reset', async (req, res) => {
  try {
    const allUsers = await db.getUsers()
    for (const u of allUsers.filter(u => !u.isAdmin)) {
      await db.deleteUser(u.id).catch(() => {})
    }
    const companies = await db.getCompanies()
    for (const c of companies) {
      await db.clearChatMessages(c.id).catch(() => {})
    }
    res.json({ ok: true, reset: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ===== USERS =====
app.post('/api/users/register', async (req, res) => {
  try {
    const { username, password, anonUserId } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' })

    const existing = await db.getUserByUsername(username)
    if (existing) return res.status(400).json({ error: 'User exists' })

    let anonUser = null
    if (anonUserId) {
      const u = await db.getUserById(anonUserId)
      if (u?.isAnonymous) anonUser = u
    }

    let user
    if (anonUser && anonUser.username === username) {
      user = await db.updateUser(anonUser.id, { password, isAnonymous: false })
    } else {
      const maxAnonNum = await db.getMaxAnonNumber()
      user = await db.createUser({
        id: 'user-' + crypto.randomBytes(8).toString('hex'),
        username,
        password,
        coins: anonUser ? anonUser.coins : 100,
        isAdmin: false,
        isAnonymous: false,
        createdAt: anonUser ? anonUser.createdAt : new Date().toISOString(),
        lastCoinsDate: new Date().toISOString().split('T')[0],
        anonymousNumber: maxAnonNum + 1,
        displayName: username,
      })
      if (anonUser) {
        await db.migrateBetsToUser(anonUser.id, user.id)
        await db.migrateFavoritesToUser(anonUser.id, user.id)
        await db.updateUser(anonUser.id, { migrated: true, migratedToUserId: user.id })
      }
    }
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/users', async (req, res) => {
  try {
    res.json(await db.getUsers())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/users/login', async (req, res) => {
  try {
    const { username, password } = req.body
    const user = await db.getUserByUsername(username)
    if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid credentials' })
    if (user.isAdmin) {
      return res.json(await db.updateUser(user.id, { coins: 999 }))
    }
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/next-anon-id', async (req, res) => {
  try {
    const max = await db.getMaxAnonNumber()
    const nextNum = max + 1
    res.json({ username: `Anon${String(nextNum).padStart(7, '0')}`, nextNumber: nextNum })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/users/anonymous', async (req, res) => {
  try {
    const { anonUserId } = req.body
    if (anonUserId) {
      const existing = await db.getUserById(anonUserId)
      if (existing) return res.json(existing)
    }

    // Retry loop for handling race conditions on concurrent anonymous user creation
    let user, lastError
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const max = await db.getMaxAnonNumber()
        const nextNum = max + 1
        const anonUsername = `Anon${String(nextNum).padStart(7, '0')}`
        user = await db.createUser({
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
        })
        return res.json(user)
      } catch (err) {
        lastError = err
        // If unique constraint error on username, retry (race condition)
        if (err.message.includes('unique constraint') || err.message.includes('duplicate')) {
          if (attempt < 4) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 10))
            continue
          }
        }
        throw err
      }
    }
    throw lastError || new Error('Failed to create anonymous user')
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/users/:id', async (req, res) => {
  try {
    const user = await db.updateUser(req.params.id, req.body)
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/users/:id/coins', async (req, res) => {
  try {
    const user = await db.getUserById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(await db.updateUser(req.params.id, { coins: user.coins + 1 }))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/users/:id', async (req, res) => {
  try {
    await db.deleteUser(req.params.id)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ===== EVENTS =====
app.get('/api/events', async (req, res) => {
  try {
    res.json(await db.getEvents())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/events', async (req, res) => {
  try {
    const event = await db.createEvent({ id: 'evt-' + crypto.randomBytes(8).toString('hex'), ...req.body })
    res.json(event)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/events/:id', async (req, res) => {
  try {
    const event = await db.updateEvent(req.params.id, req.body)
    if (!event) return res.status(404).json({ error: 'Event not found' })
    res.json(event)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/events/:id', async (req, res) => {
  try {
    await db.deleteEvent(req.params.id)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ===== BETS =====
app.get('/api/bets', async (req, res) => {
  try {
    res.json(await db.getBets())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/bets', async (req, res) => {
  try {
    const bet = await db.createBet({ id: 'bet-' + crypto.randomBytes(8).toString('hex'), ...req.body, createdAt: new Date().toISOString() })
    res.json(bet)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/bets/:id', async (req, res) => {
  try {
    const bet = await db.updateBet(req.params.id, req.body)
    if (!bet) return res.status(404).json({ error: 'Bet not found' })
    res.json(bet)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/bets/:id', async (req, res) => {
  try {
    await db.deleteBet(req.params.id)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ===== COMMENTS =====
app.get('/api/comments', async (req, res) => {
  try {
    res.json(await db.getComments())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/comments', async (req, res) => {
  try {
    const { id, eventId, companyId, userId, content, createdAt, displayName } = req.body
    if (!id || !content || !userId || !createdAt) return res.status(400).json({ error: 'Missing required fields' })
    const comment = await db.createComment({ id, eventId, companyId, userId, content, createdAt, displayName, upvotes: 0 })
    res.json(comment)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/comments/:id', async (req, res) => {
  try {
    const { content, editedAt } = req.body
    const comment = await db.updateComment(req.params.id, { content, editedAt })
    if (!comment) return res.status(404).json({ error: 'Comment not found' })
    res.json(comment)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/comments/:id', async (req, res) => {
  try {
    await db.deleteComment(req.params.id)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/comments/:id/upvote', async (req, res) => {
  try {
    const comment = await db.upvoteComment(req.params.id)
    if (!comment) return res.status(404).json({ error: 'Comment not found' })
    res.json(comment)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ===== CHAT MESSAGES =====
app.get('/api/companies/:companyId/chat', async (req, res) => {
  try {
    res.json(await db.getChatMessages(req.params.companyId))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/companies/:companyId/chat', async (req, res) => {
  try {
    const message = await db.createChatMessage({
      id: 'msg-' + crypto.randomBytes(8).toString('hex'),
      companyId: req.params.companyId,
      ...req.body,
      createdAt: new Date().toISOString(),
    })
    res.json(message)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/companies/:companyId/chat/:messageId', async (req, res) => {
  try {
    await db.deleteChatMessage(req.params.messageId, req.params.companyId)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/companies/:companyId/chat', async (req, res) => {
  try {
    await db.clearChatMessages(req.params.companyId)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/companies/:companyId/chat/:messageId/reactions', async (req, res) => {
  try {
    const message = await db.updateMessageReactions(req.params.messageId, req.params.companyId, req.body.reactions)
    if (!message) return res.status(404).json({ error: 'Message not found' })
    res.json(message)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ===== COMPANIES =====
app.get('/api/companies', async (req, res) => {
  try {
    res.json(await db.getCompanies())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/companies', async (req, res) => {
  try {
    const company = await db.createCompany({
      id: 'comp-' + crypto.randomBytes(8).toString('hex'),
      ...req.body,
      createdAt: new Date().toISOString(),
    })
    res.json(company)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/companies/:id', async (req, res) => {
  try {
    const company = await db.updateCompany(req.params.id, req.body)
    if (!company) return res.status(404).json({ error: 'Company not found' })
    res.json(company)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/companies/:id', async (req, res) => {
  try {
    await db.deleteCompany(req.params.id)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/companies/:id/toggle-hidden', async (req, res) => {
  try {
    const hidden = await db.toggleHiddenCompany(req.params.id)
    res.json({ ok: true, hidden })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Generate next available chat name (A, B, ..., Z, A1, B1, ...)
const generateNextChatName = (count) => {
  if (count < 26) return String.fromCharCode(65 + count)
  const remainder = (count - 26) % 26
  const cycle = Math.floor((count - 26) / 26) + 1
  return String.fromCharCode(65 + remainder) + cycle
}

app.post('/api/companies/:companyId/chat-names/:userId', async (req, res) => {
  try {
    const { companyId, userId } = req.params
    let chatName = await db.getUserChatName(companyId, userId)
    if (!chatName) {
      const count = await db.getUserChatNamesCount(companyId)
      chatName = generateNextChatName(count)
      await db.setUserChatName(companyId, userId, chatName)
    }
    res.json({ chatName })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/companies/:companyId/chat-settings', async (req, res) => {
  try {
    const settings = await db.getChatSettings(req.params.companyId)
    res.json(settings || { displayName: `${req.query.companyName || ''} Chat` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/companies/:companyId/chat-settings', async (req, res) => {
  try {
    res.json(await db.updateChatSettings(req.params.companyId, req.body))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ===== STATE SYNC =====
app.get('/api/sync', async (req, res) => {
  try {
    res.json(await db.getAllSyncData())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/favorites/:userId', async (req, res) => {
  try {
    const favorites = await db.getFavorites(req.params.userId)
    res.json({ favorites })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/favorites/:userId/:companyId', async (req, res) => {
  try {
    await db.addFavorite(req.params.userId, req.params.companyId)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/favorites/:userId/:companyId', async (req, res) => {
  try {
    await db.removeFavorite(req.params.userId, req.params.companyId)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Serve static frontend
app.use(express.static(path.join(__dirname, 'dist')))

app.get(/^(?!\/api\/).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 3000
db.ensureAdminUser()
  .then(() => db.migrateComments())
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
  })
  .catch(err => {
    console.error('Failed to start server:', err)
    process.exit(1)
  })
