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
  stage: String // Will be used to enable/disable drawing
});

const drawingCanvasRef = ref(null);
let ctx = null;
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Canvas setup and drawing functions
function resizeCanvas() {
  const canvas = drawingCanvasRef.value;
  if (!canvas || !canvas.parentElement) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  // Redraw content if needed after resize, e.g., template or existing drawing
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
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  [lastX, lastY] = [coords.x, coords.y];
  if (e.type === 'touchmove') e.preventDefault();
}

function stopDrawing() {
  isDrawing = false;
}

// Lifecycle hooks
onMounted(() => {
  const canvas = drawingCanvasRef.value;
  if (canvas) {
    ctx = canvas.getContext('2d');
    resizeCanvas();
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

watch(() => props.templateSrc, (newSrc) => {
  console.log('Template source changed in DrawingCanvas:', newSrc);
  // If using the img tag for template, this watch might not need to do much for the template itself.
  // If drawing template onto canvas, this is where you'd trigger a redraw.
});

// Expose clearCanvas method to parent
// eslint-disable-next-line no-unused-vars
function clearDrawingCanvas() {
  if (ctx && drawingCanvasRef.value) {
    ctx.clearRect(0, 0, drawingCanvasRef.value.width, drawingCanvasRef.value.height);
  }
}

// eslint-disable-next-line no-undef
defineExpose({
  clearDrawingCanvas,
  getCanvasDataURL,
  displayCombinedDrawing // Expose new method
});

function getCanvasDataURL() {
  if (drawingCanvasRef.value) {
    return drawingCanvasRef.value.toDataURL();
  }
  return null;
}

// New method to display combined images
async function displayCombinedDrawing(layers) {
  // layers = { template: { url: '...', show: true, opacity: 0.3 }, 
  //            drawing1: { url: '...', show: true, opacity: 0.4 }, 
  //            drawing2: { url: '...', show: true, opacity: 0.4 } }
  if (!ctx || !drawingCanvasRef.value) return;

  // Ensure canvas is at the correct display size first
  resizeCanvas(); // This also clears the canvas if it resizes

  // Clear canvas before drawing new combined image
  ctx.clearRect(0, 0, drawingCanvasRef.value.width, drawingCanvasRef.value.height);
  
  // Ensure the main drawing area (parent of canvas) has a white background via CSS
  // The canvas itself should be transparent to allow layers to show through if needed,
  // but for this combined view, we'll draw onto a cleared (transparent) canvas.

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
    ctx.globalAlpha = 1.0; // Reset alpha
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

    // Define a drawing order, e.g., template first, then drawing1, then drawing2
    // This can be adjusted based on desired layering effect
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
