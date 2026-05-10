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
      <button id="save1Btn" @click="emit('save-drawing-1')" title="Save your first drawing and prepare for drawing 2">Finish Drawing 1</button>
    </template>

    <!-- Stage: readyForDrawing2 -->
    <template v-if="props.currentStage === 'readyForDrawing2'">
      <button id="start2Btn" @click="emit('start-drawing-2')" title="Begin drawing the second version">Start Drawing 2</button>
    </template>

    <!-- Stage: drawing2 -->
    <template v-if="props.currentStage === 'drawing2'">
      <button id="save2Btn" @click="emit('save-drawing-2')" title="Save your second drawing and compare both">Finish Drawing 2</button>
    </template>
    
    <!-- Drawing Tools: visible during drawing1 or drawing2 -->
    <template v-if="props.currentStage === 'drawing1' || props.currentStage === 'drawing2'">
      <div class="drawing-tools-super-group">
        <div class="primary-drawing-tools">
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
            <label for="brushSizeSlider" class="sr-only">Brush Size Control:</label>
            <div class="brush-preview-wrapper" ref="previewWrapperRef" tabindex="0" 
                 @mousedown="handlePreviewMouseDown"
                 @touchstart.prevent="handlePreviewTouchStart"
                 @keydown="handleSliderKeyDown"
                 aria-label="Brush size slider" role="slider"
                 :aria-valuenow="props.currentBrushSize"
                 :aria-valuemin="MIN_BRUSH_SIZE"
                 :aria-valuemax="MAX_BRUSH_SIZE"
                 :aria-valuetext="`Brush size ${props.currentBrushSize}`"
            >
              <canvas ref="pestleBackgroundCanvas" width="100" height="50" class="pestle-bg"></canvas>
              <canvas ref="brushIndicatorCanvas" width="100" height="50" class="brush-indicator"></canvas>
            </div>
            <span aria-hidden="true">{{ props.currentBrushSize }}</span>
          </div>
        </div> 
        <div class="action-drawing-tools"> 
          <button id="undoBtn" @click="emit('undo-drawing')" :disabled="!props.canUndo" title="Undo" class="tool-button icon-only">↩️</button>
          <button id="redoBtn" @click="emit('redo-drawing')" :disabled="!props.canRedo" title="Redo" class="tool-button icon-only">↪️</button>
          <button id="clearCurrentBtn" @click="emit('clear-drawing')" title="Clear Current Drawing" class="tool-button icon-only">🗑️</button>
        </div> 
      </div> 
    </template>

    <button id="restartBtn" v-if="['drawing1', 'readyForDrawing2', 'drawing2', 'compared'].includes(props.currentStage) && props.currentStage !== 'initial'" @click="confirmRestart" title="Discard current drawings and start a new pair">Start Over</button>
  </div>
</template>

<script setup>
const { defineProps, defineEmits, defineExpose } = require('vue'); // For testing purposes
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';

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
  'set-brush-size',
  'set-brush-size-debug' // Declare the debug emit
]);

const templateFileInputRef = ref(null);
const pestleBackgroundCanvas = ref(null);
const brushIndicatorCanvas = ref(null);
const previewWrapperRef = ref(null); 
let bgCtx = null;
let indicatorCtx = null;

const MIN_BRUSH_SIZE = 1;
const MAX_BRUSH_SIZE = 10;
const isDraggingPreviewSize = ref(false);

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

