<template>
  <div id="drawingArea">
    <!-- Empty state when no template has been chosen yet -->
    <div v-if="!templateSrc && stage === 'initial'" class="empty-state" aria-hidden="true">
      <p>Pick a template above to start drawing</p>
    </div>
    <img 
      id="templateImage" 
      v-if="templateSrc && props.stage !== 'compared'" 
      :key="templateSrc" 
      :src="templateSrc" 
      alt="Template Image" 
      style="opacity: 0.3;"
    >
    <canvas
      id="drawingCanvas"
      ref="drawingCanvasRef"
      :aria-label="canvasAriaLabel"
    ></canvas>
  </div>
</template>

<script setup>
const { defineProps, defineEmits, defineExpose } = require('vue'); // For testing purposes
// Import necessary Vue functions and components
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  templateSrc: String,
  stage: String, 
  isEraserActive: Boolean,
  currentBrushSize: {
    type: Number,
    default: 2 
  }
});

const emit = defineEmits(['undo-state-changed']);

const canvasAriaLabel = computed(() => {
  const labels = {
    drawing1: 'Drawing canvas — draw your first image',
    drawing2: 'Drawing canvas — draw your second image',
    compared: 'Canvas showing combined drawings',
  };
  return labels[props.stage] || 'Drawing canvas';
});

const drawingCanvasRef = ref(null);
let ctx = null;
const isDrawing = ref(false); // Changed to ref
let lastX = 0;
let lastY = 0;

const canvasHistory = ref([]);
const historyPointer = ref(-1); 
const MAX_HISTORY_STATES = 20; 

function resizeCanvas() {
  const canvas = drawingCanvasRef.value;
  if (!canvas) return; 
  
  const rect = canvas.getBoundingClientRect(); // Get CSS display size of the canvas itself

  let currentDrawingData = null;
  if (ctx && canvas.width > 0 && canvas.height > 0) {
      currentDrawingData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  // Set internal buffer size to match its CSS display size
  canvas.width = rect.width;
  canvas.height = rect.height;

  // NO ctx.scale(dpr, dpr) here

  if (ctx && currentDrawingData) { 
      ctx.putImageData(currentDrawingData, 0, 0); 
  }
  
  if(ctx) {
    setEraserMode(props.isEraserActive); 
  }
}

function getCoords(e) {
  const canvas = drawingCanvasRef.value;
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect(); // CSS position and size

  // Re-introduce scaling factors. If canvas.width === rect.width, scaleX is 1.
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  
  let x = 0;
  let y = 0;

  if (typeof clientX === 'number' && typeof clientY === 'number') {
    x = (clientX - rect.left) * scaleX;
    y = (clientY - rect.top) * scaleY;
  }

  return { x, y };
}

function startDrawing(e) {
  if (props.stage !== 'drawing1' && props.stage !== 'drawing2') return;
  if (!ctx) return;

  setEraserMode(props.isEraserActive); 

  isDrawing.value = true; // Use .value
  const coords = getCoords(e);
  [lastX, lastY] = [coords.x, coords.y];
  ctx.beginPath(); 
  ctx.moveTo(lastX, lastY); 
  if (e.type === 'touchstart') e.preventDefault();
}

function draw(e) {
  if (!isDrawing.value || !ctx) return; // Use .value
  const coords = getCoords(e);
  ctx.lineTo(coords.x, coords.y);
  
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  [lastX, lastY] = [coords.x, coords.y];
  if (e.type === 'touchmove') e.preventDefault();
}

function stopDrawing() {
  if (!isDrawing.value) return; // Use .value
  isDrawing.value = false; // Use .value
  if (props.stage === 'drawing1' || props.stage === 'drawing2') {
    saveHistoryState();
  }
}

function saveHistoryState() {
  if (!drawingCanvasRef.value) return;
  if (historyPointer.value < canvasHistory.value.length - 1) {
    canvasHistory.value.splice(historyPointer.value + 1);
  }
  canvasHistory.value.push(drawingCanvasRef.value.toDataURL());
  if (canvasHistory.value.length > MAX_HISTORY_STATES) {
    canvasHistory.value.shift(); 
  }
  historyPointer.value = canvasHistory.value.length - 1;
  emitUndoRedoState();
}

function emitUndoRedoState() {
  emit('undo-state-changed', {
    canUndo: historyPointer.value > 0, 
    canRedo: historyPointer.value < canvasHistory.value.length - 1
  });
}

function loadStateFromHistory(index) {
  if (!ctx || !drawingCanvasRef.value || !canvasHistory.value[index]) return;
  const img = new Image();
  img.onload = () => {
    const originalGCO = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'source-over'; 
    ctx.clearRect(0, 0, drawingCanvasRef.value.width, drawingCanvasRef.value.height);
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = originalGCO; 
    setEraserMode(props.isEraserActive); 
  };
  img.src = canvasHistory.value[index];
}

function undo() {
  if (historyPointer.value > 0) { 
    historyPointer.value--;
    loadStateFromHistory(historyPointer.value);
    emitUndoRedoState();
  }
}

function redo() {
  if (historyPointer.value < canvasHistory.value.length - 1) {
    historyPointer.value++;
    loadStateFromHistory(historyPointer.value);
    emitUndoRedoState();
  }
}

onMounted(() => {
  const canvas = drawingCanvasRef.value;
  if (canvas) {
    ctx = canvas.getContext('2d');
    resizeCanvas(); 
    clearDrawingCanvas(); 

    window.addEventListener('resize', resizeCanvas);

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas);
});

watch(() => props.templateSrc, () => {
  if (props.stage === 'drawing1' && ctx && drawingCanvasRef.value) {
     clearDrawingCanvas();
  }
});

watch(() => props.stage, (newStage) => {
    if ((newStage === 'drawing1' || newStage === 'drawing2') && ctx && drawingCanvasRef.value) {
        setEraserMode(props.isEraserActive); 
    }
});

function clearDrawingCanvas() {
  if (ctx && drawingCanvasRef.value) {
    const originalGCO = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'source-over'; 
    ctx.clearRect(0, 0, drawingCanvasRef.value.width, drawingCanvasRef.value.height);
    ctx.globalCompositeOperation = originalGCO; 
    
    canvasHistory.value = [drawingCanvasRef.value.toDataURL()]; 
    historyPointer.value = 0; 
    emitUndoRedoState();
  }
}

defineExpose({
  clearDrawingCanvas,
  getCanvasDataURL,
  displayCombinedDrawing, 
  setEraserMode, 
  undo, 
  redo,
  getCoords, // Expose getCoords for testing
  resizeCanvas, // Expose resizeCanvas for testing
  saveHistoryState, // Expose for testing
  startDrawing, // Expose for testing
  draw, // Expose for testing
  stopDrawing, // Expose for testing
  getComponentContext: () => ctx, // TEMPORARY: Expose ctx for debugging
  isDrawingState: () => isDrawing.value // TEMPORARY: Expose isDrawing state for debugging
});

watch(() => props.isEraserActive, (newValue) => {
  setEraserMode(newValue);
});

watch(() => props.currentBrushSize, () => { 
  setEraserMode(props.isEraserActive); 
});

function setEraserMode(isErasing) {
  if (ctx) {
    if (isErasing) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)'; 
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#000000'; 
    }
    ctx.lineWidth = props.currentBrushSize;
  }
}

