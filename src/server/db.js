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
  suggestedBy: 'suggested_by',
  contentType: 'content_type',
  isWarnActNotice: 'is_warn_act_notice',
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

// PostgREST reports a table that hasn't been created yet (e.g. a project that predates a
// feature added after launch) as PGRST205 with this message — distinguish that from a real
// failure so callers can choose to no-op instead of blocking on it.
const isMissingTableError = (error) => !!error && (error.code === 'PGRST205' || /Could not find the table/i.test(error.message || ''))

// Supabase/PostgREST caps any single request at the project's configured max-rows (1000 by
// default) no matter what .limit() the client asks for — so tables that can grow past that
// have to be paged with .range() across multiple requests to actually return everything.
const PAGE_SIZE = 1000
const fetchAllRows = async (buildQuery, ctx, { maxTotal = 20000, safe = false } = {}) => {
  const all = []
  let offset = 0
  while (offset < maxTotal) {
    const to = Math.min(offset + PAGE_SIZE, maxTotal) - 1
    const { data, error } = await buildQuery().range(offset, to)
    if (error) {
      // "safe" tables were added after initial launch — a missing table degrades to
      // whatever was already paged in instead of failing the whole sync.
      if (safe) break
      throwOnError(error, ctx)
    }
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < (to - offset + 1)) break
    offset += data.length
  }
  return all
}

