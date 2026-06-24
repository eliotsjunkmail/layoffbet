import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const JS_TO_DB = {
  isAdmin: 'is_admin',
  isAnonymous: 'is_anonymous',
  displayName: 'display_name',
  anonymousNumber: 'anonymous_number',
  lastCoinsDate: 'last_coins_date',
  migratedToUserId: 'migrated_to_user_id',
  companyId: 'company_id',
  eventId: 'event_id',
  userId: 'user_id',
  createdAt: 'created_at',
  editedAt: 'edited_at',
  expiresAt: 'expires_at',
  companyName: 'company_name',
  creatorId: 'creator_id',
  creatorName: 'creator_name',
  yesPool: 'yes_pool',
  noPool: 'no_pool',
  viewCount: 'view_count',
  shareCount: 'share_count',
  chatName: 'chat_name',
  lastSide: 'last_side',
  anonId: 'anon_id',
}

const DB_TO_JS = Object.fromEntries(Object.entries(JS_TO_DB).map(([k, v]) => [v, k]))

const toDb = (obj, strip = []) => {
  if (!obj) return obj
  const result = {}
  for (const [k, v] of Object.entries(obj)) {
    if (strip.includes(k) || v === undefined) continue
    result[JS_TO_DB[k] || k] = v
  }
  return result
}

const fromDb = (row) => {
  if (!row) return null
  const result = {}
  for (const [k, v] of Object.entries(row)) {
    result[DB_TO_JS[k] || k] = v
  }
  return result
}

const throwOnError = (error, ctx) => {
  if (error) {
    console.error(`[db] ${ctx}:`, error.message)
    throw new Error(error.message)
  }
}

