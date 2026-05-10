<template>
  <TopNavbar 
    :currentTheme="currentTheme"
    :canClearAll="allComparisonResults.length > 0"
    @toggle-theme="toggleTheme"
    @clear-all-results="handleClearAllResults"
  />
  <div id="app-container" role="main">
    <!-- Stage progress indicator -->
    <ol class="stage-progress" aria-label="Progress steps">
      <li :aria-current="stage === 'initial' ? 'step' : undefined" :class="{ active: stage === 'initial', done: stage !== 'initial' }">Pick Template</li>
      <li :aria-current="stage === 'drawing1' ? 'step' : undefined" :class="{ active: stage === 'drawing1', done: ['readyForDrawing2','drawing2','compared'].includes(stage) }">Draw First</li>
      <li :aria-current="stage === 'drawing2' ? 'step' : undefined" :class="{ active: stage === 'drawing2', done: stage === 'compared' }">Draw Second</li>
      <li :aria-current="stage === 'compared' ? 'step' : undefined" :class="{ active: stage === 'compared' }">Results</li>
    </ol>

    <!-- Accessible error banner -->
    <div v-if="errorMessage" class="error-banner" role="alert" aria-live="assertive">
      <span>{{ errorMessage }}</span>
      <button @click="errorMessage = null" aria-label="Dismiss error">✕</button>
    </div>

    <!-- Accessible score announcement (visually hidden) -->
    <div aria-live="polite" aria-atomic="true" class="sr-only">{{ scoreAnnouncement }}</div>

    <!-- Loading overlay -->
    <div v-if="isComparing" class="comparing-overlay" aria-live="polite" aria-label="Comparing drawings, please wait">
      <span class="comparing-spinner" aria-hidden="true"></span>
      <span>Comparing…</span>
    </div>

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
      :currentTheme="currentTheme"
      :isComparing="isComparing"
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
          <h3>Latest Comparison Scores &amp; Times:</h3>
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

      <!-- Scoring explanation -->
      <details class="scoring-info">
        <summary>How is this scored?</summary>
        <ul>
          <li><strong>Drawing 1 vs Drawing 2 / vs Template</strong> — Jaccard similarity of drawn pixels (intersection ÷ union). 100% means the strokes overlap perfectly; 0% means no overlap at all.</li>
          <li><strong>Average Likeness</strong> — mean of the three Jaccard scores above.</li>
          <li><strong>Time Efficiency</strong> — 100 minus twice the absolute difference (in seconds) between each player's drawing time. It rewards both players taking a similar amount of time.</li>
          <li><strong>Overall Score</strong> — 70% Average Likeness + 30% Time Efficiency.</li>
        </ul>
      </details>
      
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
const { defineExpose } = require('vue'); // For testing purposes
// Import necessary components and utilities
import { ref, onMounted, watch } from 'vue';
import TopNavbar from './components/TopNavbar.vue'; 
import ThumbnailPicker from './components/ThumbnailPicker.vue';
import DrawingCanvas from './components/DrawingCanvas.vue';
import MainControls from './components/MainControls.vue';
import ComparisonResults from './components/ComparisonResults.vue';
import { calculateComparisonScores, calculateJaccardSimilarity } from './utils/comparisonUtils.js'; 
import { urlToImageData } from './utils/imageUtils.js';

const thumbnailPickerVisible = ref(false);
const currentTemplateSrc = ref(null);
const drawingCanvasComponentRef = ref(null);
const stage = ref('initial');
const allComparisonResults = ref([]); 
const drawing1DataURL = ref(null);
const drawing2DataURL = ref(null); 
const currentTheme = ref('light');
const latestComparisonScores = ref(null);
const isComparing = ref(false);
const errorMessage = ref(null);
const scoreAnnouncement = ref('');

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
  saveSessionState();
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
    saveSessionState();
  };
  reader.onerror = () => showError("Error reading template file.");
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
    saveSessionState();
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

function showError(msg) {
  errorMessage.value = msg;
}

