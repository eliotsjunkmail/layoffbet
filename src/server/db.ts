import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const db = {
  // ===== USERS =====
  async getUser(id: string) {
    return prisma.user.findUnique({ where: { id } })
  },

  async getUserByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } })
  },

  async getUsers() {
    return prisma.user.findMany()
  },

  async createUser(data: any) {
    return prisma.user.create({ data })
  },

  async updateUser(id: string, data: any) {
    return prisma.user.update({ where: { id }, data })
  },

  async deleteUser(id: string) {
    return prisma.user.delete({ where: { id } })
  },

  // ===== COMPANIES =====
  async getCompanies() {
    return prisma.company.findMany()
  },

  async getCompanyById(id: string) {
    return prisma.company.findUnique({ where: { id } })
  },

  async getCompanyBySlug(slug: string) {
    return prisma.company.findUnique({ where: { slug } })
  },

  async createCompany(data: any) {
    return prisma.company.create({ data })
  },

  async updateCompany(id: string, data: any) {
    return prisma.company.update({ where: { id }, data })
  },

  async deleteCompany(id: string) {
    return prisma.company.delete({ where: { id } })
  },

  // ===== EVENTS =====
  async getEvents() {
    return prisma.event.findMany()
  },

  async getEventById(id: string) {
    return prisma.event.findUnique({ where: { id } })
  },

  async createEvent(data: any) {
    return prisma.event.create({ data })
  },

  async updateEvent(id: string, data: any) {
    return prisma.event.update({ where: { id }, data })
  },

  async deleteEvent(id: string) {
    return prisma.event.delete({ where: { id } })
  },

  // ===== BETS =====
  async getBets() {
    return prisma.bet.findMany()
  },

  async getBetById(id: string) {
    return prisma.bet.findUnique({ where: { id } })
  },

  async createBet(data: any) {
    return prisma.bet.create({ data })
  },

  async updateBet(id: string, data: any) {
    return prisma.bet.update({ where: { id }, data })
  },

  async deleteBet(id: string) {
    return prisma.bet.delete({ where: { id } })
  },

  // ===== COMMENTS =====
  async getComments() {
    return prisma.comment.findMany()
  },

  async getCommentById(id: string) {
    return prisma.comment.findUnique({ where: { id } })
  },

  async createComment(data: any) {
    return prisma.comment.create({ data })
  },

  async updateComment(id: string, data: any) {
    return prisma.comment.update({ where: { id }, data })
  },

  async deleteComment(id: string) {
    return prisma.comment.delete({ where: { id } })
  },

  // ===== CHAT MESSAGES =====
  async getChatMessages(companyId: string) {
    return prisma.chatMessage.findMany({ where: { companyId } })
  },

  async getChatMessageById(id: string) {
    return prisma.chatMessage.findUnique({ where: { id } })
  },

  async createChatMessage(data: any) {
    return prisma.chatMessage.create({ data })
  },

  async updateChatMessage(id: string, data: any) {
    return prisma.chatMessage.update({ where: { id }, data })
  },

  async deleteChatMessage(id: string) {
    return prisma.chatMessage.delete({ where: { id } })
  },

  async deleteChatMessagesByCompany(companyId: string) {
    return prisma.chatMessage.deleteMany({ where: { companyId } })
  },

  // ===== FEEDBACK =====
  async getFeedback() {
    return prisma.feedbackItem.findMany()
  },

  async getFeedbackById(id: string) {
    return prisma.feedbackItem.findUnique({ where: { id } })
  },

  async createFeedback(data: any) {
    return prisma.feedbackItem.create({ data })
  },

  async updateFeedback(id: string, data: any) {
    return prisma.feedbackItem.update({ where: { id }, data })
  },

  async deleteFeedback(id: string) {
    return prisma.feedbackItem.delete({ where: { id } })
  },

  // ===== FAVORITES =====
  async getFavorites(userId: string) {
    return prisma.favorite.findMany({ where: { userId } })
  },

  async createFavorite(userId: string, companyId: string) {
    return prisma.favorite.create({ data: { id: `${userId}-${companyId}`, userId, companyId } })
  },

  async deleteFavorite(userId: string, companyId: string) {
    return prisma.favorite.deleteMany({ where: { userId, companyId } })
  },

  // ===== PINNED EVENTS =====
  async getPinnedEvents(userId: string) {
    return prisma.pinnedEvent.findMany({ where: { userId } })
  },

  async createPinnedEvent(userId: string, eventId: string) {
    return prisma.pinnedEvent.create({ data: { id: `${userId}-${eventId}`, userId, eventId } })
  },

  async deletePinnedEvent(userId: string, eventId: string) {
    return prisma.pinnedEvent.deleteMany({ where: { userId, eventId } })
  },

  // ===== HIDDEN COMPANIES =====
  async getHiddenCompanies(userId: string) {
    return prisma.hiddenCompany.findMany({ where: { userId } })
  },

  async createHiddenCompany(userId: string, companyId: string) {
    return prisma.hiddenCompany.create({ data: { id: `${userId}-${companyId}`, userId, companyId } })
  },

  async deleteHiddenCompany(userId: string, companyId: string) {
    return prisma.hiddenCompany.deleteMany({ where: { userId, companyId } })
  },

  // ===== CHAT SETTINGS =====
  async getChatSettings(companyId: string) {
    return prisma.chatSetting.findUnique({ where: { companyId } })
  },

  async createChatSettings(companyId: string, displayName: string) {
    return prisma.chatSetting.create({ data: { companyId, displayName } })
  },

  async updateChatSettings(companyId: string, displayName: string) {
    return prisma.chatSetting.upsert({
      where: { companyId },
      create: { companyId, displayName },
      update: { displayName }
    })
  },

  async deleteChatSettings(companyId: string) {
    return prisma.chatSetting.delete({ where: { companyId } })
  },

  // ===== USER CHAT NAMES =====
  async getUserChatName(userId: string, companyId: string) {
    return prisma.userChatName.findUnique({ where: { userId_companyId: { userId, companyId } } })
  },

  async createUserChatName(userId: string, companyId: string, displayName: string) {
    return prisma.userChatName.upsert({
      where: { userId_companyId: { userId, companyId } },
      create: { id: `${userId}-${companyId}`, userId, companyId, displayName },
      update: { displayName }
    })
  },

  async deleteUserChatName(userId: string, companyId: string) {
    return prisma.userChatName.deleteMany({ where: { userId, companyId } })
  },

  // ===== ANON VOTED EVENTS =====
  async getAnonVotedEvents() {
    return prisma.anonVotedEvent.findMany()
  },

  async createAnonVotedEvent(eventId: string, anonId: string) {
    return prisma.anonVotedEvent.create({ data: { eventId, anonId } })
  },

  async deleteAnonVotedEvent(eventId: string, anonId: string) {
    return prisma.anonVotedEvent.deleteMany({ where: { eventId, anonId } })
  },

  // ===== SYNC HELPER =====
  async getAllData() {
    return {
      users: await prisma.user.findMany(),
      events: await prisma.event.findMany(),
      bets: await prisma.bet.findMany(),
      comments: await prisma.comment.findMany(),
      chatMessages: await prisma.chatMessage.findMany(),
      companies: await prisma.company.findMany(),
      feedback: await prisma.feedbackItem.findMany(),
      favorites: await this._getFavoritesMap(),
      pinnedEvents: await this._getPinnedEventsMap(),
      hiddenCompanyIds: await this._getHiddenCompaniesMap(),
      chatSettings: await this._getChatSettingsMap(),
      userChatNames: await this._getUserChatNamesMap(),
      anonVotedEvents: await this._getAnonVotedEventsMap()
    }
  },

  async _getFavoritesMap() {
    const favorites = await prisma.favorite.findMany()
    const map: Record<string, string[]> = {}
    for (const fav of favorites) {
      if (!map[fav.userId]) map[fav.userId] = []
      map[fav.userId].push(fav.companyId)
    }
    return map
  },

  async _getPinnedEventsMap() {
    const pinned = await prisma.pinnedEvent.findMany()
    const map: Record<string, string[]> = {}
    for (const p of pinned) {
      if (!map[p.userId]) map[p.userId] = []
      map[p.userId].push(p.eventId)
    }
    return map
  },

  async _getHiddenCompaniesMap() {
    const hidden = await prisma.hiddenCompany.findMany()
    const map: Record<string, string[]> = {}
    for (const h of hidden) {
      if (!map[h.userId]) map[h.userId] = []
      map[h.userId].push(h.companyId)
    }
    return map
  },

  async _getChatSettingsMap() {
    const settings = await prisma.chatSetting.findMany()
    const map: Record<string, string> = {}
    for (const s of settings) {
      map[s.companyId] = s.displayName
    }
    return map
  },

  async _getUserChatNamesMap() {
    const names = await prisma.userChatName.findMany()
    const map: Record<string, Record<string, string>> = {}
    for (const n of names) {
      if (!map[n.userId]) map[n.userId] = {}
      map[n.userId][n.companyId] = n.displayName
    }
    return map
  },

  async _getAnonVotedEventsMap() {
    const voted = await prisma.anonVotedEvent.findMany()
    const map: Record<string, string[]> = {}
    for (const v of voted) {
      if (!map[v.eventId]) map[v.eventId] = []
      map[v.eventId].push(v.anonId)
    }
    return map
  },

  // Disconnect on shutdown
  async disconnect() {
    await prisma.$disconnect()
  }
}

export { prisma }