export const db = {
  // ===== USERS =====
  async getUsers() {
    const { data, error } = await supabase.from('users').select('*').order('created_at')
    throwOnError(error, 'getUsers')
    return (data || []).map(fromDb)
  },

  async getUserById(id) {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle()
    throwOnError(error, 'getUserById')
    return fromDb(data)
  },

  async getUserByUsername(username) {
    const { data, error } = await supabase.from('users').select('*').eq('username', username).maybeSingle()
    throwOnError(error, 'getUserByUsername')
    return fromDb(data)
  },

  async getMaxAnonNumber() {
    // IMPORTANT: filter out NULL anonymous_number rows. In Postgres, `ORDER BY ... DESC`
    // puts NULLs FIRST by default, so without this filter a single user with a NULL
    // anonymous_number would make this return 0 every time — causing every gate user to
    // collide on username "Anon0000001" and fail after the first one succeeds.
    const { data, error } = await supabase
      .from('users')
      .select('anonymous_number')
      .not('anonymous_number', 'is', null)
      .order('anonymous_number', { ascending: false })
      .limit(1)
    throwOnError(error, 'getMaxAnonNumber')
    return data?.[0]?.anonymous_number ?? 0
  },

  async createUser(user) {
    const { data, error } = await supabase.from('users').insert(toDb(user)).select().single()
    throwOnError(error, 'createUser')
    return fromDb(data)
  },

  async updateUser(id, updates) {
    const { data, error } = await supabase.from('users').update(toDb(updates, ['id'])).eq('id', id).select().single()
    throwOnError(error, 'updateUser')
    return fromDb(data)
  },

  async deleteUser(id) {
    const { error } = await supabase.from('users').delete().eq('id', id)
    throwOnError(error, 'deleteUser')
  },

  async migrateBetsToUser(fromUserId, toUserId) {
    const { error } = await supabase.from('bets').update({ user_id: toUserId }).eq('user_id', fromUserId)
    throwOnError(error, 'migrateBetsToUser')
  },

  async migrateFavoritesToUser(fromUserId, toUserId) {
    const { data: favs } = await supabase.from('favorites').select('*').eq('user_id', fromUserId)
    if (favs?.length) {
      await supabase.from('favorites').delete().eq('user_id', fromUserId)
      await supabase.from('favorites').upsert(favs.map(f => ({ user_id: toUserId, company_id: f.company_id })))
    }
  },

  async ensureAdminUser() {
    const existing = await this.getUserById('user-admin')
    if (!existing) {
      await this.createUser({
        id: 'user-admin',
        username: 'eliot',
        password: 'Eliot123',
        coins: 999,
        isAdmin: true,
        isAnonymous: false,
        createdAt: new Date().toISOString(),
        lastCoinsDate: new Date().toISOString().split('T')[0],
        anonymousNumber: 100000,
        displayName: 'Eliot',
      })
      console.log('[db] Admin user created')
    }
  },

  // ===== COMPANIES =====
  async getCompanies() {
    const { data, error } = await supabase.from('companies').select('*').order('created_at')
    throwOnError(error, 'getCompanies')
    return (data || []).map(fromDb)
  },

  async createCompany(company) {
    const { data, error } = await supabase.from('companies').insert(toDb(company)).select().single()
    throwOnError(error, 'createCompany')
    return fromDb(data)
  },

  async updateCompany(id, updates) {
    const { data, error } = await supabase.from('companies').update(toDb(updates, ['id'])).eq('id', id).select().maybeSingle()
    throwOnError(error, 'updateCompany')
    return fromDb(data)
  },

  async deleteCompany(id) {
    const { error } = await supabase.from('companies').delete().eq('id', id)
    throwOnError(error, 'deleteCompany')
  },

  // ===== EVENTS =====
  async getEvents() {
    const { data, error } = await supabase.from('events').select('*').order('created_at')
    throwOnError(error, 'getEvents')
    return (data || []).map(fromDb)
  },

  async createEvent(event) {
    const { data, error } = await supabase.from('events').insert(toDb(event)).select().single()
    throwOnError(error, 'createEvent')
    return fromDb(data)
  },

  async updateEvent(id, updates) {
    const { data, error } = await supabase.from('events').update(toDb(updates, ['id'])).eq('id', id).select().maybeSingle()
    throwOnError(error, 'updateEvent')
    return fromDb(data)
  },

  async deleteEvent(id) {
    const { error } = await supabase.from('events').delete().eq('id', id)
    throwOnError(error, 'deleteEvent')
  },

  // ===== BETS =====
  async getBets() {
    const { data, error } = await supabase.from('bets').select('*').order('created_at')
    throwOnError(error, 'getBets')
    return (data || []).map(fromDb)
  },

  async getUserBetCount(userId) {
    const { count, error } = await supabase.from('bets').select('*', { count: 'exact', head: true }).eq('user_id', userId)
    throwOnError(error, 'getUserBetCount')
    return count || 0
  },

  async createBet(bet) {
    const { data, error } = await supabase.from('bets').insert(toDb(bet)).select().single()
    throwOnError(error, 'createBet')
    return fromDb(data)
  },

  async updateBet(id, updates) {
    const { data, error } = await supabase.from('bets').update(toDb(updates, ['id'])).eq('id', id).select().maybeSingle()
    throwOnError(error, 'updateBet')
    return fromDb(data)
  },

  async getBetById(id) {
    const { data, error } = await supabase.from('bets').select('*').eq('id', id).maybeSingle()
    throwOnError(error, 'getBetById')
    return data ? fromDb(data) : null
  },

  async deleteBet(id) {
    const { error } = await supabase.from('bets').delete().eq('id', id)
    throwOnError(error, 'deleteBet')
  },

  // ===== COMMENTS =====
  async getComments() {
    const { data, error } = await supabase.from('comments').select('*').order('created_at')
    throwOnError(error, 'getComments')
    return (data || []).map(fromDb)
  },

  async createComment(comment) {
    const { data, error } = await supabase.from('comments').insert(toDb(comment)).select().single()
    throwOnError(error, 'createComment')
    return fromDb(data)
  },

  async updateComment(id, updates) {
    const { data, error } = await supabase.from('comments').update(toDb(updates, ['id'])).eq('id', id).select().maybeSingle()
    throwOnError(error, 'updateComment')
    return fromDb(data)
  },

  async deleteComment(id) {
    const { error } = await supabase.from('comments').delete().eq('id', id)
    throwOnError(error, 'deleteComment')
  },

  async upvoteComment(id) {
    const { data: existing, error: fetchErr } = await supabase.from('comments').select('upvotes').eq('id', id).maybeSingle()
    throwOnError(fetchErr, 'upvoteComment:fetch')
    if (!existing) return null
    const { data, error } = await supabase.from('comments').update({ upvotes: (existing.upvotes ?? 0) + 1 }).eq('id', id).select().single()
    throwOnError(error, 'upvoteComment:update')
    return fromDb(data)
  },

  // ===== CHAT MESSAGES =====
  async getChatMessages(companyId) {
    const { data, error } = await supabase.from('chat_messages').select('*').eq('company_id', companyId).order('created_at')
    throwOnError(error, 'getChatMessages')
    return (data || []).map(fromDb)
  },

  async createChatMessage(message) {
    const { data, error } = await supabase.from('chat_messages').insert(toDb(message)).select().single()
    throwOnError(error, 'createChatMessage')
    return fromDb(data)
  },

  async deleteChatMessage(messageId, companyId) {
    const { error } = await supabase.from('chat_messages').delete().eq('id', messageId).eq('company_id', companyId)
    throwOnError(error, 'deleteChatMessage')
  },

  async clearChatMessages(companyId) {
    const { error } = await supabase.from('chat_messages').delete().eq('company_id', companyId)
    throwOnError(error, 'clearChatMessages')
    await supabase.from('user_chat_names').delete().eq('company_id', companyId)
  },

  async updateMessageReactions(messageId, companyId, reactions) {
    const { data, error } = await supabase.from('chat_messages').update({ reactions }).eq('id', messageId).eq('company_id', companyId).select().maybeSingle()
    throwOnError(error, 'updateMessageReactions')
    return fromDb(data)
  },

  // ===== FAVORITES =====
  async getFavorites(userId) {
    const { data, error } = await supabase.from('favorites').select('company_id').eq('user_id', userId)
    throwOnError(error, 'getFavorites')
    return (data || []).map(r => r.company_id)
  },

  async addFavorite(userId, companyId) {
    const { error } = await supabase.from('favorites').upsert({ user_id: userId, company_id: companyId })
    throwOnError(error, 'addFavorite')
  },

  async removeFavorite(userId, companyId) {
    const { error } = await supabase.from('favorites').delete().eq('user_id', userId).eq('company_id', companyId)
    throwOnError(error, 'removeFavorite')
  },

  // ===== HIDDEN COMPANIES =====
  async getHiddenCompanyIds() {
    const { data, error } = await supabase.from('hidden_company_ids').select('company_id')
    throwOnError(error, 'getHiddenCompanyIds')
    return (data || []).map(r => r.company_id)
  },

  async toggleHiddenCompany(companyId) {
    const { data: existing } = await supabase.from('hidden_company_ids').select('company_id').eq('company_id', companyId).maybeSingle()
    if (existing) {
      await supabase.from('hidden_company_ids').delete().eq('company_id', companyId)
      return false
    }
    await supabase.from('hidden_company_ids').insert({ company_id: companyId })
    return true
  },

  // ===== CHAT SETTINGS =====
  async getChatSettings(companyId) {
    const { data, error } = await supabase.from('chat_settings').select('*').eq('company_id', companyId).maybeSingle()
    throwOnError(error, 'getChatSettings')
    if (!data) return null

    // Check if name has expired
    const isExpired = data.name_expires_at && new Date(data.name_expires_at) < new Date()
    const displayName = isExpired ? '' : (data.display_name || '')
    const isLocked = !isExpired && data.name_expires_at && new Date(data.name_expires_at) > new Date()

    return {
      displayName,
      isLocked: isLocked || false,
      expiresAt: isLocked ? data.name_expires_at : null,
      setBy: data.name_set_by
    }
  },

  async updateChatSettings(companyId, settings) {
    const expiresAt = settings.durationHours && settings.durationHours > 0
      ? new Date(Date.now() + settings.durationHours * 60 * 60 * 1000).toISOString()
      : null

    const { data, error } = await supabase.from('chat_settings').upsert({
      company_id: companyId,
      display_name: settings.displayName || '',
      name_set_by: settings.userId || null,
      name_expires_at: expiresAt,
    }).select().single()
    throwOnError(error, 'updateChatSettings')

    return {
      displayName: data.display_name,
      isLocked: data.name_expires_at && new Date(data.name_expires_at) > new Date(),
      expiresAt: data.name_expires_at
    }
  },

  // ===== USER CHAT NAMES =====
  async getUserChatName(companyId, userId) {
    const { data, error } = await supabase.from('user_chat_names').select('chat_name').eq('company_id', companyId).eq('user_id', userId).maybeSingle()
    throwOnError(error, 'getUserChatName')
    return data?.chat_name ?? null
  },

  async getUserChatNamesCount(companyId) {
    const { count, error } = await supabase.from('user_chat_names').select('*', { count: 'exact', head: true }).eq('company_id', companyId)
    throwOnError(error, 'getUserChatNamesCount')
    return count ?? 0
  },

  async setUserChatName(companyId, userId, chatName) {
    const { error } = await supabase.from('user_chat_names').upsert({ company_id: companyId, user_id: userId, chat_name: chatName })
    throwOnError(error, 'setUserChatName')
  },

  async clearUserChatNames(companyId) {
    const { error } = await supabase.from('user_chat_names').delete().eq('company_id', companyId)
    throwOnError(error, 'clearUserChatNames')
  },

  // ===== SYNC =====
  async getAllSyncData() {
    const [users, events, bets, comments, companies, hiddenCompanyIds] = await Promise.all([
      this.getUsers(),
      this.getEvents(),
      this.getBets(),
      this.getComments(),
      this.getCompanies(),
      this.getHiddenCompanyIds(),
    ])

    const [{ data: chatMsgRows }, { data: favRows }] = await Promise.all([
      supabase.from('chat_messages').select('*').order('created_at'),
      supabase.from('favorites').select('*'),
    ])

    const chatMessages = (chatMsgRows || []).map(fromDb)

    const favorites = {}
    for (const f of (favRows || [])) {
      if (!favorites[f.user_id]) favorites[f.user_id] = []
      favorites[f.user_id].push(f.company_id)
    }

    return {
      users,
      events,
      bets,
      comments,
      chatMessages,
      companies,
      feedback: [],
      favorites,
      pinnedEvents: {},
      hiddenCompanyIds,
      anonVotedEvents: {},
    }
  },

  // ===== MIGRATE COMMENTS =====
  async migrateComments() {
    const { data: comments } = await supabase.from('comments').select('id,event_id').is('company_id', null).not('event_id', 'is', null)
    if (!comments?.length) return
    let updated = 0
    for (const comment of comments) {
      const { data: event } = await supabase.from('events').select('company_id').eq('id', comment.event_id).maybeSingle()
      if (event?.company_id) {
        await supabase.from('comments').update({ company_id: event.company_id }).eq('id', comment.id)
        updated++
      }
    }
    if (updated > 0) console.log(`[db] Migrated ${updated} comments`)
  },

  // ===== CLEAR SEEDED DATA =====
  async clearSeededData() {
    const { error: e1 } = await supabase.from('bets').delete().neq('id', '')
    const { error: e2 } = await supabase.from('comments').delete().neq('id', '')
    const { error: e3 } = await supabase.from('events').delete().neq('id', '')
    if (e1) throwOnError(e1, 'clearBets')
    if (e2) throwOnError(e2, 'clearComments')
    if (e3) throwOnError(e3, 'clearEvents')
    console.log('[db] Cleared all seeded data')
  },

  async deleteExcessBets(keepCount = 2) {
    const { data: allBets, error: fetchErr } = await supabase
      .from('bets')
      .select('id')
      .order('created_at', { ascending: true })

    if (fetchErr) throwOnError(fetchErr, 'fetchBets')
    if (!allBets || allBets.length <= keepCount) return

    const betsToDelete = allBets.slice(keepCount).map(b => b.id)
    const { error: deleteErr } = await supabase
      .from('bets')
      .delete()
      .in('id', betsToDelete)

    if (deleteErr) throwOnError(deleteErr, 'deleteExcessBets')
    console.log(`[db] Deleted ${betsToDelete.length} excess bets, kept ${keepCount}`)
  },
}
