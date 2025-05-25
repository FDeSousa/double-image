<template>
  <TopNavbar 
    :currentTheme="currentTheme"
    :canClearAll="allComparisonResults.length > 0"
    @toggle-theme="toggleTheme"
    @clear-all-results="handleClearAllResults"
  />
  <div id="app-container" role="main">
    <!-- Old AppControls removed -->
    <ThumbnailPicker 
      :isVisible="thumbnailPickerVisible" 
      @select-template="handleTemplateSelected" 
    />

    <DrawingCanvas 
      :templateSrc="currentTemplateSrc" 
      :stage="stage"
      :isEraserActive="isEraserEnabled"
      :currentBrushSize="currentBrushSize"
      @undo-state-changed="updateUndoRedoState"
      ref="drawingCanvasComponentRef" 
    />
    <MainControls
      :currentStage="stage"
      :isEraserEnabled="isEraserEnabled"
      :canUndo="canUndo"
      :canRedo="canRedo"
      :currentBrushSize="currentBrushSize"
      @toggle-thumbnails="handleToggleThumbnails"
      @save-drawing-1="handleSaveDrawing1"
      @start-drawing-2="handleStartDrawing2"
      @save-drawing-2="handleSaveDrawing2"
      @restart-process="handleRestartProcess"
      @template-file-selected="handleTemplateFileSelected"
      @toggle-eraser="handleToggleEraser"
      @undo-drawing="handleUndo"
      @redo-drawing="handleRedo"
      @clear-drawing="handleClearDrawing" 
      @set-brush-size="handleSetBrushSize"
    />

    <div v-if="stage === 'compared' && latestComparisonScores" class="main-canvas-results">
      <div class="scores-layout">
        <div class="individual-scores">
          <h3>Latest Comparison Scores & Times:</h3>
          <p>Drawing 1 vs Drawing 2: {{ latestComparisonScores.sim1vs2 }}%</p>
          <p>Drawing 1 vs Template: {{ latestComparisonScores.sim1vsT }}% <span v-if="latestDrawingTimes && latestDrawingTimes.d1">(Time: {{ latestDrawingTimes.d1 }}s)</span></p>
          <p>Drawing 2 vs Template: {{ latestComparisonScores.sim2vsT }}% <span v-if="latestDrawingTimes && latestDrawingTimes.d2">(Time: {{ latestDrawingTimes.d2 }}s)</span></p>
          <hr>
          <p>Average Likeness: {{ latestComparisonScores.avgLikeness }}%</p>
          <p>Time Efficiency: {{ latestComparisonScores.timeEfficiencyScore }}%</p>
        </div>
        <div class="average-score"> 
          <h4>Overall Score:</h4>
          <p>{{ latestComparisonScores.overallScore }}%</p>
        </div>
      </div>
      
      <div class="layer-controls">
        <h4>Display Layers on Main Canvas:</h4>
        <label>
          <input type="checkbox" v-model="showTemplateLayer"> Template
        </label>
        <label>
          <input type="checkbox" v-model="showDrawing1Layer"> Drawing 1
        </label>
        <label>
          <input type="checkbox" v-model="showDrawing2Layer"> Drawing 2
        </label>
      </div>
    </div>

    <ComparisonResults :results="allComparisonResults" />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import TopNavbar from './components/TopNavbar.vue'; 
// import AppControls from './components/AppControls.vue'; // Removed
import ThumbnailPicker from './components/ThumbnailPicker.vue';
import DrawingCanvas from './components/DrawingCanvas.vue';
// import DrawingToolbar from './components/DrawingToolbar.vue'; // Removed
import MainControls from './components/MainControls.vue'; // Added
import ComparisonResults from './components/ComparisonResults.vue';

const thumbnailPickerVisible = ref(false);
const currentTemplateSrc = ref(null);
const drawingCanvasComponentRef = ref(null);
const stage = ref('initial');
const allComparisonResults = ref([]); 
const drawing1DataURL = ref(null);
const drawing2DataURL = ref(null); 
const currentTheme = ref('light');
const latestComparisonScores = ref(null);

const showTemplateLayer = ref(true);
const showDrawing1Layer = ref(true);
const showDrawing2Layer = ref(true);

const drawingStartTime = ref(0);
const drawing1Time = ref(null);
const drawing2Time = ref(null);
const latestDrawingTimes = ref(null);

const isEraserEnabled = ref(false);
const currentBrushSize = ref(2); 
const canUndo = ref(false);
const canRedo = ref(false);

function handleToggleThumbnails() {
  thumbnailPickerVisible.value = !thumbnailPickerVisible.value;
}

function handleTemplateSelected(templatePath) {
  currentTemplateSrc.value = templatePath;
  if (drawingCanvasComponentRef.value) {
    drawingCanvasComponentRef.value.clearDrawingCanvas();
  }
  stage.value = 'drawing1'; 
  drawingStartTime.value = Date.now();
  thumbnailPickerVisible.value = false; 
}