function drawPestleBackground() {
  if (!bgCtx || !pestleBackgroundCanvas.value) return;
  const canvas = pestleBackgroundCanvas.value;
  const ctx = bgCtx;
  const width = canvas.width;
  const height = canvas.height;
  
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

function updateSizeFromEvent(event, isTouchEvent = false) {
  if (!previewWrapperRef.value) return;
  
  const interactiveElement = previewWrapperRef.value;
  const rect = interactiveElement.getBoundingClientRect();
  const clientX = isTouchEvent ? event.touches[0].clientX : event.clientX;
  let relativeX = clientX - rect.left;

  const xPadding = 5; 
  const canvasDisplayWidth = 100; 
  const trackStartX = xPadding;
  const trackEndX = canvasDisplayWidth - xPadding;
  const trackWidth = trackEndX - trackStartX;

  relativeX = Math.max(trackStartX, Math.min(relativeX, trackEndX));

  let percent = 0;
  if (trackWidth > 0) {
    percent = (relativeX - trackStartX) / trackWidth;
  }

  const newRawSize = MIN_BRUSH_SIZE + percent * (MAX_BRUSH_SIZE - MIN_BRUSH_SIZE);
  const newSize = Math.round(newRawSize);
  const finalSize = Math.max(MIN_BRUSH_SIZE, Math.min(newSize, MAX_BRUSH_SIZE));

  // console.log(`[DEBUG] updateSizeFromEvent: finalSize=${finalSize}, props.currentBrushSize=${props.currentBrushSize}, condition=${finalSize !== props.currentBrushSize}`); // Debug line
  
  // emit('set-brush-size-debug', 'test-emit'); // REMOVE TEMPORARY DEBUG EMIT

  if (finalSize !== props.currentBrushSize) {
    emit('set-brush-size', finalSize);
  }
}

function handlePreviewMouseDown(event) {
  isDraggingPreviewSize.value = true;
  updateSizeFromEvent(event);
  window.addEventListener('mousemove', handlePreviewMouseMove);
  window.addEventListener('mouseup', handlePreviewMouseUp);
}

function handlePreviewMouseMove(event) {
  if (isDraggingPreviewSize.value) {
    updateSizeFromEvent(event);
  }
}

function handlePreviewMouseUp() {
  if (isDraggingPreviewSize.value) {
    isDraggingPreviewSize.value = false;
    window.removeEventListener('mousemove', handlePreviewMouseMove);
    window.removeEventListener('mouseup', handlePreviewMouseUp);
  }
}

function handlePreviewTouchStart(event) {
  isDraggingPreviewSize.value = true;
  updateSizeFromEvent(event, true);
  window.addEventListener('touchmove', handlePreviewTouchMove, { passive: false });
  window.addEventListener('touchend', handlePreviewTouchEnd);
  window.addEventListener('touchcancel', handlePreviewTouchEnd);
}

function handlePreviewTouchMove(event) {
  if (isDraggingPreviewSize.value) {
    event.preventDefault(); 
    updateSizeFromEvent(event, true);
  }
}

function handlePreviewTouchEnd() {
  if (isDraggingPreviewSize.value) {
    isDraggingPreviewSize.value = false;
    window.removeEventListener('touchmove', handlePreviewTouchMove);
    window.removeEventListener('touchend', handlePreviewTouchEnd);
    window.removeEventListener('touchcancel', handlePreviewTouchEnd);
  }
}

function handleSliderKeyDown(event) {
  let newSize = props.currentBrushSize;
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
    newSize = Math.min(MAX_BRUSH_SIZE, props.currentBrushSize + 1);
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
    newSize = Math.max(MIN_BRUSH_SIZE, props.currentBrushSize - 1);
  } else if (event.key === 'Home') {
    newSize = MIN_BRUSH_SIZE;
  } else if (event.key === 'End') {
    newSize = MAX_BRUSH_SIZE;
  } else {
    return;
  }
  event.preventDefault();
  if (newSize !== props.currentBrushSize) {
    emit('set-brush-size', newSize);
  }
}

function setupPreviewCanvases() {
  if (pestleBackgroundCanvas.value) {
    bgCtx = pestleBackgroundCanvas.value.getContext('2d'); 
    if (bgCtx) drawPestleBackground();
  } else if (props.currentStage === 'drawing1' || props.currentStage === 'drawing2') {
    // console.error('pestleBackgroundCanvas ref is null in setupPreviewCanvases when it should be visible.');
  }

  if (brushIndicatorCanvas.value) {
    indicatorCtx = brushIndicatorCanvas.value.getContext('2d'); 
    if (indicatorCtx) updateBrushPreview();
  } else if (props.currentStage === 'drawing1' || props.currentStage === 'drawing2') {
    // console.error('brushIndicatorCanvas ref is null in setupPreviewCanvases when it should be visible.');
  }
}

onMounted(() => {
  if (props.currentStage === 'drawing1' || props.currentStage === 'drawing2') {
    nextTick(setupPreviewCanvases);
  }
});

onUnmounted(() => {
  window.removeEventListener('mousemove', handlePreviewMouseMove);
  window.removeEventListener('mouseup', handlePreviewMouseUp);
  window.removeEventListener('touchmove', handlePreviewTouchMove);
  window.removeEventListener('touchend', handlePreviewTouchEnd);
  window.removeEventListener('touchcancel', handlePreviewTouchEnd);
});

watch(() => props.currentBrushSize, () => {
  if (indicatorCtx) updateBrushPreview();
});

watch(() => props.currentTheme, () => {
  if (bgCtx && indicatorCtx) { 
    drawPestleBackground(); 
    updateBrushPreview();   
  }
});

watch(() => props.currentStage, async (newStage) => {
  if ((newStage === 'drawing1' || newStage === 'drawing2')) {
    await nextTick(); 
    setupPreviewCanvases(); 
  }
});

function confirmRestart() {
  if (props.currentStage === 'drawing1' || props.currentStage === 'drawing2') {
    if (!window.confirm('Start over? Your current drawing will be lost.')) return;
  }
  emit('restart-process');
}

defineExpose({ isDraggingPreviewSize }); // Expose for testing
</script>

<style scoped>
.main-controls-container {
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
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
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 10px;
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
  width: 100%;
}

.main-controls-container button {
  padding: 8px 12px; 
  cursor: pointer;
  width: auto; 
  min-width: 0;
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
  flex: 1 1 auto;
}

.primary-drawing-tools .tool-button.icon-only,
.action-drawing-tools .tool-button.icon-only {
  min-width: 40px; 
  width: 40px;   
  padding: 8px;  
  font-size: 1.2em; 
  flex-grow: 0; 
  flex-basis: 40px; 
}

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
  padding: 0 5px;
  flex-grow: 0;
  justify-content: center;
  /* margin-left: 10px; */ 
}

.brush-preview-wrapper {
  position: relative;
  width: 100px; 
  height: 50px; 
  margin-right: 8px; 
  cursor: ew-resize; 
  touch-action: none; 
}

.brush-preview-wrapper canvas {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none; 
}

body.dark-mode .slider-container {
  color: var(--text-color-dark);
}

.slider-container span {
  min-width: 25px; 
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