async function compareAndDisplayResults() {
  if (!drawing1DataURL.value || !drawing2DataURL.value || !currentTemplateSrc.value) return;

  const canvas = drawingCanvasComponentRef.value?.drawingCanvasRef;
  if (!canvas || !canvas.width || !canvas.height) {
    showError("Drawing canvas is not ready. Please try again.");
    return;
  }
  const targetWidth = canvas.width;
  const targetHeight = canvas.height;

  isComparing.value = true;
  errorMessage.value = null;
  try {
    const [data1, data2, templateImgData] = await Promise.all([
      urlToImageData(drawing1DataURL.value, targetWidth, targetHeight),
      urlToImageData(drawing2DataURL.value, targetWidth, targetHeight),
      urlToImageData(currentTemplateSrc.value, targetWidth, targetHeight)
    ]);
    if (!data1 || !data2 || !templateImgData) {
      showError("Failed to process images for comparison.");
      return;
    }

    // Use Jaccard similarity on binarised images — immune to white-background bias
    const sim1vs2 = calculateJaccardSimilarity(data1, data2);
    const sim1vsT = calculateJaccardSimilarity(data1, templateImgData);
    const sim2vsT = calculateJaccardSimilarity(data2, templateImgData);

    const scores = calculateComparisonScores(
      { sim1vs2, sim1vsT, sim2vsT },
      drawing1Time.value,
      drawing2Time.value
    );

    const newComparisonSet = {
      id: allComparisonResults.value.length, 
      drawing1URL: drawing1DataURL.value,
      drawing2URL: drawing2DataURL.value,
      templateURL: currentTemplateSrc.value,
      sim1vs2: scores.sim1vs2, 
      sim1vsT: scores.sim1vsT, 
      sim2vsT: scores.sim2vsT,
      drawing1Time: drawing1Time.value, 
      drawing2Time: drawing2Time.value,
      avgLikeness: scores.avgLikeness,
      timeEfficiencyScore: scores.timeEfficiencyScore,
      overallScore: scores.overallScore
    };
    allComparisonResults.value.push(newComparisonSet);
    latestComparisonScores.value = {
        sim1vs2: scores.sim1vs2.toFixed(2), 
        sim1vsT: scores.sim1vsT.toFixed(2), 
        sim2vsT: scores.sim2vsT.toFixed(2),
        avgLikeness: scores.avgLikeness.toFixed(2),
        timeEfficiencyScore: scores.timeEfficiencyScore.toFixed(2),
        overallScore: scores.overallScore.toFixed(2)
    };
    scoreAnnouncement.value = `Comparison complete. Overall score: ${scores.overallScore.toFixed(2)}%. Average likeness: ${scores.avgLikeness.toFixed(2)}%.`;
    saveResultsToLocalStorage();
    if (drawingCanvasComponentRef.value) {
      showTemplateLayer.value = true; showDrawing1Layer.value = true; showDrawing2Layer.value = true;
      triggerMainCanvasCombinedDisplay();
    }
  } catch (error) {
    console.error("Error during comparison:", error);
    showError("An error occurred during image comparison.");
  } finally {
    isComparing.value = false;
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
  clearSessionState();
  if (drawingCanvasComponentRef.value) {
    drawingCanvasComponentRef.value.clearDrawingCanvas();
  }
}

function handleClearAllResults() {
  allComparisonResults.value = [];
  drawing1DataURL.value = null;
  drawing2DataURL.value = null;
  currentTemplateSrc.value = null;
  clearSessionState();
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

// Session storage — persists drawing state across accidental page refreshes
const SESSION_KEY = 'doubleImageVueSession';
function saveSessionState() {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      currentTemplateSrc: currentTemplateSrc.value,
      drawing1DataURL: drawing1DataURL.value,
      stage: stage.value,
    }));
  } catch (e) { console.error("Error saving session state:", e); }
}
function loadSessionState() {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (!saved) return;
    const { currentTemplateSrc: tpl, drawing1DataURL: d1, stage: s } = JSON.parse(saved);
    // Only restore if we were mid-drawing (not yet compared)
    if (tpl && s === 'readyForDrawing2') {
      currentTemplateSrc.value = tpl;
      drawing1DataURL.value = d1;
      stage.value = s;
    }
  } catch (e) { console.error("Error loading session state:", e); }
}
function clearSessionState() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
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
  loadSessionState();
});

defineExpose({ // For testing purposes
  loadResultsFromLocalStorage,
  loadThemeFromLocalStorage,
  compareAndDisplayResults,
});
</script>

<style>
#app-container { 
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 55px;
}

/* Stage progress indicator */
.stage-progress {
  display: flex;
  list-style: none;
  padding: 0;
  margin: 0 0 12px;
  gap: 0;
  counter-reset: step;
  width: 100%;
  max-width: 500px;
}
.stage-progress li {
  flex: 1;
  text-align: center;
  font-size: 0.75em;
  padding: 6px 2px;
  color: var(--subtitle-color-light, #555);
  border-bottom: 3px solid var(--border-color-light, #ccc);
  counter-increment: step;
  position: relative;
}
.stage-progress li::before {
  content: counter(step) ". ";
  font-weight: bold;
}
.stage-progress li.active {
  color: var(--text-color-light, #2c3e50);
  border-bottom-color: #3498db;
  font-weight: bold;
}
.stage-progress li.done {
  color: #27ae60;
  border-bottom-color: #27ae60;
}
body.dark-mode .stage-progress li {
  color: var(--subtitle-color-dark, #95a5a6);
  border-bottom-color: var(--border-color-dark, #34495e);
}
body.dark-mode .stage-progress li.active {
  color: var(--text-color-dark, #ecf0f1);
  border-bottom-color: #3498db;
}
body.dark-mode .stage-progress li.done {
  color: #2ecc71;
  border-bottom-color: #2ecc71;
}

/* Error banner */
.error-banner {
  width: 100%;
  max-width: 500px;
  background-color: #fce4e4;
  border: 1px solid #e74c3c;
  border-radius: 4px;
  color: #c0392b;
  padding: 8px 12px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
}
.error-banner button {
  background: none;
  border: none;
  color: #c0392b;
  cursor: pointer;
  font-size: 1em;
  padding: 0 4px;
}
body.dark-mode .error-banner {
  background-color: #4a2020;
  border-color: #e74c3c;
  color: #f1948a;
}
body.dark-mode .error-banner button {
  color: #f1948a;
}

/* Comparing overlay */
.comparing-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.35);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.2em;
  gap: 12px;
}
.comparing-spinner {
  display: block;
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Score results */
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

/* Scoring info */
.scoring-info {
  margin-top: 10px;
  font-size: 0.85em;
}
.scoring-info summary {
  cursor: pointer;
  font-weight: bold;
  color: var(--text-color-light);
  padding: 4px 0;
}
.scoring-info ul {
  margin: 6px 0 0 0;
  padding-left: 18px;
}
.scoring-info li {
  margin-bottom: 4px;
}
body.dark-mode .scoring-info summary {
  color: var(--text-color-dark);
}

.layer-controls {
  margin-top: 15px; padding-top: 10px;
  border-top: 1px solid var(--border-color-light);
}
body.dark-mode .layer-controls { border-top-color: var(--border-color-dark); }
.layer-controls h4 { margin-top: 0; margin-bottom: 8px; }
.layer-controls label { display: inline-block; margin-right: 15px; cursor: pointer; }
.layer-controls input[type="checkbox"] { margin-right: 5px; }

/* Visually hidden helper */
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
