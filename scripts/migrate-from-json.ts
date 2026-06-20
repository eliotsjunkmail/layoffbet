import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { PrismaClient } from '@prisma/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, '../data.json')

const prisma = new PrismaClient()

async function migrate() {
  try {
    console.log('Starting migration from data.json to Supabase...')

    // Read data.json
    const dataContent = await fs.readFile(DATA_FILE, 'utf-8')
    const data = JSON.parse(dataContent)

    // Check if data already exists in database
    const existingUsers = await prisma.user.findMany()
    if (existingUsers.length > 0) {
      console.log('⚠️ Database already has data, skipping migration')
      process.exit(0)
    }

    // Migrate users
    console.log(`Migrating ${data.users.length} users...`)
    for (const user of data.users) {
      await prisma.user.create({
        data: {
          id: user.id,
          username: user.username,
          password: user.password,
          coins: user.coins,
          isAdmin: user.isAdmin,
          isAnonymous: user.isAnonymous || false,
          displayName: user.displayName,
          anonymousNumber: user.anonymousNumber,
          createdAt: new Date(user.createdAt),
          lastCoinsDate: user.lastCoinsDate
        }
      })
    }

    // Migrate companies
    console.log(`Migrating ${data.companies.length} companies...`)
    for (const company of data.companies) {
      await prisma.company.create({
        data: {
          id: company.id,
          name: company.name,
          slug: company.slug,
          description: company.description,
          industry: company.industry,
          viewCount: company.viewCount,
          color: company.color,
          aliases: company.aliases || [],
          createdAt: new Date(company.createdAt)
        }
      })
    }

    // Migrate events
    console.log(`Migrating ${data.events.length} events...`)
    for (const event of data.events) {
      await prisma.event.create({
        data: {
          id: event.id,
          companyId: event.companyId,
          companyName: event.companyName,
          title: event.title,
          description: event.description,
          expiresAt: new Date(event.expiresAt),
          status: event.status || 'active',
          creatorId: event.creatorId,
          creatorName: event.creatorName,
          yesPool: event.yesPool,
          noPool: event.noPool,
          outcome: event.outcome,
          createdAt: new Date(event.createdAt),
          viewCount: event.viewCount,
          shareCount: event.shareCount
        }
      })
    }

    // Migrate bets
    console.log(`Migrating ${data.bets.length} bets...`)
    for (const bet of data.bets) {
      await prisma.bet.create({
        data: {
          id: bet.id,
          eventId: bet.eventId,
          userId: bet.userId,
          side: bet.side,
          amount: bet.amount,
          createdAt: new Date(bet.createdAt)
        }
      })
    }

    // Migrate comments
    console.log(`Migrating ${data.comments.length} comments...`)
    for (const comment of data.comments) {
      await prisma.comment.create({
        data: {
          id: comment.id,
          eventId: comment.eventId,
          companyId: comment.companyId,
          userId: comment.userId,
          content: comment.content,
          createdAt: new Date(comment.createdAt),
          editedAt: comment.editedAt ? new Date(comment.editedAt) : undefined,
          upvotes: comment.upvotes || 0,
          displayName: comment.displayName
        }
      })
    }

    // Migrate chat messages
    console.log(`Migrating ${data.chatMessages.length} chat messages...`)
    for (const msg of data.chatMessages) {
      await prisma.chatMessage.create({
        data: {
          id: msg.id,
          companyId: msg.companyId,
          userId: msg.userId,
          username: msg.username,
          text: msg.text,
          reactions: msg.reactions || {},
          createdAt: new Date(msg.createdAt)
        }
      })
    }

    // Migrate feedback
    console.log(`Migrating ${data.feedback.length} feedback items...`)
    for (const fb of data.feedback) {
      await prisma.feedbackItem.create({
        data: {
          id: fb.id,
          text: fb.text,
          type: fb.type,
          userId: fb.userId,
          createdAt: new Date(fb.createdAt),
          status: fb.status || 'active'
        }
      })
    }

    // Migrate favorites
    console.log(`Migrating favorites...`)
    if (data.favorites) {
      for (const [userId, companyIds] of Object.entries(data.favorites)) {
        for (const companyId of (companyIds as string[])) {
          await prisma.favorite.create({
            data: {
              id: `${userId}-${companyId}`,
              userId,
              companyId
            }
          })
        }
      }
    }

    // Migrate pinned events
    console.log(`Migrating pinned events...`)
    if (data.pinnedEvents) {
      for (const [userId, eventIds] of Object.entries(data.pinnedEvents)) {
        for (const eventId of (eventIds as string[])) {
          await prisma.pinnedEvent.create({
            data: {
              id: `${userId}-${eventId}`,
              userId,
              eventId
            }
          })
        }
      }
    }

    // Migrate hidden companies
    console.log(`Migrating hidden companies...`)
    if (data.hiddenCompanyIds) {
      for (const [userId, companyIds] of Object.entries(data.hiddenCompanyIds)) {
        for (const companyId of (companyIds as string[])) {
          await prisma.hiddenCompany.create({
            data: {
              id: `${userId}-${companyId}`,
              userId,
              companyId
            }
          })
        }
      }
    }

    // Migrate chat settings
    console.log(`Migrating chat settings...`)
    if (data.chatSettings) {
      for (const [companyId, displayName] of Object.entries(data.chatSettings)) {
        await prisma.chatSetting.create({
          data: {
            companyId,
            displayName: displayName as string
          }
        })
      }
    }

    // Migrate user chat names
    console.log(`Migrating user chat names...`)
    if (data.userChatNames) {
      for (const [userId, chatNames] of Object.entries(data.userChatNames)) {
        for (const [companyId, displayName] of Object.entries(chatNames as Record<string, string>)) {
          await prisma.userChatName.create({
            data: {
              id: `${userId}-${companyId}`,
              userId,
              companyId,
              displayName
            }
          })
        }
      }
    }

    // Migrate anon voted events
    console.log(`Migrating anonymous voted events...`)
    if (data.anonVotedEvents) {
      for (const [eventId, anonIds] of Object.entries(data.anonVotedEvents)) {
        for (const anonId of (anonIds as string[])) {
          await prisma.anonVotedEvent.create({
            data: {
              eventId,
              anonId
            }
          })
        }
      }
    }

    console.log('✅ Migration complete!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

migrate()
