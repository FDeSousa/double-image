<template>
  <div class="main-controls-container">
    <!-- Stage: initial or compared -->
    <template v-if="props.currentStage === 'initial' || props.currentStage === 'compared'">
      <button id="loadTemplateBtn" @click="triggerFileInput">Upload Template</button>
      <input type="file" id="templateInput" ref="templateFileInputRef" @change="handleFileSelected" accept="image/*" style="display: none;">
      <button id="pickPredefinedBtn" @click="emit('toggle-thumbnails')">Select Template</button>
    </template>

    <!-- Stage: drawing1 -->
    <template v-if="props.currentStage === 'drawing1'">
      <button id="save1Btn" @click="emit('save-drawing-1')">Save Drawing 1</button>
    </template>

    <!-- Stage: readyForDrawing2 -->
    <template v-if="props.currentStage === 'readyForDrawing2'">
      <button id="start2Btn" @click="emit('start-drawing-2')">Start Drawing 2</button>
    </template>

    <!-- Stage: drawing2 -->
    <template v-if="props.currentStage === 'drawing2'">
      <button id="save2Btn" @click="emit('save-drawing-2')">Save & Compare</button>
    </template>
    
    <!-- Drawing Tools: visible during drawing1 or drawing2 -->
    <template v-if="props.currentStage === 'drawing1' || props.currentStage === 'drawing2'">
      <div class="drawing-tools-group">
        <button 
          id="penBtn"
          @click="selectTool('pen')"
          :class="{ 'active': !props.isEraserEnabled }"
          aria-label="Select Pen Tool"
          title="Pen Tool"
          class="tool-button icon-only"
        >
          ✏️
        </button>
        <button 
          id="eraserBtn" 
          @click="selectTool('eraser')" 
          :class="{ 'active': props.isEraserEnabled }"
          aria-label="Select Eraser Tool"
          title="Eraser Tool"
          class="tool-button icon-only"
        >
          🧼
        </button>
        <div class="slider-container">
          <label for="brushSizeSlider" class="sr-only">Size:</label> <!-- Screen-reader only label -->
          <input 
            type="range" 
            id="brushSizeSlider" 
            min="1" 
            max="50" 
            :value="props.currentBrushSize" 
            @input="onBrushSizeChange"
            aria-label="Brush Size"
            title="Brush Size"
          />
          <span aria-hidden="true">{{ props.currentBrushSize }}px</span> <!-- Hide from screen reader, label is enough -->
        </div>
        <button id="undoBtn" @click="emit('undo-drawing')" :disabled="!props.canUndo" title="Undo" class="tool-button icon-only">↩️</button>
        <button id="redoBtn" @click="emit('redo-drawing')" :disabled="!props.canRedo" title="Redo" class="tool-button icon-only">↪️</button>
        <button id="clearCurrentBtn" @click="emit('clear-drawing')" title="Clear Current Drawing" class="tool-button icon-only">🗑️</button>
      </div>
    </template>

    <!-- Restart Pair: visible during drawing stages or after comparison, but not initial -->
    <button id="restartBtn" v-if="['drawing1', 'readyForDrawing2', 'drawing2', 'compared'].includes(props.currentStage) && props.currentStage !== 'initial'" @click="emit('restart-process')">Restart Pair</button>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// eslint-disable-next-line no-undef
const props = defineProps({
  currentStage: String,
  isEraserEnabled: Boolean,
  canUndo: Boolean,
  canRedo: Boolean,
  currentBrushSize: {
    type: Number,
    default: 2
  }
});

// eslint-disable-next-line no-undef
const emit = defineEmits([
  'toggle-thumbnails',
  'save-drawing-1',
  'start-drawing-2',
  'save-drawing-2',
  'restart-process',
  'template-file-selected',
  'toggle-eraser',
  'undo-drawing',
  'redo-drawing',
  'clear-drawing',
  'set-brush-size'
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

function selectTool(tool) {
  if (tool === 'pen') {
    emit('toggle-eraser', false);
  } else if (tool === 'eraser') {
    emit('toggle-eraser', true);
  }
}

function onBrushSizeChange(event) {
  emit('set-brush-size', parseInt(event.target.value, 10));
}
</script>

<style scoped>
.main-controls-container {
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px; /* Consistent gap for all buttons/groups */
  align-items: center;
  justify-content: center;
  max-width: 500px; 
  width: 100%; 
  margin-left: auto;
  margin-right: auto;
  padding: 10px;
  box-sizing: border-box; /* Include padding in width calculation */
}

.drawing-tools-group {
  display: flex;
  flex-wrap: wrap; /* Allow tools to wrap if needed */
  gap: 10px;
  align-items: center;
  justify-content: center;
  width: 100%; /* Take full width to allow internal wrapping */
  padding: 5px 0; /* Add some padding if tools wrap to new line */
  border-top: 1px solid var(--border-color-light); /* Separator if on new line */
  margin-top: 10px; /* Separator if on new line */
}

body.dark-mode .drawing-tools-group {
  border-top-color: var(--border-color-dark);
}


/* General button styling */
.main-controls-container button {
  padding: 8px 12px; 
  cursor: pointer;
  width: auto; 
  min-width: 120px; /* Default min-width for text buttons */
  height: 40px; 
  text-align: center;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
  border: 1px solid var(--button-border-light);
  background-color: var(--button-bg-light);
  color: var(--button-text-light);
  border-radius: 4px;
  flex-grow: 1; 
  flex-basis: 120px; 
}

.drawing-tools-group button.tool-button.icon-only {
  min-width: 40px; /* Compact width for icon-only */
  width: 40px;   /* Fixed width for icon-only */
  padding: 8px;  /* Adjust padding for icons */
  font-size: 1.2em; /* Make icons a bit larger if needed */
  flex-grow: 0; /* Don't allow icon buttons to grow excessively */
  flex-basis: auto; /* Reset flex-basis for icon buttons */
}


/* Specific width for workflow buttons can remain or be adjusted */
#loadTemplateBtn, #pickPredefinedBtn, #save1Btn, #start2Btn, #save2Btn, #restartBtn {
   /* width: 160px; */ 
}


.main-controls-container button.active {
  background-color: var(--text-color-light);
  color: var(--bg-color-light);
  border-color: var(--text-color-light);
}

body.dark-mode .main-controls-container button {
  border-color: var(--button-border-dark);
  background-color: var(--button-bg-dark);
  color: var(--button-text-dark);
}

body.dark-mode .main-controls-container button.active {
  background-color: var(--text-color-dark);
  color: var(--bg-color-dark);
  border-color: var(--text-color-dark);
}

.main-controls-container button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-color);
  padding: 0 5px; /* Adjusted padding */
  flex-grow: 1; /* Allow slider container to take available space */
  justify-content: center;
}

body.dark-mode .slider-container {
  color: var(--text-color-dark);
}

.slider-container input[type="range"] {
  width: 100px; 
  flex-shrink: 1; /* Allow slider to shrink if space is tight */
}

.slider-container span {
  min-width: 35px; /* Space for "50px" */
  text-align: right;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
