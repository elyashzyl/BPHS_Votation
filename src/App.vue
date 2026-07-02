<template>
  <div v-if="state.loading" class="loading-screen">
    <div class="spinner"></div>
    <p>Loading election data...</p>
  </div>

  <template v-if="!state.loading">
    <router-view />

    <ChatBot />
  </template>
</template>

<script setup>
import { onMounted } from 'vue'
import { state, initApp } from './store/index.js'
import ChatBot from './components/ChatBot.vue'

onMounted(async () => {
  await initApp()
})
</script>
