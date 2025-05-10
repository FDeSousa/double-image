<template>
  <div class="comparison-set">
    <div class="comparison-set-header-row">
      <h3>Comparison Set {{ resultSet.id + 1 }}</h3>
      <p>Set Average: {{ setAverage.toFixed(2) }}%</p>
    </div>
    <div class="comparison-set-row">
      <div class="comparison-container">
        <canvas :ref="el => canvasRefs[0] = el"></canvas>
        <p>Drawing 1 vs Drawing 2: {{ resultSet.sim1vs2.toFixed(2) }}%</p>
      </div>
      <div class="comparison-container">
        <canvas :ref="el => canvasRefs[1] = el"></canvas>
        <p>Drawing 1 vs Template: {{ resultSet.sim1vsT.toFixed(2) }}%</p>
      </div>
      <div class="comparison-container">
        <canvas :ref="el => canvasRefs[2] = el"></canvas>
        <p>Drawing 2 vs Template: {{ resultSet.sim2vsT.toFixed(2) }}%</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, ref, onMounted, watch, nextTick } from 'vue';

const props = defineProps({
  resultSet: Object
});

const canvasRefs = ref([]); // Array to hold refs for the three canvases

const setAverage = ref(0);

function calculateSetAverage() {
  if (props.resultSet) {
    setAverage.value = (props.resultSet.sim1vs2 + props.resultSet.sim1vsT + props.resultSet.sim2vsT) / 3;
  }
}

async function drawOverlayWithURLs(targetCanvas, baseURL, overlayURL, isBaseTemplate) {
  if (!targetCanvas) return;
  const targetCtx = targetCanvas.getContext('2d');
  
  // Use fixed dimensions for these smaller canvases for now
  targetCanvas.width = 200;
  targetCanvas.height = 150;
  targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

  const loadImagePromise = (url) => new Promise((resolve, reject) => {
    if (!url) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => { console.error('Error loading image in ComparisonSet:', url, err); reject(err); };
    img.src = url;
  });

  try {
    const [baseImg, overlayImg] = await Promise.all([loadImagePromise(baseURL), loadImagePromise(overlayURL)]);
    
    const drawImageContain = (canvasCtxInternal, image, clear = true, isTemplateOverlay = false) => {
        if (clear) canvasCtxInternal.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        if (!image || !image.naturalWidth || !image.naturalHeight) return;

        const hRatio = targetCanvas.width / image.naturalWidth;
        const vRatio = targetCanvas.height / image.naturalHeight;
        const ratio = Math.min(hRatio, vRatio);
        const centerShift_x = (targetCanvas.width - image.naturalWidth * ratio) / 2;
        const centerShift_y = (targetCanvas.height - image.naturalHeight * ratio) / 2;
        
        canvasCtxInternal.globalAlpha = isTemplateOverlay ? (isBaseTemplate ? 0.5 : 1.0) : (isBaseTemplate && image === baseImg ? 0.5 : 0.6);


        if (isBaseTemplate && image === baseImg) { // Base image when it's a template
             canvasCtxInternal.globalAlpha = 0.5;
        } else if (image === overlayImg) { // Overlay image
            canvasCtxInternal.globalAlpha = 0.6;
        } else { // Base image when it's not a template
            canvasCtxInternal.globalAlpha = 1.0;
        }


        canvasCtxInternal.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight,
                        centerShift_x, centerShift_y, image.naturalWidth * ratio, image.naturalHeight * ratio);
        canvasCtxInternal.globalAlpha = 1.0; // Reset alpha
    };

    if (baseImg) {
        drawImageContain(targetCtx, baseImg, true, isBaseTemplate && baseImg === overlayImg); // Clear only for the first image
    }
    if (overlayImg && overlayImg !== baseImg) { // Don't redraw if base and overlay are the same (e.g. template vs template)
        drawImageContain(targetCtx, overlayImg, false, isBaseTemplate && overlayImg === baseImg);
    }


  } catch (error) {
    console.error("Error drawing images on comparison canvas:", error);
  }
}

function renderCanvases() {
  if (props.resultSet && canvasRefs.value.length === 3) {
    drawOverlayWithURLs(canvasRefs.value[0], props.resultSet.drawing2URL, props.resultSet.drawing1URL, false);
    drawOverlayWithURLs(canvasRefs.value[1], props.resultSet.templateURL, props.resultSet.drawing1URL, true);
    drawOverlayWithURLs(canvasRefs.value[2], props.resultSet.templateURL, props.resultSet.drawing2URL, true);
  }
}

onMounted(async () => {
  await nextTick(); // Ensure canvas refs are populated
  calculateSetAverage();
  renderCanvases();
});

watch(() => props.resultSet, async () => {
  await nextTick();
  calculateSetAverage();
  renderCanvases();
}, { deep: true });

</script>

<style scoped>
/* Styles are mostly global, but some specifics for ComparisonSet might be needed */
.comparison-set {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-bottom: 1px dashed #ddd;
  padding-bottom: 10px;
  margin-bottom: 10px;
}
.comparison-set:last-child {
  border-bottom: none;
  margin-bottom: 0;
}
.comparison-set h3 {
  margin: 0; /* Remove default margins */
}
.comparison-set-header-row { /* New style for the header */
    width: 100%;
    display: flex;
    justify-content: space-between; /* Space out title and average */
    align-items: center;
    margin-bottom: 10px;
    padding: 0 5px; /* Optional padding */
    box-sizing: border-box;
    font-weight: bold;
}
.comparison-set-header-row p {
    margin: 0; /* Remove default margins */
}
.comparison-set-row {
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: flex-start;
}
.comparison-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 5px;
  text-align: center;
  flex: 1;
  min-width: 160px;
}
.comparison-container canvas {
  border: 1px solid #eee;
  width: 200px; 
  height: 150px;
  margin-bottom: 5px;
}
.comparison-container p {
  font-size: 0.9em;
  margin: 0;
}

@media (max-width: 768px) {
    .comparison-set-row {
        flex-direction: column;
        align-items: center;
    }
    .comparison-container {
        min-width: 80%; 
        margin-bottom: 15px;
    }
}
</style>
