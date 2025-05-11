<template>
  <nav class="top-navbar">
    <h1 class="navbar-title">On the other hand</h1>
    <div class="navbar-actions">
      <button 
        @click="emit('toggle-theme')" 
        class="theme-toggle-btn"
        :aria-label="props.currentTheme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'"
        :title="props.currentTheme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'"
        :aria-pressed="props.currentTheme === 'dark'"
      >
        <span v-if="props.currentTheme === 'light'">☀️</span>
        <span v-else>🌙</span>
      </button>
      <button 
        v-if="props.canClearAll" 
        @click="emit('clear-all-results')" 
        class="clear-all-btn"
        aria-label="Clear all saved comparison results"
        title="Clear all saved comparison results"
      >
        🗑️
      </button>
    </div>
  </nav>
</template>

<script setup>
// eslint-disable-next-line no-undef
const props = defineProps({
  currentTheme: String,
  canClearAll: Boolean
});

// eslint-disable-next-line no-undef
const emit = defineEmits(['toggle-theme', 'clear-all-results']);
</script>

<style scoped>
.top-navbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  background-color: var(--button-bg-light); /* Use theme variables */
  padding: 8px 15px; /* Adjusted padding for better balance */
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  z-index: 1000; 
  display: flex;
  justify-content: space-between; /* Space out title and actions */
  align-items: center;
  box-sizing: border-box; /* Ensure padding is included in width calculation */
}

.navbar-title {
  font-size: 1.5em;
  margin: 0;
  color: var(--header-color-light);
}

body.dark-mode .navbar-title {
  color: var(--header-color-dark);
}

.navbar-actions {
  display: flex;
  gap: 10px;
}

body.dark-mode .top-navbar {
  background-color: var(--button-bg-dark);
  box-shadow: 0 2px 4px rgba(255,255,255,0.05);
}

.top-navbar button { /* Applies to buttons within .navbar-actions implicitly */
  background: none;
  border: 1px solid transparent; /* Make border transparent initially */
  color: var(--button-text-light);
  font-size: 1.5em; /* Larger for icon buttons */
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 5px;
  line-height: 1; /* Ensure icon is centered well */
}

body.dark-mode .top-navbar button {
  color: var(--button-text-dark);
}

.top-navbar button:hover {
  border-color: var(--button-border-light); /* Show border on hover */
  background-color: rgba(0,0,0,0.05);
}

body.dark-mode .top-navbar button:hover {
  border-color: var(--button-border-dark);
  background-color: rgba(255,255,255,0.1);
}
</style>
