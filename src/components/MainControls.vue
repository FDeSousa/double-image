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
      <div class="drawing-tools-super-group"> <!-- New overall container -->
        <div class="primary-drawing-tools"> <!-- Group for pen, eraser, slider -->
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
          <label for="brushSizeSlider" class="sr-only">Size:</label> 
          <div class="brush-preview-wrapper">
            <canvas ref="pestleBackgroundCanvas" width="100" height="50" class="pestle-bg"></canvas>
            <canvas ref="brushIndicatorCanvas" width="100" height="50" class="brush-indicator"></canvas>
          </div>
          <input 
            type="range" 
            id="brushSizeSlider" 
            min="1" 
            max="10"
            :value="props.currentBrushSize" 
            @input="onBrushSizeChange"
            aria-label="Brush Size"
            title="Brush Size"
          />
          <span aria-hidden="true">{{ props.currentBrushSize }}</span>
        </div>
        </div> <!-- End of primary-drawing-tools -->
        <div class="action-drawing-tools"> <!-- Group for undo, redo, clear -->
          <button id="undoBtn" @click="emit('undo-drawing')" :disabled="!props.canUndo" title="Undo" class="tool-button icon-only">↩️</button>
          <button id="redoBtn" @click="emit('redo-drawing')" :disabled="!props.canRedo" title="Redo" class="tool-button icon-only">↪️</button>
          <button id="clearCurrentBtn" @click="emit('clear-drawing')" title="Clear Current Drawing" class="tool-button icon-only">🗑️</button>
        </div> <!-- End of action-drawing-tools -->
      </div> <!-- End of drawing-tools-super-group -->
    </template>

    <button id="restartBtn" v-if="['drawing1', 'readyForDrawing2', 'drawing2', 'compared'].includes(props.currentStage) && props.currentStage !== 'initial'" @click="emit('restart-process')">Restart Pair</button>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';

