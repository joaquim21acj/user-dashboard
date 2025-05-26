import { defineStore } from 'pinia'

const USERS_AMOUNT = 150

export interface User {
  id: number
  name: string
  email: string
  score: number
  rank?: number
}

const fakeApiCall = (minDelay = 500, maxDelay = 2000) => {
  const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay
  return new Promise<User[]>((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.1) {
        reject(new Error('Oops! A simulated network error occurred.'))
      } else {
        const users: User[] = []
        for (let i = 0; i < USERS_AMOUNT; i++) {
          users.push({
            id: i,
            name: `User ${i}`, 
            email: `email${i}@gmail.com`, 
            score: Math.floor(Math.random() * 100),
          })
        }
        resolve(users)
      }
    }, delay)
  })
}

const fakeApiRefresh = (allUsersInState: User[], minDelay = 500, maxDelay = 2000) => {
  const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay
  return new Promise<User | undefined>((resolve) => {
    setTimeout(() => {
      const randomId = Math.floor(Math.random() * USERS_AMOUNT)
      const userToUpdate = allUsersInState.find(user => user.id === randomId)
      if (userToUpdate) {
        userToUpdate.score = Math.floor(Math.random() * 100)
        resolve({ ...userToUpdate })
      } else {
        resolve(undefined)
      }
    }, delay)
  })
}

const updateLastUpdatedUsers = (userUpdated: User, lastUpdatedUsers: User[]) => {
  const existingIndex = lastUpdatedUsers.findIndex(u => u.id === userUpdated.id)
  if (existingIndex > -1) {
    lastUpdatedUsers.splice(existingIndex, 1)
  }
  lastUpdatedUsers.push(userUpdated)
  if (lastUpdatedUsers.length > 5) {
    lastUpdatedUsers.shift()
  }
}


export const useUserStore = defineStore('user', {
  state: () => ({
    allUsers: [] as User[],
    loading: false,
    error: null as string | null,
    lastUpdatedUsers: [] as User[],
    currentPage: 1,
    pageSize: 20,
    searchQuery: '',
  }),
  getters: {
    isLoading: (state) => state.loading,
    hasError: (state) => !!state.error,
    errorMsg: (state) => state.error,
    totalUsersInSystem: (state) => state.allUsers.length,

    _globallyRankedUsers(state): User[] {
      if (state.allUsers.length === 0) return []
      const usersWithRank: User[] = state.allUsers.map(u => ({ ...u }))
      usersWithRank.sort((a, b) => {
        if (b.score === a.score) {
          return a.name.localeCompare(b.name)
        }
        return b.score - a.score
      })
      const rankedMap = new Map<number, User[]>()
      usersWithRank.forEach(user => {
        if (!rankedMap.has(user.score)) {
          rankedMap.set(user.score, [])
        }
        rankedMap.get(user.score)?.push(user)
      })
      const sortedScores = Array.from(rankedMap.keys()).sort((a, b) => b - a)
      const finalGloballyRankedUsers: User[] = []
      sortedScores.forEach((score, rankIndex) => {
        const usersWithSameScore = rankedMap.get(score)!
        usersWithSameScore.sort((a,b) => a.name.localeCompare(b.name))
        usersWithSameScore.forEach(userFromMap => {
          finalGloballyRankedUsers.push({
            ...userFromMap,
            rank: rankIndex + 1,
          })
        })
      })
      return finalGloballyRankedUsers
    },

    _filteredUsers(state): User[] {
      const globallyRankedUsers = this._globallyRankedUsers
      const query = state.searchQuery.toLowerCase().trim()
      if (!query) {
        return globallyRankedUsers
      }
      return globallyRankedUsers.filter(user =>
        user.name.toLowerCase().includes(query)
      )
    },

    currentFilteredUserCount(): number {
      return this._filteredUsers.length
    },

    displayUsers(state): User[] {
      const usersToPaginate = this._filteredUsers
      const startIndex = (state.currentPage - 1) * state.pageSize
      const endIndex = startIndex + state.pageSize
      return usersToPaginate.slice(startIndex, endIndex)
    },

    totalPages(): number {
      const count = this.currentFilteredUserCount
      if (count === 0) return 1
      return Math.ceil(count / this.pageSize)
    },

    lastUpdatedUserIds: (state) => state.lastUpdatedUsers.map(user => user.id),
  },
  actions: {
    async fetchUsers() {
      if (this.loading) return
      this.loading = true
      this.error = null
      try {
        const fetchedUsers = await fakeApiCall()
        this.allUsers = fetchedUsers
        this.searchQuery = ''
        this.currentPage = 1
        this.lastUpdatedUsers = []
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e)
        this.allUsers = []
      } finally {
        this.loading = false
      }
    },
    setCurrentPage(page: number) {
      const totalPgs = this.totalPages
      if (page > 0 && page <= totalPgs) {
        this.currentPage = page
      } else if (page <= 0 && totalPgs > 0) {
        this.currentPage = 1
      } else if (page > totalPgs && totalPgs > 0) {
        this.currentPage = totalPgs
      } else if (totalPgs === 0 || totalPgs === 1) {
        this.currentPage = 1
      }
    },
    setSearchQuery(query: string) {
      this.searchQuery = query
      this.currentPage = 1
    },
    async refreshUserScores() {
      this.error = null
      try {
        const updatedUser = await fakeApiRefresh(this.allUsers)
        if (updatedUser) {
          updateLastUpdatedUsers(updatedUser, this.lastUpdatedUsers)
        }
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e)
      }
    },
    updateUserScore(userId: number, newScore: number) {
      const userToUpdate = this.allUsers.find(u => u.id === userId)
      if (userToUpdate) {
        userToUpdate.score = newScore
        updateLastUpdatedUsers({ ...userToUpdate }, this.lastUpdatedUsers)
      }
    },
  },
})