// Keeps bulk .in(column, [...ids]) deletes from building a request URL that's too long
// when the id list runs into the thousands.
const chunk = (arr, size) => {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export const db = {
  // ===== USERS =====
  async getUsers() {
    const data = await fetchAllRows(() => supabase.from('users').select('*').order('created_at'), 'getUsers')
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
    const data = await fetchAllRows(() => supabase.from('companies').select('*').order('created_at'), 'getCompanies')
    return (data || []).map(fromDb)
  },

  async createCompany(company) {
    const { data, error } = await supabase.from('companies').insert(toDb(company)).select().single()
    throwOnError(error, 'createCompany')
    return fromDb(data)
  },

  // Best-effort +1 to a company's view/click count when its page is visited. Read-modify-write
  // (a small amount of undercounting under heavy concurrency is fine for an analytics metric).
  async incrementCompanyViews(companyId) {
    if (!companyId) return
    const { data: row, error: fetchErr } = await supabase.from('companies').select('view_count').eq('id', companyId).maybeSingle()
    throwOnError(fetchErr, 'incrementCompanyViews:fetch')
    if (!row) return
    const { error } = await supabase.from('companies').update({ view_count: (row.view_count || 0) + 1 }).eq('id', companyId)
    throwOnError(error, 'incrementCompanyViews')
  },

  // Best-effort +1 to a company's share count. Fully swallows errors so it no-ops (rather
  // than failing the parent share request) until the companies.share_count column exists.
  async incrementCompanyShares(companyId) {
    if (!companyId) return
    try {
      const { data: row, error } = await supabase.from('companies').select('share_count').eq('id', companyId).maybeSingle()
      if (error || !row) return
      await supabase.from('companies').update({ share_count: (row.share_count || 0) + 1 }).eq('id', companyId)
    } catch {
      /* share_count column may not be migrated yet — ignore */
    }
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

  // Reassigns all content (events, comments, chat, favorites) from duplicateIds onto
  // primaryId, records each duplicate's name (and its own aliases) as an alias of the
  // primary, then deletes the duplicate company rows.
  async mergeCompanies(primaryId, duplicateIds) {
    const { data: primaryRow, error: primaryErr } = await supabase.from('companies').select('*').eq('id', primaryId).maybeSingle()
    throwOnError(primaryErr, 'mergeCompanies:fetchPrimary')
    if (!primaryRow) throw new Error('Primary company not found')
    const primary = fromDb(primaryRow)
    const newAliases = new Set(primary.aliases || [])

    for (const dupId of duplicateIds) {
      if (!dupId || dupId === primaryId) continue
      const { data: dupRow, error: dupErr } = await supabase.from('companies').select('*').eq('id', dupId).maybeSingle()
      throwOnError(dupErr, 'mergeCompanies:fetchDuplicate')
      if (!dupRow) continue
      const dup = fromDb(dupRow)

      newAliases.add(dup.name)
      for (const alias of (dup.aliases || [])) newAliases.add(alias)

      // Move real content over to the primary company
      await supabase.from('events').update({ company_id: primaryId, company_name: primary.name }).eq('company_id', dupId)
      await supabase.from('comments').update({ company_id: primaryId }).eq('company_id', dupId)
      await supabase.from('chat_messages').update({ company_id: primaryId }).eq('company_id', dupId)
      await supabase.from('moderation_queue').update({ company_id: primaryId, company_name: primary.name }).eq('company_id', dupId)

      // Merge favorites row-by-row to avoid unique-constraint conflicts with users who
      // already favorited the primary company under both names.
      const { data: favRows } = await supabase.from('favorites').select('user_id').eq('company_id', dupId)
      for (const fav of (favRows || [])) {
        await supabase.from('favorites').upsert({ user_id: fav.user_id, company_id: primaryId })
      }
      await supabase.from('favorites').delete().eq('company_id', dupId)

      // Ephemeral per-company state — drop rather than merge (chat topic, anon chat
      // handles, and hidden flag are all safe to reset for the folded-in company)
      await supabase.from('chat_settings').delete().eq('company_id', dupId)
      await supabase.from('user_chat_names').delete().eq('company_id', dupId)
      await supabase.from('hidden_company_ids').delete().eq('company_id', dupId)

      await supabase.from('companies').delete().eq('id', dupId)
    }

    const { data, error } = await supabase.from('companies').update({ aliases: Array.from(newAliases) }).eq('id', primaryId).select().maybeSingle()
    throwOnError(error, 'mergeCompanies:updatePrimary')
    return fromDb(data)
  },

  // ===== EVENTS =====
  async getEvents() {
    const data = await fetchAllRows(() => supabase.from('events').select('*').order('created_at'), 'getEvents')
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

  async adjustEventPool(eventId, deltaYes, deltaNo) {
    const { data: event, error: fetchErr } = await supabase.from('events').select('yes_pool, no_pool').eq('id', eventId).single()
    throwOnError(fetchErr, 'adjustEventPool:fetch')
    const yes_pool = Math.max(0, (event.yes_pool || 0) + deltaYes)
    const no_pool = Math.max(0, (event.no_pool || 0) + deltaNo)
    const { data, error } = await supabase.from('events').update({ yes_pool, no_pool }).eq('id', eventId).select().single()
    throwOnError(error, 'adjustEventPool:update')
    return fromDb(data)
  },

  // ===== BETS =====
  async getBets() {
    const data = await fetchAllRows(() => supabase.from('bets').select('*').order('created_at'), 'getBets')
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
    const data = await fetchAllRows(() => supabase.from('comments').select('*').order('created_at'), 'getComments')
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

  async toggleCommentUpvote(commentId, userId) {
    const { data: commentRow, error: commentFetchErr } = await supabase.from('comments').select('upvotes').eq('id', commentId).maybeSingle()
    throwOnError(commentFetchErr, 'toggleCommentUpvote:fetchComment')
    if (!commentRow) return null

    const { data: existing, error: fetchErr } = await supabase
      .from('comment_upvotes').select('*').eq('comment_id', commentId).eq('user_id', userId).maybeSingle()
    throwOnError(fetchErr, 'toggleCommentUpvote:fetchUpvote')

    let upvotes = commentRow.upvotes ?? 0
    let upvoted

    if (existing) {
      const { error } = await supabase.from('comment_upvotes').delete().eq('comment_id', commentId).eq('user_id', userId)
      throwOnError(error, 'toggleCommentUpvote:remove')
      upvotes = Math.max(0, upvotes - 1)
      upvoted = false
    } else {
      const { error } = await supabase.from('comment_upvotes').insert({ comment_id: commentId, user_id: userId })
      throwOnError(error, 'toggleCommentUpvote:add')
      upvotes = upvotes + 1
      upvoted = true
    }

    const { data, error } = await supabase.from('comments').update({ upvotes }).eq('id', commentId).select().single()
    throwOnError(error, 'toggleCommentUpvote:update')
    return { comment: fromDb(data), upvoted }
  },

  // ===== COMPANY SUGGESTIONS =====
  async createCompanySuggestion(data) {
    const { data: row, error } = await supabase.from('company_suggestions').insert(toDb(data)).select().single()
    throwOnError(error, 'createCompanySuggestion')
    return fromDb(row)
  },

  async updateCompanySuggestionStatus(id, status) {
    const { data, error } = await supabase.from('company_suggestions').update({ status }).eq('id', id).select().maybeSingle()
    throwOnError(error, 'updateCompanySuggestionStatus')
    return fromDb(data)
  },

  // ===== MODERATION QUEUE =====
  async createModerationItem(data) {
    const { data: row, error } = await supabase.from('moderation_queue').insert(toDb(data)).select().single()
    throwOnError(error, 'createModerationItem')
    return fromDb(row)
  },

  async getModerationItemById(id) {
    const { data, error } = await supabase.from('moderation_queue').select('*').eq('id', id).maybeSingle()
    throwOnError(error, 'getModerationItemById')
    return data ? fromDb(data) : null
  },

  async updateModerationItemStatus(id, status) {
    const { data, error } = await supabase.from('moderation_queue').update({ status }).eq('id', id).select().maybeSingle()
    throwOnError(error, 'updateModerationItemStatus')
    return fromDb(data)
  },

  // ===== CHAT MESSAGES =====
  async getChatMessages(companyId) {
    const data = await fetchAllRows(() => supabase.from('chat_messages').select('*').eq('company_id', companyId).order('created_at'), 'getChatMessages')
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

  async updateMessageText(messageId, companyId, text) {
    const { data, error } = await supabase.from('chat_messages').update({ text }).eq('id', messageId).eq('company_id', companyId).select().maybeSingle()
    throwOnError(error, 'updateMessageText')
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
    const data = await fetchAllRows(() => supabase.from('hidden_company_ids').select('company_id'), 'getHiddenCompanyIds')
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
      expiresAt: data.name_expires_at && !isExpired ? data.name_expires_at : null,
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

    // These tables were added after initial launch — fetched defensively (safe: true)
    // so a not-yet-migrated Supabase project degrades to empty data instead of failing the whole sync.
    const [chatMsgRows, favRows, upvoteRows, suggestionRows, moderationRows] = await Promise.all([
      fetchAllRows(() => supabase.from('chat_messages').select('*').order('created_at'), 'getAllSyncData:chatMessages', { safe: true }),
      fetchAllRows(() => supabase.from('favorites').select('*'), 'getAllSyncData:favorites', { safe: true }),
      fetchAllRows(() => supabase.from('comment_upvotes').select('*'), 'getAllSyncData:commentUpvotes', { safe: true }),
      fetchAllRows(() => supabase.from('company_suggestions').select('*').order('created_at'), 'getAllSyncData:companySuggestions', { safe: true }),
      fetchAllRows(() => supabase.from('moderation_queue').select('*').order('created_at'), 'getAllSyncData:moderationQueue', { safe: true }),
    ])

    const companySuggestions = (suggestionRows || []).map(fromDb)
    const moderationQueue = (moderationRows || []).map(fromDb)

    const chatMessages = (chatMsgRows || []).map(fromDb)

    const favorites = {}
    for (const f of (favRows || [])) {
      if (!favorites[f.user_id]) favorites[f.user_id] = []
      favorites[f.user_id].push(f.company_id)
    }

    const commentUpvotesByUser = {}
    // Latest upvote timestamp per comment (across all users) — feeds the "recency of
    // activity" event sort on Home/CompanyPage, alongside bets and comments. Falls back
    // to skipping a comment's upvotes for that purpose if created_at isn't present yet
    // (e.g. the column was added after this table already had rows).
    const latestUpvoteAtByComment = {}
    for (const u of (upvoteRows || [])) {
      if (!commentUpvotesByUser[u.user_id]) commentUpvotesByUser[u.user_id] = []
      commentUpvotesByUser[u.user_id].push(u.comment_id)
      if (u.created_at && (!latestUpvoteAtByComment[u.comment_id] || u.created_at > latestUpvoteAtByComment[u.comment_id])) {
        latestUpvoteAtByComment[u.comment_id] = u.created_at
      }
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
      commentUpvotesByUser,
      latestUpvoteAtByComment,
      companySuggestions,
      moderationQueue,
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
    const allBets = await fetchAllRows(() => supabase.from('bets').select('id').order('created_at', { ascending: true }), 'deleteExcessBets:fetchBets')

    if (!allBets || allBets.length <= keepCount) return

    const betsToDelete = allBets.slice(keepCount).map(b => b.id)
    for (const batch of chunk(betsToDelete, 200)) {
      const { error: deleteErr } = await supabase.from('bets').delete().in('id', batch)
      throwOnError(deleteErr, 'deleteExcessBets')
    }
    console.log(`[db] Deleted ${betsToDelete.length} excess bets, kept ${keepCount}`)
  },

  async deleteNonWarnEvents() {
    const rows = await fetchAllRows(
      () => supabase.from('events').select('id').or('is_warn_act_notice.is.null,is_warn_act_notice.eq.false'),
      'deleteNonWarnEvents:fetchEvents'
    )
    const ids = rows.map(r => r.id)
    if (ids.length === 0) return { deleted: 0 }

    for (const batch of chunk(ids, 200)) {
      const { error: betsErr } = await supabase.from('bets').delete().in('event_id', batch)
      throwOnError(betsErr, 'deleteNonWarnEvents:bets')
      const { error: commentsErr } = await supabase.from('comments').delete().in('event_id', batch)
      throwOnError(commentsErr, 'deleteNonWarnEvents:comments')
      const { error: eventsErr } = await supabase.from('events').delete().in('id', batch)
      throwOnError(eventsErr, 'deleteNonWarnEvents:events')
    }
    console.log(`[db] Deleted ${ids.length} non-WARN events`)
    return { deleted: ids.length }
  },

  async deleteAllNonAdminUsers() {
    // Bets/comments from a deleted user are left in place — they still back an event's
    // yes/no pool totals and public odds, which aren't recomputed from the bets table live.
    const { error, count } = await supabase.from('users').delete({ count: 'exact' }).eq('is_admin', false)
    throwOnError(error, 'deleteAllNonAdminUsers')
    console.log(`[db] Deleted ${count ?? 0} non-admin users`)
    return { deleted: count ?? 0 }
  },

  async deleteAllComments() {
    const { error: upvoteErr } = await supabase.from('comment_upvotes').delete().neq('comment_id', '')
    if (upvoteErr && !isMissingTableError(upvoteErr)) throwOnError(upvoteErr, 'deleteAllComments:upvotes')
    const { error, count } = await supabase.from('comments').delete({ count: 'exact' }).neq('id', '')
    throwOnError(error, 'deleteAllComments')
    console.log(`[db] Deleted ${count ?? 0} comments`)
    return { deleted: count ?? 0 }
  },

  async deleteAllChatMessagesAndTopics() {
    const { error: msgErr, count: msgCount } = await supabase.from('chat_messages').delete({ count: 'exact' }).neq('id', '')
    throwOnError(msgErr, 'deleteAllChatMessagesAndTopics:messages')
    const { error: settingsErr, count: settingsCount } = await supabase.from('chat_settings').delete({ count: 'exact' }).neq('company_id', '')
    throwOnError(settingsErr, 'deleteAllChatMessagesAndTopics:settings')
    console.log(`[db] Deleted ${msgCount ?? 0} chat messages and ${settingsCount ?? 0} chat topics`)
    return { deletedMessages: msgCount ?? 0, deletedTopics: settingsCount ?? 0 }
  },

  async deleteAllBets() {
    const { error, count } = await supabase.from('bets').delete({ count: 'exact' }).neq('id', '')
    throwOnError(error, 'deleteAllBets')
    // Pool totals are a stored aggregate on each event, not derived live from the bets
    // table, so they'd otherwise keep showing stale odds for bets that no longer exist.
    const { error: resetErr } = await supabase.from('events').update({ yes_pool: 0, no_pool: 0 }).neq('id', '')
    throwOnError(resetErr, 'deleteAllBets:resetPools')
    console.log(`[db] Deleted ${count ?? 0} bets and reset all event pools`)
    return { deleted: count ?? 0 }
  },

  // ===== ANALYTICS =====
  // Records that a user (registered or anonymous) was active today. One row per
  // (user_id, active_date) so DAU/WAU/MAU can be computed as distinct active users in a
  // window. The `user_activity` table is added-after-launch, so a missing table is a no-op
  // rather than an error (mirrors the deleteAllComments / getAllSyncData safe patterns).
  async recordActivity(userId, isAnonymous) {
    if (!userId) return
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase
      .from('user_activity')
      .upsert(
        { user_id: userId, is_anonymous: !!isAnonymous, active_date: today, last_seen_at: new Date().toISOString() },
        { onConflict: 'user_id,active_date' }
      )
    if (error && !isMissingTableError(error)) throwOnError(error, 'recordActivity')
  },

  // Computes the full admin analytics payload for the last `days` days. Action counts and
  // growth are derived from the existing tables' created_at timestamps (no duplicate
  // logging); DAU/WAU/MAU come from the user_activity ping table. Anonymous vs registered
  // is derived from users.is_anonymous, and migrated anon rows (tombstoned when an anon
  // registers) are excluded so a user isn't double-counted.
  async getAnalytics(days = 30) {
    const window = Math.max(1, Math.min(365, Number(days) || 30))

    const [users, events, bets, comments, companies] = await Promise.all([
      this.getUsers(), this.getEvents(), this.getBets(), this.getComments(), this.getCompanies(),
    ])
    const [chatRows, favRows, activityRows] = await Promise.all([
      fetchAllRows(() => supabase.from('chat_messages').select('user_id, created_at, company_id'), 'getAnalytics:chat', { safe: true }),
      fetchAllRows(() => supabase.from('favorites').select('user_id, company_id'), 'getAnalytics:favorites', { safe: true }),
      fetchAllRows(() => supabase.from('user_activity').select('user_id, is_anonymous, active_date'), 'getAnalytics:activity', { safe: true }),
    ])
    const chat = (chatRows || []).map(fromDb) // -> { userId, createdAt }
    const favorites = favRows || []
    const activity = activityRows || []

    const dayKey = (iso) => { try { return new Date(iso).toISOString().slice(0, 10) } catch { return null } }
    const todayKey = new Date().toISOString().slice(0, 10)
    const base = new Date(todayKey + 'T00:00:00Z')
    const offsetKey = (n) => new Date(base.getTime() - n * 86400000).toISOString().slice(0, 10)

    // Ordered date keys for the selected window (oldest -> newest, ending today).
    const windowKeys = []
    for (let i = window - 1; i >= 0; i--) windowKeys.push(offsetKey(i))
    const windowStart = windowKeys[0]

    const isMigrated = (u) => u.migrated === true || !!u.migratedToUserId
    const liveAnon = users.filter(u => u.isAnonymous && !isMigrated(u))
    const registered = users.filter(u => !u.isAnonymous)
    const admins = users.filter(u => u.isAdmin)

    const isAnonById = new Map(users.map(u => [u.id, !!u.isAnonymous]))
    const splitByActor = (rows) => {
      let anonymous = 0, reg = 0
      for (const r of rows) {
        const flag = isAnonById.get(r.userId ?? r.user_id)
        if (flag === true) anonymous++
        else if (flag === false) reg++
      }
      return { anonymous, registered: reg }
    }

    // Shares are counters (users.share_count), not rows, so they're summed rather than
    // split via splitByActor. Migrated anon tombstones are counted as registered so their
    // past shares aren't lost and total == anonymous + registered.
    let sharesAnon = 0, sharesReg = 0
    for (const u of users) {
      const cnt = u.shareCount || 0
      if (!cnt) continue
      if (u.isAnonymous && !isMigrated(u)) sharesAnon += cnt
      else sharesReg += cnt
    }
    const sharesSplit = { anonymous: sharesAnon, registered: sharesReg }

    const actionTotals = {
      events: events.length, bets: bets.length, comments: comments.length,
      chatMessages: chat.length, favorites: favorites.length, shares: sharesAnon + sharesReg,
    }
    const actionTotalsByType = {
      events: splitByActor(events.map(e => ({ userId: e.creatorId }))),
      bets: splitByActor(bets),
      comments: splitByActor(comments),
      chatMessages: splitByActor(chat),
      favorites: splitByActor(favorites),
      shares: sharesSplit,
    }

    // Active users (distinct pinged user_ids in each window). Date strings are YYYY-MM-DD
    // so lexical comparison is chronological.
    const distinctActive = (fromKey) => {
      const set = new Set()
      for (const a of activity) if (a.active_date >= fromKey) set.add(a.user_id)
      return set.size
    }
    const activeUsers = {
      dau: distinctActive(todayKey),
      wau: distinctActive(offsetKey(6)),
      mau: distinctActive(offsetKey(29)),
    }
    // Distinct users active within the selected time range (the metric the dashboard shows,
    // so the "active users" number tracks the 7/30/90-day filter instead of a fixed window).
    const activeInRange = distinctActive(windowStart)

    // Time series over the window.
    const seed = () => Object.fromEntries(windowKeys.map(k => [k, 0]))
    const newUsersAnon = seed(), newUsersReg = seed()
    for (const u of users) {
      const k = dayKey(u.createdAt)
      if (k == null || k < windowStart || k > todayKey) continue
      if (u.isAnonymous && !isMigrated(u)) newUsersAnon[k]++
      else if (!u.isAnonymous) newUsersReg[k]++
    }
    const actEvents = seed(), actBets = seed(), actComments = seed(), actChat = seed()
    const bucket = (rows, target, field) => {
      for (const r of rows) {
        const k = dayKey(r[field])
        if (k != null && target[k] !== undefined) target[k]++
      }
    }
    bucket(events, actEvents, 'createdAt')
    bucket(bets, actBets, 'createdAt')
    bucket(comments, actComments, 'createdAt')
    bucket(chat, actChat, 'createdAt')

    const activeByDay = Object.fromEntries(windowKeys.map(k => [k, new Set()]))
    for (const a of activity) if (activeByDay[a.active_date]) activeByDay[a.active_date].add(a.user_id)

    // Per-company engagement (all-time). Clicks come from the company's view_count;
    // bets/comments are attributed to a company via their event; chat & favorites via
    // their own company_id.
    const eventCompany = new Map(events.map(e => [e.id, e.companyId]))
    const perCompany = {}
    const ensureCo = (id) => (perCompany[id] || (perCompany[id] = { events: 0, bets: 0, comments: 0, chatMessages: 0, favorites: 0 }))
    for (const e of events) if (e.companyId) ensureCo(e.companyId).events++
    for (const b of bets) { const cid = eventCompany.get(b.eventId); if (cid) ensureCo(cid).bets++ }
    for (const cm of comments) { const cid = cm.companyId || eventCompany.get(cm.eventId); if (cid) ensureCo(cid).comments++ }
    for (const m of chat) if (m.companyId) ensureCo(m.companyId).chatMessages++
    for (const f of favorites) if (f.company_id) ensureCo(f.company_id).favorites++

    const companyStats = companies.map(c => {
      const s = perCompany[c.id] || { events: 0, bets: 0, comments: 0, chatMessages: 0, favorites: 0 }
      return { id: c.id, name: c.name, slug: c.slug, clicks: c.viewCount || 0, shares: c.shareCount || 0, ...s }
    }).sort((a, b) => b.clicks - a.clicks)

    return {
      generatedAt: new Date().toISOString(),
      rangeDays: window,
      hasActivityData: activity.length > 0,
      totals: {
        totalUsers: liveAnon.length + registered.length,
        anonymousUsers: liveAnon.length,
        registeredUsers: registered.length,
        admins: admins.length,
      },
      activeUsers,
      activeInRange,
      actionTotals,
      actionTotalsByType,
      series: {
        newUsers: windowKeys.map(k => ({ date: k, anonymous: newUsersAnon[k], registered: newUsersReg[k] })),
        actions: windowKeys.map(k => ({ date: k, events: actEvents[k], bets: actBets[k], comments: actComments[k], chatMessages: actChat[k] })),
        activeUsers: windowKeys.map(k => ({ date: k, count: activeByDay[k].size })),
      },
      companyStats,
    }
  },
}
