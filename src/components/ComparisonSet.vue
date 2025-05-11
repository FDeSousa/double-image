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

// Draws two specified images onto a canvas, with options for styling the base image if it's a template
async function drawPairedImages(targetCanvas, baseImageURL, overlayImageURL, isBaseImageTemplate) {
  if (!targetCanvas) return;
  const targetCtx = targetCanvas.getContext('2d');
  
  targetCanvas.width = 200;
  targetCanvas.height = 150;
  targetCtx.fillStyle = '#FFFFFF'; // Explicitly set white background
  targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

  const loadImagePromise = (url) => new Promise((resolve) => { 
    if (!url) { resolve(null); return; } 
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => { console.error('Error loading image in ComparisonSet:', url, err); resolve(null); };
    img.src = url;
  });

  const drawImageContain = (image, isBase, isTemplate) => {
    if (!image || !image.naturalWidth || !image.naturalHeight) return;
    const hRatio = targetCanvas.width / image.naturalWidth;
    const vRatio = targetCanvas.height / image.naturalHeight;
    const ratio = Math.min(hRatio, vRatio);
    const centerShift_x = (targetCanvas.width - image.naturalWidth * ratio) / 2;
    const centerShift_y = (targetCanvas.height - image.naturalHeight * ratio) / 2;
    
    if (isBase) {
      targetCtx.globalAlpha = isTemplate ? 0.5 : 1.0; // Template base is more transparent
    } else {
      targetCtx.globalAlpha = 0.6; // Overlay image is semi-transparent
    }
    
    targetCtx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight,
                    centerShift_x, centerShift_y, image.naturalWidth * ratio, image.naturalHeight * ratio);
    targetCtx.globalAlpha = 1.0; // Reset alpha
  };

  try {
    const [baseImg, overlayImg] = await Promise.all([
      loadImagePromise(baseImageURL),
      loadImagePromise(overlayImageURL)
    ]);

    if (baseImg) {
      drawImageContain(baseImg, true, isBaseImageTemplate);
    }
    if (overlayImg) {
      drawImageContain(overlayImg, false, false); 
    }
  } catch (error) {
    console.error("Error drawing paired images on comparison canvas:", error);
  }
}

function renderCanvases() {
  if (props.resultSet && canvasRefs.value.length === 3 && canvasRefs.value.every(c => c)) {
    // Canvas 1: Drawing 1 (base) + Drawing 2 (overlay)
    drawPairedImages(canvasRefs.value[0], props.resultSet.drawing1URL, props.resultSet.drawing2URL, false);
    // Canvas 2: Template (base) + Drawing 1 (overlay)
    drawPairedImages(canvasRefs.value[1], props.resultSet.templateURL, props.resultSet.drawing1URL, true);
    // Canvas 3: Template (base) + Drawing 2 (overlay)
    drawPairedImages(canvasRefs.value[2], props.resultSet.templateURL, props.resultSet.drawing2URL, true);
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
