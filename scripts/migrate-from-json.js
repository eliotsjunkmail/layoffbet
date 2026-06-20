#!/usr/bin/env node
// Run once after creating Supabase tables: node scripts/migrate-from-json.js

import { createClient } from '@supabase/supabase-js'
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const toSnake = (obj) => {
  const map = {
    isAdmin: 'is_admin', isAnonymous: 'is_anonymous', displayName: 'display_name',
    anonymousNumber: 'anonymous_number', lastCoinsDate: 'last_coins_date',
    migratedToUserId: 'migrated_to_user_id', companyId: 'company_id',
    eventId: 'event_id', userId: 'user_id', createdAt: 'created_at',
    editedAt: 'edited_at', expiresAt: 'expires_at', companyName: 'company_name',
    creatorId: 'creator_id', creatorName: 'creator_name', yesPool: 'yes_pool',
    noPool: 'no_pool', viewCount: 'view_count', shareCount: 'share_count',
  }
  const result = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) result[map[k] || k] = v
  }
  return result
}

async function migrate() {
  const dataPath = path.join(__dirname, '..', 'data.json')
  const raw = await readFile(dataPath, 'utf-8')
  const data = JSON.parse(raw)

  console.log('Migrating users...')
  for (const user of (data.users || [])) {
    const { error } = await supabase.from('users').upsert(toSnake(user))
    if (error) console.warn('  user', user.id, ':', error.message)
    else console.log('  ✓', user.username)
  }

  console.log('Migrating companies...')
  for (const company of (data.companies || [])) {
    const { error } = await supabase.from('companies').upsert(toSnake(company))
    if (error) console.warn('  company', company.id, ':', error.message)
    else console.log('  ✓', company.name)
  }

  console.log('Migrating events...')
  for (const event of (data.events || [])) {
    const { error } = await supabase.from('events').upsert(toSnake(event))
    if (error) console.warn('  event', event.id, ':', error.message)
    else console.log('  ✓', event.title)
  }

  console.log('Migrating bets...')
  for (const bet of (data.bets || [])) {
    const { error } = await supabase.from('bets').upsert(toSnake(bet))
    if (error) console.warn('  bet', bet.id, ':', error.message)
  }
  console.log('  ✓', (data.bets || []).length, 'bets')

  console.log('Migrating comments...')
  for (const comment of (data.comments || [])) {
    const { error } = await supabase.from('comments').upsert(toSnake(comment))
    if (error) console.warn('  comment', comment.id, ':', error.message)
  }
  console.log('  ✓', (data.comments || []).length, 'comments')

  console.log('Migrating chat messages...')
  for (const msg of (data.chatMessages || [])) {
    const { error } = await supabase.from('chat_messages').upsert(toSnake(msg))
    if (error) console.warn('  msg', msg.id, ':', error.message)
  }
  console.log('  ✓', (data.chatMessages || []).length, 'messages')

  console.log('Migrating favorites...')
  const favs = data.favorites || {}
  for (const [userId, companyIds] of Object.entries(favs)) {
    for (const companyId of (companyIds || [])) {
      const { error } = await supabase.from('favorites').upsert({ user_id: userId, company_id: companyId })
      if (error) console.warn('  fav', userId, companyId, ':', error.message)
    }
  }
  console.log('  ✓ done')

  console.log('Migrating hidden companies...')
  for (const companyId of (data.hiddenCompanyIds || [])) {
    const { error } = await supabase.from('hidden_company_ids').upsert({ company_id: companyId })
    if (error) console.warn('  hidden', companyId, ':', error.message)
  }
  console.log('  ✓ done')

  console.log('Migrating chat settings...')
  const chatSettings = data.chatSettings || {}
  for (const [companyId, settings] of Object.entries(chatSettings)) {
    const { error } = await supabase.from('chat_settings').upsert({
      company_id: companyId,
      display_name: settings.displayName || '',
    })
    if (error) console.warn('  settings', companyId, ':', error.message)
  }
  console.log('  ✓ done')

  console.log('Migrating user chat names...')
  const userChatNames = data.userChatNames || {}
  for (const [companyId, names] of Object.entries(userChatNames)) {
    for (const [userId, chatName] of Object.entries(names || {})) {
      const { error } = await supabase.from('user_chat_names').upsert({
        company_id: companyId,
        user_id: userId,
        chat_name: chatName,
      })
      if (error) console.warn('  chatname', companyId, userId, ':', error.message)
    }
  }
  console.log('  ✓ done')

  console.log('\n✅ Migration complete!')
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
