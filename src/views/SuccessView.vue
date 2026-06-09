<template>
  <div class="success-page fade-in">
    <div class="success-card">
      <span class="success-icon">🎉</span>
      <h2>Thank You for Voting!</h2>
      <p class="text-muted">Your vote has been recorded.</p>
      <div class="mt-24" style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        <button class="btn btn-outline" @click="$router.push('/')">Home</button>
      </div>
    </div>
  </div>
</template>