// eslint-disable-next-line no-undef
const props = defineProps({
  currentStage: String,
  isEraserEnabled: Boolean,
  canUndo: Boolean,
  canRedo: Boolean,
  currentBrushSize: {
    type: Number,
    default: 2
  },
  currentTheme: String
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
const pestleBackgroundCanvas = ref(null);
const brushIndicatorCanvas = ref(null);
let bgCtx = null;
let indicatorCtx = null;

const MIN_BRUSH_SIZE = 1;
const MAX_BRUSH_SIZE = 10;

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
  let newSize = parseInt(event.target.value, 10);
  newSize = Math.max(MIN_BRUSH_SIZE, Math.min(newSize, MAX_BRUSH_SIZE)); 
  emit('set-brush-size', newSize);
}

function drawPestleBackground() {
  if (!bgCtx || !pestleBackgroundCanvas.value) return;
  const canvas = pestleBackgroundCanvas.value;
  const ctx = bgCtx;
  const width = canvas.width;
  const height = canvas.height;
  // console.log('drawPestleBackground called. Theme:', props.currentTheme); // Debug

  ctx.clearRect(0, 0, width, height);
  const xPadding = 5; 
  const yCenter = height / 2;
  const pestleMinDisplayRadius = Math.max(1, MIN_BRUSH_SIZE / 2) + 2; 
  const pestleMaxDisplayRadius = Math.min(height / 2 * 0.9, MAX_BRUSH_SIZE / 2 + 2) ; 

  const leftCapCenterX = xPadding + pestleMinDisplayRadius;
  const rightCapCenterX = width - xPadding - pestleMaxDisplayRadius;

  ctx.beginPath();
  ctx.arc(leftCapCenterX, yCenter, pestleMinDisplayRadius, Math.PI * 0.5, Math.PI * 1.5, false);
  ctx.lineTo(rightCapCenterX, yCenter - pestleMaxDisplayRadius);
  ctx.arc(rightCapCenterX, yCenter, pestleMaxDisplayRadius, Math.PI * 1.5, Math.PI * 0.5, false);
  ctx.closePath();
  
  ctx.fillStyle = props.currentTheme === 'dark' ? '#4a6177' : '#e0e0e0'; 
  ctx.fill();
}

function updateBrushPreview() {
  if (!indicatorCtx || !brushIndicatorCanvas.value) return;
  const canvas = brushIndicatorCanvas.value;
  const ctx = indicatorCtx;
  const width = canvas.width;
  const height = canvas.height;
  const currentSize = props.currentBrushSize;
  // console.log('updateBrushPreview called. Size:', currentSize); // Debug

  ctx.clearRect(0, 0, width, height);

  const range = MAX_BRUSH_SIZE - MIN_BRUSH_SIZE;
  const percent = range === 0 ? 0 : (currentSize - MIN_BRUSH_SIZE) / range;
  
  const circleRadiusPx = currentSize / 2; 
  const strokeWidth = 1.5; 
  const visualRadius = Math.max(0.5, Math.min(circleRadiusPx, (height / 2) - strokeWidth));
  const trackPadding = 5; 

  const currentCircleTrackStartX = trackPadding + visualRadius;
  const currentCircleTrackEndX = width - trackPadding - visualRadius;
  
  let circleCenterX = currentCircleTrackStartX;
  if (currentCircleTrackEndX > currentCircleTrackStartX) {
    circleCenterX = currentCircleTrackStartX + percent * (currentCircleTrackEndX - currentCircleTrackStartX);
  }
  const circleCenterY = height / 2;

  ctx.beginPath();
  ctx.arc(circleCenterX, circleCenterY, visualRadius, 0, 2 * Math.PI);
  
  ctx.strokeStyle = props.currentTheme === 'dark' ? 'rgba(236, 240, 241, 0.8)' : 'rgba(0, 0, 0, 0.8)'; 
  ctx.lineWidth = strokeWidth;
  ctx.stroke();
}

function setupPreviewCanvases() {
  // console.log(`setupPreviewCanvases called for stage: ${props.currentStage}. Refs: bg=${!!pestleBackgroundCanvas.value}, ind=${!!brushIndicatorCanvas.value}`); // Debug
  
  if (pestleBackgroundCanvas.value) {
    bgCtx = pestleBackgroundCanvas.value.getContext('2d'); 
    // console.log('bgCtx re-initialized:', !!bgCtx); // Debug
    if (bgCtx) drawPestleBackground();
    // else console.error('Failed to get pestleBackgroundCanvas context in setup.'); // Debug
  } else if (props.currentStage === 'drawing1' || props.currentStage === 'drawing2') { // Log error only if expected to be visible
    console.error('pestleBackgroundCanvas ref is null in setupPreviewCanvases when it should be visible.');
  }

  if (brushIndicatorCanvas.value) {
    indicatorCtx = brushIndicatorCanvas.value.getContext('2d'); 
    // console.log('indicatorCtx re-initialized:', !!indicatorCtx); // Debug
    if (indicatorCtx) updateBrushPreview();
    // else console.error('Failed to get brushIndicatorCanvas context in setup.'); // Debug
  } else if (props.currentStage === 'drawing1' || props.currentStage === 'drawing2') { // Log error only if expected to be visible
    console.error('brushIndicatorCanvas ref is null in setupPreviewCanvases when it should be visible.');
  }
}

onMounted(() => {
  // console.log(`MainControls onMounted. Initial stage: ${props.currentStage}`); // Debug
  if (props.currentStage === 'drawing1' || props.currentStage === 'drawing2') {
    nextTick(() => {
        // console.log('onMounted: Attempting setupPreviewCanvases after nextTick.'); // Debug
        setupPreviewCanvases();
    });
  }
});

watch(() => props.currentBrushSize, () => { // Removed newSize as it's not used
  // console.log('Watched currentBrushSize changed to:', props.currentBrushSize); // Debug
  if (indicatorCtx) { 
    updateBrushPreview();
  } 
  // else { // console.warn('indicatorCtx not ready in currentBrushSize watcher.');} // Debug
});

watch(() => props.currentTheme, () => { // Removed newTheme as it's not used
  // console.log('Watched currentTheme changed to:', props.currentTheme); // Debug
  if (bgCtx && indicatorCtx) { 
    drawPestleBackground(); 
    updateBrushPreview();   
  } 
  // else { // console.warn('Contexts not ready in currentTheme watcher.');} // Debug
});

watch(() => props.currentStage, async (newStage) => { // Removed unused oldStage
  // console.log(`Watched currentStage changed to: ${newStage}`); // Debug
  if ((newStage === 'drawing1' || newStage === 'drawing2')) {
    await nextTick(); 
    // console.log('Stage changed to drawing, attempting to setup/redraw preview canvases via nextTick.'); // Debug
    setupPreviewCanvases(); 
  }
});
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
  box-sizing: border-box; 
}

.drawing-tools-super-group {
  display: flex;
  flex-direction: column; /* Stack primary and action tools vertically */
  align-items: center; /* Center the groups */
  width: 100%;
  gap: 10px; /* Gap between primary and action tool groups */
  padding: 5px 0; 
  border-top: 1px solid var(--border-color-light); 
  margin-top: 10px; 
}

body.dark-mode .drawing-tools-super-group {
  border-top-color: var(--border-color-dark);
}

.primary-drawing-tools,
.action-drawing-tools {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 10px;
  width: 100%; /* Allow internal items to use full width for wrapping */
}

/* Remove border-top from the old .drawing-tools-group if it's no longer needed or repurpose */
/* For now, the border is on .drawing-tools-super-group */


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

/* Style for icon-only buttons in both primary and action tool groups */
.primary-drawing-tools .tool-button.icon-only,
.action-drawing-tools .tool-button.icon-only {
  min-width: 40px; 
  width: 40px;   
  padding: 8px;  
  font-size: 1.2em; 
  flex-grow: 0; /* Prevent these buttons from growing */
  flex-basis: 40px; /* Set a fixed basis */
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
  flex-grow: 0; /* Don't let slider container grow excessively, allow space for preview */
  justify-content: center;
  margin-left: 10px; /* Space it from the preview */
}

.brush-preview-wrapper {
  position: relative;
  width: 100px; /* Match canvas width */
  height: 50px; /* Match canvas height */
  margin-right: 5px; /* Space between preview and slider input */
}

.brush-preview-wrapper canvas {
  position: absolute;
  top: 0;
  left: 0;
}

body.dark-mode .slider-container {
  color: var(--text-color-dark);
}

.slider-container input[type="range"] {
  width: 100px; 
  flex-shrink: 1; 
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
