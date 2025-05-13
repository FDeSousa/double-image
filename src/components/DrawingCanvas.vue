<template>
  <div id="drawingArea">
    <img 
      id="templateImage" 
      v-if="templateSrc && props.stage !== 'compared'" 
      :key="templateSrc" 
      :src="templateSrc" 
      alt="Template Image" 
      style="opacity: 0.3;"
    >
    <canvas id="drawingCanvas" ref="drawingCanvasRef"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';

// eslint-disable-next-line no-undef
const props = defineProps({
  templateSrc: String,
  stage: String, 
  isEraserActive: Boolean 
});

// eslint-disable-next-line no-undef
const emit = defineEmits(['undo-state-changed']);

const drawingCanvasRef = ref(null);
let ctx = null;
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Undo/Redo History
const canvasHistory = ref([]);
const historyPointer = ref(-1); // Points to the current state in canvasHistory
const MAX_HISTORY_STATES = 20; 

// Canvas setup and drawing functions
function resizeCanvas() {
  const canvas = drawingCanvasRef.value;
  if (!canvas || !canvas.parentElement) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  
  // Save current drawing to re-apply after resize if needed
  let currentDrawingData = null;
  if (ctx) { // only if context exists
      currentDrawingData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  canvas.width = rect.width;
  canvas.height = rect.height;

  if (ctx && currentDrawingData) { // Re-apply if context and data exist
      ctx.putImageData(currentDrawingData, 0, 0);
  }
  // Note: History states are DataURLs, they don't need explicit resizing,
  // but redrawing from history will use the new canvas size.
}

function getCoords(e) {
  const canvas = drawingCanvasRef.value;
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  let x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  let y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
  return { x, y };
}

function startDrawing(e) {
  if (props.stage !== 'drawing1' && props.stage !== 'drawing2') return;
  if (!ctx) return;

  // console.log(`startDrawing: isEraserActive=${props.isEraserActive}`); // Removed log
  if (props.isEraserActive) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = 10; // Eraser line width
    // console.log('startDrawing: Set to ERASER mode. Actual context gCO:', ctx.globalCompositeOperation, 'lw:', ctx.lineWidth); // Removed log
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = 2; // Pen line width
    // console.log('startDrawing: Set to PEN mode. Actual context gCO:', ctx.globalCompositeOperation, 'lw:', ctx.lineWidth); // Removed log
  }

  isDrawing = true;
  const coords = getCoords(e);
  [lastX, lastY] = [coords.x, coords.y];
  if (e.type === 'touchstart') e.preventDefault();
}

function draw(e) {
  if (!isDrawing || !ctx) return;
  const coords = getCoords(e);
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(coords.x, coords.y);
  // Eraser uses the current strokeStyle and lineWidth for its "brush" size/shape
  const currentLineWidth = props.isEraserActive ? 10 : 2;
  const currentStrokeStyle = props.isEraserActive ? 'rgba(0,0,0,1)' : '#000000'; // Changed eraser alpha to 1
  
  // console.log(`draw: isEraserActive=${props.isEraserActive}, current tool lw=${currentLineWidth}, current tool ss=${currentStrokeStyle}. Actual context gCO=${ctx.globalCompositeOperation}, actual context lw=${ctx.lineWidth}`); // Removed log

  ctx.strokeStyle = currentStrokeStyle; 
  ctx.lineWidth = currentLineWidth; 
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  [lastX, lastY] = [coords.x, coords.y];
  if (e.type === 'touchmove') e.preventDefault();
}

function stopDrawing() {
  if (!isDrawing) return;
  isDrawing = false;
  if (props.stage === 'drawing1' || props.stage === 'drawing2') { // Only save history if in a drawing stage
    saveHistoryState();
  }
}

