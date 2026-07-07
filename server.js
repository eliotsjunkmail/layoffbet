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

app.post('/api/admin/clear-seeded-data', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) return res.status(401).json({ error: 'Authentication required' })
    const user = await db.getUserByUsername(username)
    if (!user || user.password !== password || !user.isAdmin) return res.status(403).json({ error: 'Admin access required' })

    await db.clearSeededData()
    res.json({ ok: true, cleared: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const slugify = (name) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

app.post('/api/admin/import', async (req, res) => {
  try {
    const { username, password, items } = req.body
    if (!username || !password) return res.status(401).json({ error: 'Authentication required' })
    const adminUser = await db.getUserByUsername(username)
    if (!adminUser || adminUser.password !== password || !adminUser.isAdmin) return res.status(403).json({ error: 'Admin access required' })
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items to import' })

    const companies = await db.getCompanies()
    const users = await db.getUsers()
    const events = await db.getEvents()
    const errors = []
    let created = 0
    let currentEventId = null

    const findCompany = (name) => companies.find(c => c.name.toLowerCase() === (name || '').toLowerCase())
    const findEvent = (companyId, title) => events.find(e => e.companyId === companyId && e.title.toLowerCase() === (title || '').toLowerCase())
    const findUser = (uname) => users.find(u => u.username && u.username.toLowerCase() === (uname || '').toLowerCase())

    for (const item of items) {
      if (item.type === 'event') {
        currentEventId = null
        if (!item.company || !item.title) { errors.push(`Skipped event: missing company or title`); continue }
        let company = findCompany(item.company)
        if (!company) {
          company = await db.createCompany({
            id: 'comp-' + crypto.randomBytes(8).toString('hex'),
            name: item.company.trim(),
            slug: slugify(item.company),
            description: '',
            industry: '',
            color: '#003DA5',
            createdAt: new Date().toISOString(),
          })
          companies.push(company)
        }
        const expiresAt = new Date(Date.now() + (item.expiresDays || 30) * 24 * 60 * 60 * 1000).toISOString()
        const event = await db.createEvent({
          id: 'evt-' + crypto.randomBytes(8).toString('hex'),
          companyId: company.id,
          companyName: company.name,
          title: item.title.trim(),
          description: (item.description || '').trim(),
          expiresAt,
          status: 'active',
          creatorId: adminUser.id,
          creatorName: adminUser.username,
          yesPool: 0,
          noPool: 0,
          createdAt: new Date().toISOString(),
        })
        events.push(event)
        currentEventId = event.id
        created++
      } else if (item.type === 'comment') {
        let eventId = currentEventId
        if (item.company && item.eventTitle) {
          const company = findCompany(item.company)
          if (!company) { errors.push(`Skipped comment: company not found "${item.company}"`); continue }
          const event = findEvent(company.id, item.eventTitle)
          if (!event) { errors.push(`Skipped comment: event not found "${item.eventTitle}"`); continue }
          eventId = event.id
        }
        if (!eventId) { errors.push(`Skipped comment: no preceding event`); continue }
        if (!item.comment?.trim()) continue
        let author = adminUser
        if (item.username) {
          const found = findUser(item.username)
          if (!found) { errors.push(`Skipped comment: user not found "${item.username}"`); continue }
          author = found
        }
        await db.createComment({
          id: 'cmt-' + crypto.randomBytes(8).toString('hex'),
          eventId,
          userId: author.id,
          content: item.comment.trim(),
          displayName: author.username,
          createdAt: new Date().toISOString(),
          upvotes: 0,
          downvotes: 0,
        })
        created++
      } else if (item.type === 'company') {
        if (!item.name) { errors.push(`Skipped company: missing name`); continue }
        if (findCompany(item.name)) { errors.push(`Skipped company: "${item.name}" already exists`); continue }
        const company = await db.createCompany({
          id: 'comp-' + crypto.randomBytes(8).toString('hex'),
          name: item.name.trim(),
          slug: slugify(item.name),
          description: (item.description || '').trim(),
          industry: (item.industry || '').trim(),
          color: item.color || '#003DA5',
          createdAt: new Date().toISOString(),
        })
        companies.push(company)
        created++
      } else if (item.type === 'user') {
        if (!item.username || !item.password) { errors.push(`Skipped user: missing username or password`); continue }
        if (findUser(item.username)) { errors.push(`Skipped user: "${item.username}" already exists`); continue }
        const user = await db.createUser({
          id: 'user-' + crypto.randomBytes(8).toString('hex'),
          username: item.username.trim(),
          password: item.password,
          coins: item.coins ?? 100,
          isAdmin: false,
          isAnonymous: false,
          createdAt: new Date().toISOString(),
          lastCoinsDate: new Date().toISOString().split('T')[0],
        })
        users.push(user)
        created++
      } else if (item.type === 'bet') {
        if (!item.company || !item.eventTitle || !item.username || !item.side) { errors.push(`Skipped bet: missing required fields`); continue }
        const company = findCompany(item.company)
        if (!company) { errors.push(`Skipped bet: company not found "${item.company}"`); continue }
        const event = findEvent(company.id, item.eventTitle)
        if (!event) { errors.push(`Skipped bet: event not found "${item.eventTitle}"`); continue }
        const user = findUser(item.username)
        if (!user) { errors.push(`Skipped bet: user not found "${item.username}"`); continue }
        const side = item.side === 'yes' || item.side === 'no' ? item.side : null
        if (!side) { errors.push(`Skipped bet: side must be "yes" or "no"`); continue }
        const amount = item.amount || 10
        await db.createBet({
          id: 'bet-' + crypto.randomBytes(8).toString('hex'),
          eventId: event.id,
          userId: user.id,
          side,
          amount,
          createdAt: new Date().toISOString(),
        })
        await db.adjustEventPool(event.id, side === 'yes' ? amount : 0, side === 'no' ? amount : 0)
        created++
      }
    }

    res.json({ created, errors })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/admin/delete-excess-bets', async (req, res) => {
  try {
    const { username, password, keepCount } = req.body
    if (!username || !password) return res.status(401).json({ error: 'Authentication required' })
    const user = await db.getUserByUsername(username)
    if (!user || user.password !== password || !user.isAdmin) return res.status(403).json({ error: 'Admin access required' })

    await db.deleteExcessBets(keepCount || 2)
    res.json({ ok: true, deleted: true })
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

app.post('/api/admin/users', async (req, res) => {
  try {
    const { username, password, adminUsername, adminPassword } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' })
    if (!adminUsername || !adminPassword) return res.status(401).json({ error: 'Admin authentication required' })

    const admin = await db.getUserByUsername(adminUsername)
    if (!admin || admin.password !== adminPassword || !admin.isAdmin) return res.status(403).json({ error: 'Admin access required' })

    const existing = await db.getUserByUsername(username)
    if (existing) return res.status(400).json({ error: 'User already exists' })

    const user = await db.createUser({
      id: 'user-' + crypto.randomBytes(8).toString('hex'),
      username,
      password,
      coins: 100,
      isAdmin: true,
      isAnonymous: false,
      createdAt: new Date().toISOString(),
      lastCoinsDate: new Date().toISOString().split('T')[0],
      anonymousNumber: 100001,
      displayName: username,
    })
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
    console.log('[API /api/users/anonymous] Request received', { anonUserId })

    if (anonUserId) {
      console.log('[API /api/users/anonymous] Checking if anonUserId exists:', anonUserId)
      const existing = await db.getUserById(anonUserId)
      if (existing) {
        console.log('[API /api/users/anonymous] Found existing user:', existing.username)
        return res.json(existing)
      }
    }

    // Retry loop for handling race conditions on concurrent anonymous user creation
    let user, lastError
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        console.log(`[API /api/users/anonymous] Attempt ${attempt + 1}/5: Getting max anon number...`)
        const max = await db.getMaxAnonNumber()
        console.log(`[API /api/users/anonymous] Attempt ${attempt + 1}/5: Max anon number = ${max}`)

        const nextNum = max + 1
        const anonUsername = `Anon${String(nextNum).padStart(7, '0')}`
        console.log(`[API /api/users/anonymous] Attempt ${attempt + 1}/5: Creating user with username=${anonUsername}, nextNum=${nextNum}`)

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
        console.log(`[API /api/users/anonymous] SUCCESS: Created user ${anonUsername} (id=${user.id})`)
        return res.json(user)
      } catch (err) {
        lastError = err
        const errorMsg = err.message || String(err)
        console.error(`[API /api/users/anonymous] Attempt ${attempt + 1} FAILED: ${errorMsg}`, err)

        // Check if it's a unique constraint error (race condition)
        const isUniqueConstraintError = errorMsg.includes('unique') || errorMsg.includes('duplicate') || errorMsg.includes('User exists') || errorMsg.includes('violates')
        console.log(`[API /api/users/anonymous] Is unique constraint error? ${isUniqueConstraintError}`)

        if (isUniqueConstraintError && attempt < 4) {
          const delay = Math.pow(2, attempt) * 10
          console.log(`[API /api/users/anonymous] Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        // Not a retryable error or out of retries
        console.error(`[API /api/users/anonymous] Throwing error after attempt ${attempt + 1}`)
        throw err
      }
    }
    throw lastError || new Error('Failed to create anonymous user after 5 attempts')
  } catch (err) {
    const errorMsg = err.message || String(err)
    console.error('[API /api/users/anonymous] FATAL ERROR:', errorMsg, err)
    res.status(500).json({ error: `Anonymous user creation failed: ${errorMsg}` })
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

app.post('/api/users/:id/share', async (req, res) => {
  try {
    const user = await db.getUserById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(await db.updateUser(req.params.id, { shareCount: (user.shareCount ?? 0) + 1 }))
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

app.get('/api/users/:userId/bets/count', async (req, res) => {
  try {
    const count = await db.getUserBetCount(req.params.userId)
    res.json({ count })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/bets', async (req, res) => {
  try {
    const bet = await db.createBet({ id: 'bet-' + crypto.randomBytes(8).toString('hex'), ...req.body, createdAt: new Date().toISOString() })
    await db.adjustEventPool(bet.eventId, bet.side === 'yes' ? bet.amount : 0, bet.side === 'no' ? bet.amount : 0)
    res.json(bet)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/bets/:id', async (req, res) => {
  try {
    const existing = await db.getBetById(req.params.id)
    const bet = await db.updateBet(req.params.id, req.body)
    if (!bet) return res.status(404).json({ error: 'Bet not found' })
    if (existing && typeof req.body.amount === 'number') {
      const delta = req.body.amount - existing.amount
      if (delta !== 0) {
        await db.adjustEventPool(bet.eventId, bet.side === 'yes' ? delta : 0, bet.side === 'no' ? delta : 0)
      }
    }
    res.json(bet)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/bets/:id', async (req, res) => {
  try {
    const { eventId, userId } = req.query
    let bet = await db.getBetById(req.params.id)

    // Fallback: if bet not found by ID but eventId+userId provided, find by those
    if (!bet && eventId && userId) {
      console.log('[DELETE /api/bets/:id] Bet not found by ID, trying by eventId+userId:', { id: req.params.id, eventId, userId })
      const allBets = await db.getBets()
      bet = allBets.find(b => b.eventId === eventId && b.userId === userId)
    }

    if (!bet) {
      console.log('[DELETE /api/bets/:id] Bet not found:', { id: req.params.id, eventId, userId })
      return res.status(404).json({ error: 'Bet not found' })
    }

    await db.deleteBet(bet.id)
    await db.adjustEventPool(bet.eventId, bet.side === 'yes' ? -bet.amount : 0, bet.side === 'no' ? -bet.amount : 0)
    console.log('[DELETE /api/bets/:id] Deleted bet:', { betId: bet.id, eventId: bet.eventId, userId: bet.userId })
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
    const comment = await db.createComment({ id, eventId, companyId, userId, content, createdAt, displayName, upvotes: 0, downvotes: 0 })
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
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'userId required' })
    const result = await db.toggleCommentVote(req.params.id, userId, 'up')
    if (!result) return res.status(404).json({ error: 'Comment not found' })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/comments/:id/downvote', async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'userId required' })
    const result = await db.toggleCommentVote(req.params.id, userId, 'down')
    if (!result) return res.status(404).json({ error: 'Comment not found' })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ===== COMPANY SUGGESTIONS =====
app.post('/api/company-suggestions', async (req, res) => {
  try {
    const { name, userId } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Company name required' })
    const suggestion = await db.createCompanySuggestion({
      id: 'sugg-' + crypto.randomBytes(8).toString('hex'),
      name: name.trim(),
      suggestedBy: userId || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    })
    res.json(suggestion)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/company-suggestions/:id/resolve', async (req, res) => {
  try {
    const { status, username, password } = req.body
    if (!username || !password) return res.status(401).json({ error: 'Authentication required' })
    const admin = await db.getUserByUsername(username)
    if (!admin || admin.password !== password || !admin.isAdmin) return res.status(403).json({ error: 'Admin access required' })
    if (!['accepted', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' })
    const suggestion = await db.updateCompanySuggestionStatus(req.params.id, status)
    if (!suggestion) return res.status(404).json({ error: 'Suggestion not found' })
    res.json(suggestion)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ===== MODERATION QUEUE =====
app.post('/api/moderation-queue', async (req, res) => {
  try {
    const { contentType, companyId, companyName, userId, reason, payload } = req.body
    if (!contentType || !payload) return res.status(400).json({ error: 'contentType and payload required' })
    const item = await db.createModerationItem({
      id: 'mod-' + crypto.randomBytes(8).toString('hex'),
      contentType,
      companyId: companyId || null,
      companyName: companyName || 'Unknown',
      userId: userId || null,
      reason: reason || 'flagged content',
      payload,
      status: 'pending',
      createdAt: new Date().toISOString(),
    })
    res.json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/moderation-queue/:id/resolve', async (req, res) => {
  try {
    const { status, username, password } = req.body
    if (!username || !password) return res.status(401).json({ error: 'Authentication required' })
    const admin = await db.getUserByUsername(username)
    if (!admin || admin.password !== password || !admin.isAdmin) return res.status(403).json({ error: 'Admin access required' })
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' })

    const item = await db.getModerationItemById(req.params.id)
    if (!item) return res.status(404).json({ error: 'Moderation item not found' })

    if (status === 'approved') {
      const payload = item.payload || {}
      if (item.contentType === 'comment') {
        await db.createComment({
          id: 'cmt-' + crypto.randomBytes(8).toString('hex'),
          ...payload,
          createdAt: new Date().toISOString(),
        })
      } else if (item.contentType === 'chat_message') {
        await db.createChatMessage({
          id: 'msg-' + crypto.randomBytes(8).toString('hex'),
          ...payload,
          createdAt: new Date().toISOString(),
        })
      } else if (item.contentType === 'event') {
        const { initialSide, costCoins, ...eventData } = payload
        const event = await db.createEvent({
          id: 'evt-' + crypto.randomBytes(8).toString('hex'),
          ...eventData,
          yesPool: 0,
          noPool: 0,
          outcome: null,
          status: 'active',
          viewCount: 0,
          shareCount: 0,
          createdAt: new Date().toISOString(),
        })
        if (initialSide && payload.creatorId) {
          const amount = costCoins || 10
          await db.createBet({
            id: 'bet-' + crypto.randomBytes(8).toString('hex'),
            eventId: event.id,
            userId: payload.creatorId,
            side: initialSide,
            amount,
            createdAt: new Date().toISOString(),
          })
          await db.adjustEventPool(event.id, initialSide === 'yes' ? amount : 0, initialSide === 'no' ? amount : 0)
        }
      }
    }

    const updated = await db.updateModerationItemStatus(req.params.id, status)
    res.json(updated)
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

app.put('/api/companies/:companyId/chat/:messageId/text', async (req, res) => {
  try {
    const message = await db.updateMessageText(req.params.messageId, req.params.companyId, req.body.text)
    if (!message) return res.status(404).json({ error: 'Message not found' })
    res.json(message)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ===== CHAT TYPING INDICATOR (ephemeral, in-memory) =====
const TYPING_TTL_MS = 4000
const typingByCompany = new Map() // companyId -> Map(userId -> { username, updatedAt })

app.post('/api/companies/:companyId/chat/typing', (req, res) => {
  const { userId, username } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })
  if (!typingByCompany.has(req.params.companyId)) typingByCompany.set(req.params.companyId, new Map())
  typingByCompany.get(req.params.companyId).set(userId, { username: username || 'Someone', updatedAt: Date.now() })
  res.json({ ok: true })
})

app.get('/api/companies/:companyId/chat/typing', (req, res) => {
  const typers = typingByCompany.get(req.params.companyId)
  const now = Date.now()
  const result = []
  if (typers) {
    for (const [userId, info] of typers.entries()) {
      if (now - info.updatedAt > TYPING_TTL_MS) {
        typers.delete(userId)
        continue
      }
      if (userId === req.query.userId) continue
      result.push({ userId, username: info.username })
    }
  }
  res.json(result)
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
    const { username, password } = req.body
    if (!username || !password) return res.status(401).json({ error: 'Authentication required' })
    const user = await db.getUserByUsername(username)
    if (!user || user.password !== password || !user.isAdmin) return res.status(403).json({ error: 'Admin access required' })

    const { name, description = '', industry = '', color = '#003DA5' } = req.body
    if (!name) return res.status(400).json({ error: 'Company name required' })

    const slug = slugify(name)
    const company = await db.createCompany({
      id: 'comp-' + crypto.randomBytes(8).toString('hex'),
      name,
      slug,
      description,
      industry,
      color,
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
    res.json(settings || { displayName: `${req.query.companyName || ''} Chat`, expiresAt: null, isLocked: false })
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
