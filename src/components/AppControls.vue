<template>
  <div class="controls">
    <button id="loadTemplateBtn" v-if="props.currentStage === 'initial' || props.currentStage === 'compared'" @click="triggerFileInput">Upload Template</button>
    <input type="file" id="templateInput" ref="templateFileInputRef" @change="handleFileSelected" accept="image/*" style="display: none;">
    <button id="pickPredefinedBtn" v-if="props.currentStage === 'initial' || props.currentStage === 'compared'" @click="toggleThumbnails">Select Template</button>
    
    <button id="save1Btn" v-if="props.currentStage === 'drawing1'" @click="emit('save-drawing-1')">Save Drawing 1</button>
    <button id="start2Btn" v-if="props.currentStage === 'readyForDrawing2'" @click="emit('start-drawing-2')">Start Drawing 2</button>
    <button id="save2Btn" v-if="props.currentStage === 'drawing2'" @click="emit('save-drawing-2')">Save & Compare</button>
    
    <button 
      id="eraserBtn" 
      v-if="props.currentStage === 'drawing1' || props.currentStage === 'drawing2'" 
      @click="toggleEraser" 
      :class="{ 'active': isEraserActive }"
      aria-label="Toggle Eraser"
      title="Toggle Eraser"
    >
      ✏️ <span v-if="isEraserActive">(Eraser On)</span><span v-else>(Pen On)</span>
    </button>
    <button id="undoBtn" v-if="props.currentStage === 'drawing1' || props.currentStage === 'drawing2'" @click="emit('undo-drawing')" :disabled="!props.canUndo" title="Undo">↩️ Undo</button>
    <button id="redoBtn" v-if="props.currentStage === 'drawing1' || props.currentStage === 'drawing2'" @click="emit('redo-drawing')" :disabled="!props.canRedo" title="Redo">↪️ Redo</button>
    <button id="clearBtn" v-if="props.currentStage === 'drawing1' || props.currentStage === 'drawing2'" @click="clearDrawing">Clear Current</button>
    
    <button id="restartBtn" v-if="['drawing1', 'readyForDrawing2', 'drawing2'].includes(props.currentStage)" @click="emit('restart-process')">Restart Pair</button>
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
  canClearAll: Boolean,
  isEraserEnabled: Boolean,
  canUndo: Boolean, // New prop
  canRedo: Boolean  // New prop
});

// eslint-disable-next-line no-undef
const emit = defineEmits([
  'toggle-thumbnails', 
  'clear-drawing', 
  'save-drawing-1', 
  'start-drawing-2', 
  'save-drawing-2',
  'restart-process',
  'template-file-selected',
  'toggle-eraser',
  'undo-drawing', // New event
  'redo-drawing'  // New event
]);

const templateFileInputRef = ref(null);
const isEraserActive = ref(props.isEraserEnabled);

watch(() => props.isEraserEnabled, (newValue) => {
  isEraserActive.value = newValue;
});

function toggleEraser() {
  isEraserActive.value = !isEraserActive.value;
  emit('toggle-eraser', isEraserActive.value);
}

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
  padding: 10px 15px; /* Keep existing padding */
  cursor: pointer;
  /* min-width: 120px; /* Let content define width more, or adjust fixed width */
  width: 160px; /* Re-apply fixed width as per earlier decision */
  height: 50px; /* Re-apply fixed height */
  text-align: center;
  /* flex-grow: 1; /* Remove if fixed width is desired */
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
  border: 1px solid var(--button-border-light); /* Use CSS variables */
  background-color: var(--button-bg-light);
  color: var(--button-text-light);
}

.controls button.active {
  background-color: var(--text-color-light); /* Example active style */
  color: var(--bg-color-light);
  border-color: var(--text-color-light);
}

body.dark-mode .controls button.active {
  background-color: var(--text-color-dark);
  color: var(--bg-color-dark);
  border-color: var(--text-color-dark);
}
</style>
