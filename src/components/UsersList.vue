<template>
  <div class="user-list-container">
    <div v-if="userStore.isLoading" class="loading-spinner-overlay">
      <div class="loading-spinner"></div>
    </div>

    <div v-if="userStore.hasError && !userStore.isLoading" class="error-message">
      <p>⚠️ Error: {{ userStore.errorMsg }}</p> </div>

    <div v-if="!userStore.isLoading && !userStore.hasError">
      <div class="filter-container" v-if="userStore.totalUsersInSystem > 0">
        <input
          type="text"
          :value="userStore.searchQuery"
          @input="userStore.setSearchQuery(($event.target as HTMLInputElement).value)"
          placeholder="Filter by name (all users)..."
          class="filter-input"
        />
      </div>

      <div v-if="userStore.totalUsersInSystem > 0 || userStore.searchQuery" class="users">
        <p>Total Users in System: {{ userStore.totalUsersInSystem }}</p>
        <p v-if="userStore.searchQuery">
          Found: {{ userStore.currentFilteredUserCount }} matching user(s) in total
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
            <tr v-for="user in userStore.displayUsers" :key="user.id" :class="{ 'highlighted-row': isRecentlyUpdated(user.id) }">
              <td class="text-left">
                <div>{{ user.rank }}</div> <template v-if="isRecentlyUpdated(user.id)">
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
            <tr v-if="userStore.displayUsers.length === 0 && userStore.currentFilteredUserCount === 0 && userStore.searchQuery">
              <td colspan="4" class="empty-state-cell">No users match your filter "{{ userStore.searchQuery }}".</td>
            </tr>
            <tr v-if="userStore.displayUsers.length === 0 && userStore.currentFilteredUserCount > 0">
                <td colspan="4" class="empty-state-cell">No users on this page (try previous pages).</td>
            </tr>
          </tbody>
        </table>

        <div class="pagination-controls" v-if="userStore.totalPages > 1">
          <button @click="userStore.setCurrentPage(userStore.currentPage - 1)" :disabled="userStore.currentPage === 1">
            Previous
          </button>
          <span>Page {{ userStore.currentPage }} of {{ userStore.totalPages }}</span>
          <button @click="userStore.setCurrentPage(userStore.currentPage + 1)" :disabled="userStore.currentPage === userStore.totalPages">
            Next
          </button>
        </div>
        <div class="pagination-controls" v-if="userStore.totalPages > 1 && userStore.totalPages < 10">
            Page:
            <button
                v-for="pageNumber in pageNavigationRange"
                :key="pageNumber"
                @click="goToPage(pageNumber)"
                :class="{ 'current-page-button': pageNumber === userStore.currentPage }"
                :disabled="pageNumber === '...'"
                class="page-number-button"
            >
                {{ pageNumber }}
            </button>
        </div>
      </div>

      <div v-if="!userStore.isLoading && userStore.totalUsersInSystem === 0 && !userStore.searchQuery" class="no-users-found">
        <p>🤷 No users found in the system.</p>
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
const secondsToRefresh = 30
let refreshInterval: ReturnType<typeof setInterval> | undefined

onMounted(async () => {
  if (userStore.totalUsersInSystem === 0) {
    await userStore.fetchUsers()
  }
  startRefreshingUsers()
})

onUnmounted(() => {
  stopRefreshingUsers()
})

const startRefreshingUsers = () => {
  if (refreshInterval) clearInterval(refreshInterval)
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

const isEditMode = (userId: number | undefined): boolean => {
  return userId === editModeForUserId.value
}

const enterEditMode = (user: User) => {
  editModeForUserId.value = user.id
  originalScore.value = user.score
  editedScore.value = user.score
}

const saveScore = (user: User) => {
  if (editedScore.value !== undefined) {
    userStore.updateUserScore(user.id, editedScore.value)
  }
  editModeForUserId.value = undefined
  originalScore.value = undefined
  editedScore.value = undefined
}

const cancelEdit = (user: User) => {
  editModeForUserId.value = undefined
  originalScore.value = undefined
  editedScore.value = undefined
}

const goToPage = (pageNumber: number | string) => {
  if (typeof pageNumber === 'number') {
    userStore.setCurrentPage(pageNumber)
  }
}

const pageNavigationRange = computed(() => {
  const delta = 2
  const left = userStore.currentPage - delta
  const right = userStore.currentPage + delta + 1
  const range: number[] = []
  const rangeWithDots: (number | string)[] = []
  let l: number | undefined

  if (userStore.totalPages === 0) return []

  for (let i = 1; i <= userStore.totalPages; i++) {
    if (i === 1 || i === userStore.totalPages || (i >= left && i < right)) {
      range.push(i)
    }
  }

  for (const i of range) {
    if (l !== undefined) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1)
      } else if (i - l !== 1) {
        rangeWithDots.push('...')
      }
    }
    rangeWithDots.push(i)
    l = i
  }
  return rangeWithDots
})
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

.pagination-controls {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pagination-controls button {
  padding: 8px 12px;
  border: 1px solid #ccc;
  background-color: #f9f9f9;
  color: #333;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.pagination-controls button:hover:not(:disabled) {
  background-color: #e9e9e9;
}

.pagination-controls button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.pagination-controls button.current-page-button {
  font-weight: bold;
  border-color: #1b6cb4;
  background-color: #1b6cb4;
  color: white;
}

.pagination-controls button.page-number-button:disabled {
  border: none;
  background: none;
  opacity: 1;
  color: #333;
  cursor: default;
  padding: 8px 4px;
}

.pagination-controls span {
    margin: 0 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>