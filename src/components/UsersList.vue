<template>
  <div class="user-list-container">
    <div v-if="userStore.isLoading" class="loading-spinner-overlay">
      <div class="loading-spinner"></div>
    </div>

    <div v-if="userStore.hasError && !userStore.isLoading" class="error-message">
      <p>⚠️ Error: {{ userStore.error }}</p>
    </div>

    <div v-if="!userStore.isLoading && !userStore.hasError">
      <div class="filter-container" v-if="userStore.userCount > 0"> <input type="text" v-model="searchQuery" placeholder="Filter by name..." class="filter-input" />
      </div> <div v-if="showUsersTable" class="users">
        <p>Total Users in Store: {{ userStore.userCount }}</p> <p v-if="searchQuery && filteredAndSortedUsers.length !== userStore.userCount">
          Showing: {{ filteredAndSortedUsers.length }} matching user(s)
        </p>
        <table>
          <thead>
            <tr>
              <th class="text-left">Ranking</th>
              <th class="text-left">Name</th>
              <th class="text-left">Score</th>
              <th class="text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredAndSortedUsers" :key="user.id" :class="{ 'highlighted-row': isRecentlyUpdated(user.id) }" >
              <td class="text-left">
                <div>
                  {{ user.rank }}
                </div>
                <template v-if="isRecentlyUpdated(user.id)">
                  <small>Recently Updated</small>
                </template>
              </td>
              <td class="text-left">{{ user.name }}</td>
              <td class="text-left column-score">
                <template v-if="isEditMode(user.id)">
                  <input type="number" v-model.number="editedScore" />
                </template>
                <template v-else>
                  <span>{{ user.score }}</span>
                </template>
              </td>
              <td class="text-left column-actions">
                <template v-if="isEditMode(user.id)">
                  <button @click="saveScore(user)" class="save-button">Save</button>
                  <button @click="cancelEdit(user)" class="cancel-button">Cancel</button>
                </template>
                <template v-else>
                  <button @click="enterEditMode(user)">Edit</button>
                </template>
              </td>
            </tr>
            <tr v-if="userStore.userCount > 0 && filteredAndSortedUsers.length === 0 && searchQuery">
              <td colspan="4" class="empty-state-cell">No users match your filter "{{ searchQuery }}".</td>
            </tr>
          </tbody>
        </table>
      </div> <div v-if="showNoUsersMessage" class="no-users-found"> <p>🤷 No users found or an issue occurred.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, onMounted, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import type { User } from '@/stores/user'

const userStore = useUserStore()
const editModeForUserId = ref<number | undefined>(undefined)
const originalScore = ref<number | undefined>(undefined)
const editedScore = ref<number | undefined>(undefined)
const showUsersTable = computed(() => !userStore.isLoading && !userStore.hasError && userStore.userCount > 0)
const showNoUsersMessage = computed(() => !userStore.isLoading && !userStore.hasError && userStore.userCount === 0)
const secondsToRefresh = 30
let refreshInterval: ReturnType<typeof setInterval> | undefined
const searchQuery = ref('');

onMounted(async () => {
  if (userStore.userCount === 0) {
    await userStore.fetchUsers()
  }
  startRefreshingUsers()
})

onUnmounted(() => {
  stopRefreshingUsers()
})

const filteredAndSortedUsers = computed(() => {
  const usersToFilter = userStore.sortedUsers
  const query = searchQuery.value.toLowerCase().trim()

  if (!query) {
    return usersToFilter
  }

  return usersToFilter.filter(user =>
    user.name.toLowerCase().includes(query)
  )
})

const startRefreshingUsers = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
  refreshInterval = setInterval(() => {
    userStore.refreshUserScores()
  }, secondsToRefresh * 1000)
}

const isRecentlyUpdated = (userId: number): boolean => {
  return userStore.lastUpdatedUserIds.includes(userId)
}

const stopRefreshingUsers = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = undefined
  }
}

const isEditMode = (userId: number | undefined) => {
  return userId === editModeForUserId.value
}

const enterEditMode = (user: User) => {
  editModeForUserId.value = user.id
  originalScore.value = user.score
  editedScore.value = user.score
}

const saveScore = (user: User) => {
  if (editedScore.value !== undefined) {
    const userInStore = userStore.users.find(u => u.id === user.id)
    if (userInStore) {
      userStore.updateUserScore(user.id, editedScore.value)
    }
  }
  user.score = user.score

  editModeForUserId.value = undefined
  originalScore.value = undefined
  editedScore.value = undefined 
}

const cancelEdit = (user: User) => {
  if (originalScore.value !== undefined && user.id === editModeForUserId.value) {
    user.score = originalScore.value
  }
  editModeForUserId.value = undefined
  originalScore.value = undefined
  editedScore.value = undefined
}
</script>

<style scoped>
table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
    box-shadow: 0px 10px 10px 1px rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    overflow: hidden;
}

thead {
    background-color: #89a8d0;
}

th {
    padding: 12px 15px;
    text-align: center;
    font-weight: bold;
    color: #333;
    border-bottom: 2px solid #ddd;
}

td {
    padding: 10px 15px;
    border-bottom: 1px solid #eee;
    color: #555;
}

tr {
    height: 70px;
}

tr:nth-child(even) {
    background-color: #f9f9f9;
}

tr:hover {
    background-color: #dbdde9;
    cursor: pointer;
}

tr.highlighted-row {
    background-color: #fff3cd !important;
    color: #856404;
}


td input[type="number"] {
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1em;
    transition: border-color 0.2s ease-in-out;
}

td input[type="number"]:focus {
    border-color: #007bff;
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

input[type="number"] {
    width: 100%;
    max-width: 80px;
}

td button {
    padding: 6px 12px;
    margin-right: 5px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
    transition: background-color 0.2s ease-in-out;
}

td button:last-child {
    margin-right: 0;
}

td small {
  font-size: 0.5em;
  color: #777;
  vertical-align: middle;
  white-space: nowrap;
}

td button:not(.save-button):not(.cancel-button) {
    background-color: #1b6cb4;
    color: white;
}
td button:not(.save-button):not(.cancel-button):hover {
    background-color: #5a6268;
}

td button.save-button {
    background-color: #28a745;
    color: white;
}
td button.save-button:hover {
    background-color: #218838;
}

td button.cancel-button {
    background-color: #dc3545;
    color: white;
}
td button.cancel-button:hover {
    background-color: #c82333;
}

.column-score {
  width: 135px;
}

.column-actions {
  width: 200px;
}

.text-left {
  text-align: left;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.empty-state-cell {
  text-align: center;
  padding: 20px;
  color: #777;
  font-style: italic;
}

.loading-spinner-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.loading-spinner {
  border: 6px solid #f3f3f3;
  border-top: 6px solid #3498db;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
}

.filter-container {
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-start;
}

.filter-input {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1em;
  width: 100%;
  max-width: 400px;
  box-sizing: border-box;
}

.filter-input:focus {
  border-color: #007bff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>