<template>
  <div class="controls">
    <button id="loadTemplateBtn" v-if="props.currentStage === 'initial' || props.currentStage === 'compared'" @click="triggerFileInput">Load your template picture</button>
    <input type="file" id="templateInput" ref="templateFileInputRef" @change="handleFileSelected" accept="image/*" style="display: none;">
    <button id="pickPredefinedBtn" v-if="props.currentStage === 'initial' || props.currentStage === 'compared'" @click="toggleThumbnails">Pick one of ours</button>
    
    <button id="save1Btn" v-if="props.currentStage === 'drawing1'" @click="emit('save-drawing-1')">Save first drawing</button>
    <button id="start2Btn" v-if="props.currentStage === 'readyForDrawing2'" @click="emit('start-drawing-2')">Start second drawing</button>
    <button id="save2Btn" v-if="props.currentStage === 'drawing2'" @click="emit('save-drawing-2')">Save second drawing & compare</button>
    
    <button id="clearBtn" v-if="props.currentStage === 'drawing1' || props.currentStage === 'drawing2'" @click="clearDrawing">Clear drawing</button>
    
    <button id="restartBtn" v-if="['drawing1', 'readyForDrawing2', 'drawing2'].includes(props.currentStage)" @click="emit('restart-process')">Restart this drawing pair</button>
    <!-- "Clear all saved results" and "Toggle Theme" buttons moved to TopNavbar.vue -->
  </div>
</template>

<script setup>
// Vue 3 Composition API
// defineEmits and defineProps are compiler macros and do not need to be imported.
import { ref } from 'vue';

// eslint-disable-next-line no-undef
const props = defineProps({
  currentStage: String,
  canClearAll: Boolean
});

// eslint-disable-next-line no-undef
const emit = defineEmits([
  'toggle-thumbnails', 
  'clear-drawing', 
  'save-drawing-1', 
  'start-drawing-2', 
  'save-drawing-2',
  'restart-process',
  // 'clear-all-results', // Handled by TopNavbar
  'template-file-selected'
  // 'toggle-theme' // Handled by TopNavbar
]);

const templateFileInputRef = ref(null);

function triggerFileInput() {
  templateFileInputRef.value?.click();
}

function handleFileSelected(event) {
  const file = event.target.files[0];
  if (file) {
    emit('template-file-selected', file);
  }
}

function toggleThumbnails() {
  emit('toggle-thumbnails');
}

function clearDrawing() {
  emit('clear-drawing');
}
// Other event emitting functions will be called directly in the template for simplicity now
</script>

<style scoped>
/* Scoped styles for Controls.vue if needed. 
   Most styles are global from assets/style.css */
.controls {
  /* Ensure it matches the global style or override if necessary */
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
}

.controls button {
  padding: 10px 15px;
  cursor: pointer;
  min-width: 120px;
  text-align: center;
  flex-grow: 1;
}
</style>
