<template>
  <div class="comparison-set">
    <div class="comparison-set-header-row">
      <h3>Comparison Set {{ resultSet.id + 1 }}</h3>
      <p>Overall Score: {{ resultSet.overallScore ? resultSet.overallScore.toFixed(2) : 'N/A' }}%</p>
    </div>
    <div class="comparison-set-row">
      <div class="comparison-container">
        <canvas :ref="el => canvasRefs[0] = el" aria-label="Comparison preview: Drawing 1 versus Drawing 2"></canvas>
        <p>D1 vs D2: {{ resultSet.sim1vs2.toFixed(2) }}%</p>
        <p class="time-placeholder">&nbsp;</p> <!-- Placeholder for spacing -->
        <!-- <img v-if="resultSet.diffUrl1vs2" :src="resultSet.diffUrl1vs2" alt="Difference D1 vs D2" class="diff-image"/> -->
      </div>
      <div class="comparison-container">
        <canvas :ref="el => canvasRefs[1] = el" aria-label="Comparison preview: Drawing 1 versus Template"></canvas>
        <p>D1 vs Template: {{ resultSet.sim1vsT.toFixed(2) }}%</p>
        <p v-if="resultSet.drawing1Time">Time: {{ resultSet.drawing1Time }}s</p>
        <!-- <img v-if="resultSet.diffUrl1vsT" :src="resultSet.diffUrl1vsT" alt="Difference D1 vs Template" class="diff-image"/> -->
      </div>
      <div class="comparison-container">
        <canvas :ref="el => canvasRefs[2] = el" aria-label="Comparison preview: Drawing 2 versus Template"></canvas>
        <p>D2 vs Template: {{ resultSet.sim2vsT.toFixed(2) }}%</p>
        <p v-if="resultSet.drawing2Time">Time: {{ resultSet.drawing2Time }}s</p>
        <!-- <img v-if="resultSet.diffUrl2vsT" :src="resultSet.diffUrl2vsT" alt="Difference D2 vs Template" class="diff-image"/> -->
      </div>
    </div>
    <div class="comparison-set-footer-row" v-if="resultSet.avgLikeness !== undefined">
      <p>Avg. Likeness: {{ resultSet.avgLikeness.toFixed(2) }}%</p>
      <p>Time Efficiency: {{ resultSet.timeEfficiencyScore.toFixed(2) }}%</p>
    </div>
  </div>
</template>

<script setup>
import { defineProps, ref, onMounted, watch, nextTick } from 'vue';

const props = defineProps({
  resultSet: Object
});

const canvasRefs = ref([]); // Array to hold refs for the three canvases

// const setAverage = ref(0); // No longer needed as overallScore is directly in resultSet

// function calculateSetAverage() { // No longer needed
//   if (props.resultSet) {
//     setAverage.value = (props.resultSet.sim1vs2 + props.resultSet.sim1vsT + props.resultSet.sim2vsT) / 3;
//   }
// }

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
  // calculateSetAverage(); // No longer needed
  renderCanvases();
});

watch(() => props.resultSet, async () => {
  await nextTick();
  // calculateSetAverage(); // No longer needed
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
.comparison-set-footer-row {
  width: 100%;
  display: flex;
  justify-content: space-around;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #eee;
  font-size: 0.9em;
}
.comparison-set-footer-row p {
  margin: 0 10px;
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
  width: min(200px, 100%);
  aspect-ratio: 4 / 3;
  height: auto;
  display: block;
  margin-bottom: 5px;
}
/* .diff-image {
  width: 200px; 
  height: 150px; 
  border: 1px solid #ccc;
  margin-top: 5px;
  object-fit: contain; 
} */
.comparison-container p {
  font-size: 0.9em;
  margin: 0;
  min-height: 1.2em; /* Ensure p tags take up space even if empty, matching typical line height */
}
.time-placeholder {
  visibility: hidden; /* Keeps space without showing content */
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