function saveHistoryState() {
  if (!drawingCanvasRef.value) return;
  // Clear any "redo" states if a new drawing action occurs after an undo
  if (historyPointer.value < canvasHistory.value.length - 1) {
    canvasHistory.value.splice(historyPointer.value + 1);
  }

  canvasHistory.value.push(drawingCanvasRef.value.toDataURL());
  if (canvasHistory.value.length > MAX_HISTORY_STATES) {
    canvasHistory.value.shift(); // Remove the oldest state
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
    // CRITICAL FIX for redo: Ensure drawing mode is 'source-over' when restoring history
    // const previousOperation = ctx.globalCompositeOperation; // Removed
    // const previousLineWidth = ctx.lineWidth; // Removed

    ctx.globalCompositeOperation = 'source-over'; // Always draw history images normally
    
    ctx.clearRect(0, 0, drawingCanvasRef.value.width, drawingCanvasRef.value.height);
    ctx.drawImage(img, 0, 0);

    // Restore the composite operation and line width that was active *before* this history load,
    // so that the next drawing action uses the correct tool (pen/eraser) settings.
    // This is important if the user undoes/redoes and then immediately draws without changing tools.
    // However, setEraserMode is also called via watch on props.isEraserActive,
    // which should ensure the correct mode is set if the prop changes.
    // For safety, we can rely on setEraserMode to be the source of truth for current tool.
    setEraserMode(props.isEraserActive); 
    // Or, more directly:
    // ctx.globalCompositeOperation = previousOperation;
    // ctx.lineWidth = previousLineWidth;
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

// Lifecycle hooks
onMounted(() => {
  const canvas = drawingCanvasRef.value;
  if (canvas) {
    ctx = canvas.getContext('2d');
    resizeCanvas();
    clearDrawingCanvas(); // This will also save the initial blank state for undo

    window.addEventListener('resize', resizeCanvas);

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);
    
    console.log('DrawingCanvas.vue mounted and initialized.');
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas);
});

watch(() => props.templateSrc, () => {
  // When template changes, or on initial load for drawing1, reset history
  if (props.stage === 'drawing1' && ctx && drawingCanvasRef.value) {
     clearDrawingCanvas(); // This also resets history
  }
});

watch(() => props.stage, (newStage) => {
    if ((newStage === 'drawing1' || newStage === 'drawing2') && ctx && drawingCanvasRef.value) {
        // If moving to a drawing stage (e.g. after selecting template, or starting drawing 2)
        // ensure history is appropriate for a new drawing session.
        // clearDrawingCanvas() called by parent handles this for new templates/stages.
        // If eraser was active, ensure it's reset to pen unless specified by prop
        setEraserMode(props.isEraserActive);
    }
    if (newStage !== 'drawing1' && newStage !== 'drawing2') {
        // When not in a drawing stage, ensure eraser is off if it was on.
        // This might be better handled by App.vue resetting isEraserEnabled prop.
    }
});


function clearDrawingCanvas() {
  if (ctx && drawingCanvasRef.value) {
    ctx.clearRect(0, 0, drawingCanvasRef.value.width, drawingCanvasRef.value.height);
    // Reset history on clear
    canvasHistory.value = [drawingCanvasRef.value.toDataURL()]; 
    historyPointer.value = 0; // Point to the initial blank state
    emitUndoRedoState();
  }
}

// eslint-disable-next-line no-undef
defineExpose({
  clearDrawingCanvas,
  getCanvasDataURL,
  displayCombinedDrawing, 
  setEraserMode,
  undo, 
  redo  
});

watch(() => props.isEraserActive, (newValue) => {
  // console.log(`WATCH props.isEraserActive changed to: ${newValue}. Calling setEraserMode.`); // Removed log
  setEraserMode(newValue);
});

function setEraserMode(isErasing) {
  if (ctx) {
    if (isErasing) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 10; // Example: Eraser is thicker
      // console.log('setEraserMode: ERASER active. gCO:', ctx.globalCompositeOperation, 'lineWidth:', ctx.lineWidth); // Removed log
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = 2; // Reset to default pen lineWidth
      // console.log('setEraserMode: PEN active. gCO:', ctx.globalCompositeOperation, 'lineWidth:', ctx.lineWidth); // Removed log
    }
  } else {
    // console.log('setEraserMode: ctx is null, cannot set mode.'); // Removed log
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
  ctx.clearRect(0, 0, drawingCanvasRef.value.width, drawingCanvasRef.value.height);
  
  const loadImagePromise = (url) => new Promise((resolve, reject) => {
    if (!url) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => { console.error('Error loading image for combined display:', url, err); reject(err); };
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
    if (layers.template && layers.template.show && layers.template.url) {
      imagesToLoad.push(loadImagePromise(layers.template.url).then(img => ({ type: 'template', img, opacity: layers.template.opacity })));
    }
    if (layers.drawing1 && layers.drawing1.show && layers.drawing1.url) {
      imagesToLoad.push(loadImagePromise(layers.drawing1.url).then(img => ({ type: 'drawing1', img, opacity: layers.drawing1.opacity })));
    }
    if (layers.drawing2 && layers.drawing2.show && layers.drawing2.url) {
      imagesToLoad.push(loadImagePromise(layers.drawing2.url).then(img => ({ type: 'drawing2', img, opacity: layers.drawing2.opacity })));
    }

    const loadedImages = await Promise.all(imagesToLoad);
    const drawOrder = ['template', 'drawing1', 'drawing2']; 

    drawOrder.forEach(type => {
      const layer = loadedImages.find(l => l && l.type === type);
      if (layer && layer.img) {
        drawImageWithOpacity(layer.img, layer.opacity);
      }
    });

  } catch (error) {
    console.error("Error displaying combined drawing:", error);
  }
}

</script>

<style scoped>
#drawingArea {
  position: relative;
  border: 1px solid black;
  width: 500px; /* Example width, should match global or be configurable */
  height: 400px; /* Example height, should match global or be configurable */
  margin-bottom: 20px;
  background-color: white; /* Added for testing eraser visibility */
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
</style>