function getCanvasDataURL() {
  if (drawingCanvasRef.value) {
    return drawingCanvasRef.value.toDataURL();
  }
  return null;
}

async function displayCombinedDrawing(layers) {
  if (!ctx || !drawingCanvasRef.value) return;
  resizeCanvas(); 
  
  const originalGCO = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, drawingCanvasRef.value.width, drawingCanvasRef.value.height);
  
  const loadImagePromise = (url) => new Promise((resolve, reject) => {
    if (!url) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image for combined display: ${url}`));
    img.src = url;
  });

  const drawImageWithOpacity = (image, opacity) => {
    if (!image || !image.naturalWidth || !image.naturalHeight) return;
    const canvas = drawingCanvasRef.value;
    const hRatio = canvas.width / image.naturalWidth;
    const vRatio = canvas.height / image.naturalHeight;
    const ratio = Math.min(hRatio, vRatio);
    const centerShift_x = (canvas.width - image.naturalWidth * ratio) / 2;
    const centerShift_y = (canvas.height - image.naturalHeight * ratio) / 2;
    
    ctx.globalAlpha = opacity;
    ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight,
                  centerShift_x, centerShift_y, image.naturalWidth * ratio, image.naturalHeight * ratio);
    ctx.globalAlpha = 1.0; 
  };

  try {
    const imagesToLoad = [];
    if (layers.template?.show && layers.template.url) imagesToLoad.push(loadImagePromise(layers.template.url).then(img => ({ type: 'template', img, opacity: layers.template.opacity })));
    if (layers.drawing1?.show && layers.drawing1.url) imagesToLoad.push(loadImagePromise(layers.drawing1.url).then(img => ({ type: 'drawing1', img, opacity: layers.drawing1.opacity })));
    if (layers.drawing2?.show && layers.drawing2.url) imagesToLoad.push(loadImagePromise(layers.drawing2.url).then(img => ({ type: 'drawing2', img, opacity: layers.drawing2.opacity })));

    const loadedImages = await Promise.all(imagesToLoad);
    const drawOrder = ['template', 'drawing1', 'drawing2']; 

    drawOrder.forEach(type => {
      const layer = loadedImages.find(l => l && l.type === type);
      if (layer?.img) drawImageWithOpacity(layer.img, layer.opacity);
    });
  } catch (error) {
    console.error("Error displaying combined drawing:", error);
  } finally {
    ctx.globalCompositeOperation = originalGCO; 
    setEraserMode(props.isEraserActive); 
  }
}
</script>

<style scoped>
#drawingArea {
  position: relative;
  border: 1px solid black; 
  width: 100%; 
  max-width: 500px; 
  aspect-ratio: 5 / 4;
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 20px;
  background-color: white; 
}

#templateImage {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: 1;
  pointer-events: none;
}

#drawingCanvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  z-index: 2;
  touch-action: none;
}

.empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 0;
}
.empty-state p {
  color: #aaa;
  font-size: 1em;
  text-align: center;
  padding: 0 10px;
}
</style>