function handleTemplateFileSelected(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    currentTemplateSrc.value = e.target.result;
    if (drawingCanvasComponentRef.value) {
        drawingCanvasComponentRef.value.clearDrawingCanvas();
    }
    stage.value = 'drawing1';
    drawingStartTime.value = Date.now();
  };
  reader.onerror = () => alert("Error reading template file.");
  reader.readAsDataURL(file);
}

function handleClearDrawing() {
  if (drawingCanvasComponentRef.value) {
    drawingCanvasComponentRef.value.clearDrawingCanvas();
  }
}

function handleSaveDrawing1() {
  if (drawingCanvasComponentRef.value) {
    drawing1DataURL.value = drawingCanvasComponentRef.value.getCanvasDataURL();
    const endTime = Date.now();
    drawing1Time.value = ((endTime - drawingStartTime.value) / 1000).toFixed(2);
    stage.value = 'readyForDrawing2';
    drawingCanvasComponentRef.value.clearDrawingCanvas(); 
  }
}

function handleStartDrawing2() {
  stage.value = 'drawing2';
  drawingStartTime.value = Date.now();
  if (drawingCanvasComponentRef.value) {
    drawingCanvasComponentRef.value.clearDrawingCanvas(); 
  }
}

function handleSaveDrawing2() {
  if (drawingCanvasComponentRef.value) {
    drawing2DataURL.value = drawingCanvasComponentRef.value.getCanvasDataURL();
    const endTime = Date.now();
    drawing2Time.value = ((endTime - drawingStartTime.value) / 1000).toFixed(2);
    latestDrawingTimes.value = { d1: drawing1Time.value, d2: drawing2Time.value };
    stage.value = 'compared';
    compareAndDisplayResults();
  }
}

async function urlToImageData(url) {
  return new Promise((resolve, reject) => {
    if (!url) reject(new Error("URL is null"));
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const targetWidth = drawingCanvasComponentRef.value?.drawingCanvasRef?.width || 500;
      const targetHeight = drawingCanvasComponentRef.value?.drawingCanvasRef?.height || 400;
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      const hRatio = targetWidth / img.naturalWidth;
      const vRatio = targetHeight / img.naturalHeight;
      const ratio = Math.min(hRatio, vRatio);
      const centerShift_x = (targetWidth - img.naturalWidth * ratio) / 2;
      const centerShift_y = (targetHeight - img.naturalHeight * ratio) / 2;
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight,
                    centerShift_x, centerShift_y, img.naturalWidth * ratio, img.naturalHeight * ratio);
      resolve(ctx.getImageData(0, 0, targetWidth, targetHeight));
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

async function compareAndDisplayResults() {
  if (!drawing1DataURL.value || !drawing2DataURL.value || !currentTemplateSrc.value) return;
  try {
    if (typeof window.resemble === 'undefined') {
      alert("Resemble.js not loaded."); return;
    }
    const [data1, data2, templateImgData] = await Promise.all([
      urlToImageData(drawing1DataURL.value),
      urlToImageData(drawing2DataURL.value),
      urlToImageData(currentTemplateSrc.value)
    ]);
    if (!data1 || !data2 || !templateImgData) return;

    const comparisonPromises = [
      new Promise(resolve => window.resemble(data1).compareTo(data2).onComplete(resolve)),
      new Promise(resolve => window.resemble(data1).compareTo(templateImgData).onComplete(resolve)),
      new Promise(resolve => window.resemble(data2).compareTo(templateImgData).onComplete(resolve))
    ];
    const results = await Promise.all(comparisonPromises);

    const sim1vs2 = 100 - parseFloat(results[0].rawMisMatchPercentage);
    const sim1vsT = 100 - parseFloat(results[1].rawMisMatchPercentage);
    const sim2vsT = 100 - parseFloat(results[2].rawMisMatchPercentage);

    const avgLikeness = (sim1vs2 + sim1vsT + sim2vsT) / 3;
    const timeDiff = Math.abs(parseFloat(drawing1Time.value) - parseFloat(drawing2Time.value));
    const timeEfficiencyK = 2;
    const timeEfficiencyScore = Math.max(0, 100 - (timeDiff * timeEfficiencyK));
    const weightLikeness = 0.7;
    const weightTime = 0.3;
    const overallScore = (weightLikeness * avgLikeness) + (weightTime * timeEfficiencyScore);

    const newComparisonSet = {
      id: allComparisonResults.value.length, 
      drawing1URL: drawing1DataURL.value,
      drawing2URL: drawing2DataURL.value,
      templateURL: currentTemplateSrc.value,
      sim1vs2: sim1vs2, sim1vsT: sim1vsT, sim2vsT: sim2vsT,
      drawing1Time: drawing1Time.value, drawing2Time: drawing2Time.value,
      avgLikeness: parseFloat(avgLikeness.toFixed(2)),
      timeEfficiencyScore: parseFloat(timeEfficiencyScore.toFixed(2)),
      overallScore: parseFloat(overallScore.toFixed(2))
    };
    allComparisonResults.value.push(newComparisonSet);
    latestComparisonScores.value = {
        sim1vs2: sim1vs2.toFixed(2), sim1vsT: sim1vsT.toFixed(2), sim2vsT: sim2vsT.toFixed(2),
        avgLikeness: avgLikeness.toFixed(2),
        timeEfficiencyScore: timeEfficiencyScore.toFixed(2),
        overallScore: overallScore.toFixed(2)
    };
    saveResultsToLocalStorage();
    if (drawingCanvasComponentRef.value) {
      showTemplateLayer.value = true; showDrawing1Layer.value = true; showDrawing2Layer.value = true;
      triggerMainCanvasCombinedDisplay();
    }
  } catch (error) {
    console.error("Error during comparison:", error);
    alert("An error occurred during image comparison.");
  }
}

function triggerMainCanvasCombinedDisplay() {
  if (drawingCanvasComponentRef.value && stage.value === 'compared') {
    drawingCanvasComponentRef.value.displayCombinedDrawing({
      template: { url: currentTemplateSrc.value, show: showTemplateLayer.value, opacity: 0.3 },
      drawing1: { url: drawing1DataURL.value, show: showDrawing1Layer.value, opacity: 0.4 },
      drawing2: { url: drawing2DataURL.value, show: showDrawing2Layer.value, opacity: 0.4 }
    });
  }
}

watch([showTemplateLayer, showDrawing1Layer, showDrawing2Layer], () => {
  if (stage.value === 'compared') triggerMainCanvasCombinedDisplay();
});

function handleToggleEraser(newEraserState) {
  isEraserEnabled.value = newEraserState;
}

function handleSetBrushSize(newSize) {
  currentBrushSize.value = newSize;
}

function handleUndo() {
  if (drawingCanvasComponentRef.value) drawingCanvasComponentRef.value.undo();
}

function handleRedo() {
  if (drawingCanvasComponentRef.value) drawingCanvasComponentRef.value.redo();
}

function updateUndoRedoState({ canUndo: newCanUndo, canRedo: newCanRedo }) {
  canUndo.value = newCanUndo;
  canRedo.value = newCanRedo;
}

function handleRestartProcess() {
  currentTemplateSrc.value = null; 
  drawing1DataURL.value = null;
  drawing2DataURL.value = null;
  stage.value = 'initial';
  if (drawingCanvasComponentRef.value) {
    drawingCanvasComponentRef.value.clearDrawingCanvas();
  }
}

function handleClearAllResults() {
  allComparisonResults.value = [];
  drawing1DataURL.value = null;
  drawing2DataURL.value = null;
  currentTemplateSrc.value = null;
  saveResultsToLocalStorage();
  stage.value = 'initial';
  if (drawingCanvasComponentRef.value) {
    drawingCanvasComponentRef.value.clearDrawingCanvas();
  }
}

const LOCAL_STORAGE_KEY = 'doubleImageVueResults';
function saveResultsToLocalStorage() {
  try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allComparisonResults.value)); }
  catch (e) { console.error("Error saving to localStorage:", e); }
}
function loadResultsFromLocalStorage() {
  try {
    const savedResults = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedResults) allComparisonResults.value = JSON.parse(savedResults);
  } catch (e) { console.error("Error loading from localStorage:", e); }
}

