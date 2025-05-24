import { defineStore } from 'pinia'


const USERS_AMOUNT = 150

const fakeApiCall = (minDelay = 500, maxDelay = 2000) => {
  const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.1) {
        reject(new Error('Oops! A simulated network error occurred.'));
      } else {
        let users: User[] = [];
        for (let i = 0; i < USERS_AMOUNT; i++) {
          users.push({
            id: i,
            name: `User ${i}`,
            email: `email${i}@gmail.com`,
            score: Math.floor(Math.random() * 100),
          })
        }
        resolve(users);
      }
    }, delay);
  });
};

const fakeApiRefresh = (users: User[], minDelay = 500, maxDelay = 2000) => {
  const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const randomId = Math.floor(Math.random() * USERS_AMOUNT);
      const randomScore = Math.floor(Math.random() * 100);
      const userToUpdate = users.find(user => user.id === randomId);
      if (userToUpdate) {
        userToUpdate.score = randomScore;
        resolve(userToUpdate)
      }
    }, delay);
  });
};

const updateLastUpdatedUsers = (userUpdated: User, lastUpdatedUsers: User[]) => {
  if (lastUpdatedUsers.length >= 5) {
    lastUpdatedUsers.shift(); // Remove the oldest entry if we have 5 already
  }
  lastUpdatedUsers.push(userUpdated);
}

export const useUserStore = defineStore('user', {
  state: () => {
    return {
      users: [] as User[],
      loading: false,
      error: null as string | null,
      lastUpdatedUsers: [] as User[],
    }
  },
  getters: {
    userCount: (state) => state.users.length,
    isLoading: (state) => state.loading,
    hasError: (state) => !!state.error,
    lastUpdatedUserIds: (state) => state.lastUpdatedUsers.map(user => user.id),
    sortedUsers: (state) => {
      const rankedMap = new Map<number, User[]>()
      state.users.forEach(user => {
        if (!rankedMap.has(user.score)) {
          rankedMap.set(user.score, [])
        }
        rankedMap.get(user.score)?.push(user)
      })
      const sorted = Array.from(rankedMap.keys()).sort((a, b) => b - a)
      const sortedUsers = sorted.map(score => {
        const usersWithSameScore = rankedMap.get(score)
        if (usersWithSameScore) {
          usersWithSameScore.forEach(user => {
            user.rank = sorted.indexOf(score) + 1
          })
        }
        return usersWithSameScore
      }).flat()
      return sortedUsers as User[]
    }
  },
  actions: {
    async fetchUsers() {
      this.loading = true
      this.error = null
      try {
        const fetchedUsers = await fakeApiCall() as User[]
        this.users = fetchedUsers
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e)
        console.error("Simulated fetch users failed:", e)
      } finally {
        this.loading = false
      }
    },
    async refreshUserScores() {
      this.error = null
      try {
        console.log('Simulating API refresh...');
        const updatedUser = await fakeApiRefresh(this.users) as User
        const userIndex = this.users.findIndex(user => user.id === updatedUser.id)
        if (userIndex !== -1) {
          this.users[userIndex].score = updatedUser.score
          updateLastUpdatedUsers(updatedUser, this.lastUpdatedUsers)
        }
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e)
        console.error("Simulated refresh user scores failed:", e)
      } finally {
        this.loading = false
      }
    },
    updateUserScore(userId: number, newScore: number) {
      const userToUpdate = this.users.find(u => u.id === userId);
      if (userToUpdate) {
        userToUpdate.score = newScore;
      }
    },
  },
})

export interface User {
  id: number,
  name: string,
  email: string,
  score: number,
  rank?: number,
}