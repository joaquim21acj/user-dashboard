<script  setup lang="ts">
import UsersList from '../components/UsersList.vue'
</script>
<template>
  <main>
    <h1>Users</h1>
    <div class="users-view">
      <UsersList />
    </div>
  </main>
</template>

<style>

main {
  width: 100%;
  min-height: 1000px;
  background-color: #f4f4f4;
  border-radius: 20px;
  padding: 40px;
  margin: 10px;
  box-shadow: 0px 10px 25px 1px rgba(0, 0, 0, 0.3);
}

@media (max-width: 768px) {
  main {
    padding: 20px;
    margin: 0;
  }
}
</style>