const THEME_STORAGE_KEY = 'doubleImageVueTheme';
function applyTheme(theme) {
  document.body.classList.toggle('dark-mode', theme === 'dark');
  currentTheme.value = theme;
}
function toggleTheme() {
  const newTheme = currentTheme.value === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
  try { localStorage.setItem(THEME_STORAGE_KEY, newTheme); }
  catch (e) { console.error("Error saving theme to localStorage:", e); }
}
function loadThemeFromLocalStorage() {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'light';
    applyTheme(savedTheme);
  } catch (e) { console.error("Error loading theme from localStorage:", e); applyTheme('light'); }
}

onMounted(() => {
  loadResultsFromLocalStorage();
  loadThemeFromLocalStorage();
});
</script>

<style>
#app-container { 
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 55px;
}
.scores-layout {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}
.individual-scores { flex-grow: 1; }
.average-score {
  text-align: right;
  padding-left: 20px;
  min-width: 100px;
}
.average-score h4 { margin-top: 0; margin-bottom: 5px; }
.average-score p { font-size: 1.2em; font-weight: bold; margin: 0; }
.main-canvas-results {
  margin-top: 15px; padding: 15px;
  border: 1px solid var(--border-color-light);
  border-radius: 5px;
  background-color: var(--button-bg-light);
  width: 100%; max-width: 500px; box-sizing: border-box;
}
body.dark-mode .main-canvas-results {
  border-color: var(--border-color-dark);
  background-color: var(--button-bg-dark);
}
.main-canvas-results h3 { margin-top: 0; text-align: center; }
.main-canvas-results p { margin: 5px 0; }
.layer-controls {
  margin-top: 15px; padding-top: 10px;
  border-top: 1px solid var(--border-color-light);
}
body.dark-mode .layer-controls { border-top-color: var(--border-color-dark); }
.layer-controls h4 { margin-top: 0; margin-bottom: 8px; }
.layer-controls label { display: inline-block; margin-right: 15px; cursor: pointer; }
.layer-controls input[type="checkbox"] { margin-right: 5px; }
</style>
