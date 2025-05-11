<template>
  <nav class="top-navbar">
    <button 
      @click="emit('toggle-theme')" 
      class="theme-toggle-btn"
      :aria-label="`Toggle to ${props.currentTheme === 'light' ? 'dark' : 'light'} mode`"
      :title="`Toggle to ${props.currentTheme === 'light' ? 'dark' : 'light'} mode`"
    >
      <span v-if="props.currentTheme === 'light'">☀️</span>
      <span v-else>🌙</span>
    </button>
    <button 
      v-if="props.canClearAll" 
      @click="emit('clear-all-results')" 
      class="clear-all-btn"
      aria-label="Clear all saved results"
      title="Clear all saved results"
    >
      🗑️
    </button>
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
  padding: 8px 15px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  z-index: 1000; /* Ensure it's above other content */
  display: flex;
  justify-content: flex-end; /* Align buttons to the right */
  gap: 10px;
}

body.dark-mode .top-navbar {
  background-color: var(--button-bg-dark);
  box-shadow: 0 2px 4px rgba(255,255,255,0.05);
}

.top-navbar button {
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
