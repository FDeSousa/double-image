<template>
  <div id="app-container">
    <h1>On the other hand</h1>
    <p class="subtitle">Try drawing with both hands! Can you be a two-hand artist?</p>

    <AppControls 
      @toggle-thumbnails="handleToggleThumbnails" 
      @clear-drawing="handleClearDrawing"
      @save-drawing-1="handleSaveDrawing1"
      @start-drawing-2="handleStartDrawing2"
      @save-drawing-2="handleSaveDrawing2"
      @restart-process="handleRestartProcess"
      @clear-all-results="handleClearAllResults"
      @template-file-selected="handleTemplateFileSelected"
      @toggle-theme="toggleTheme"
      :currentStage="stage" 
      :canClearAll="allComparisonResults.length > 0"
    />
    <ThumbnailPicker 
      :isVisible="thumbnailPickerVisible" 
      @select-template="handleTemplateSelected" 
    />

    <DrawingCanvas 
      :templateSrc="currentTemplateSrc" 
      :stage="stage"
      ref="drawingCanvasComponentRef" 
    />

    <ComparisonResults :results="allComparisonResults" />
  </div>
</template>

<script setup>
// Script setup for Vue 3 Composition API
import { ref, onMounted } from 'vue'; // Added onMounted
import AppControls from './components/AppControls.vue';
import ThumbnailPicker from './components/ThumbnailPicker.vue';
import DrawingCanvas from './components/DrawingCanvas.vue';
import ComparisonResults from './components/ComparisonResults.vue';

const thumbnailPickerVisible = ref(false);
const currentTemplateSrc = ref(null);
const drawingCanvasComponentRef = ref(null);
const stage = ref('initial'); // initial, drawing1, readyForDrawing2, drawing2, compared
const allComparisonResults = ref([]); 
const drawing1DataURL = ref(null);
// eslint-disable-next-line no-unused-vars
const drawing2DataURL = ref(null); 
const currentTheme = ref('light'); // 'light' or 'dark'

function handleToggleThumbnails() {
  thumbnailPickerVisible.value = !thumbnailPickerVisible.value;
}

function handleTemplateSelected(templatePath) {
  console.log("Template selected in App.vue:", templatePath);
  currentTemplateSrc.value = templatePath;
  if (drawingCanvasComponentRef.value) { // Clear canvas for new template
    drawingCanvasComponentRef.value.clearDrawingCanvas();
  }
  stage.value = 'drawing1'; 
  thumbnailPickerVisible.value = false; 
}

function handleTemplateFileSelected(file) {
  console.log("Template file selected:", file.name);
  const reader = new FileReader();
  reader.onload = (e) => {
    currentTemplateSrc.value = e.target.result;
    if (drawingCanvasComponentRef.value) { // Clear canvas for new template
        drawingCanvasComponentRef.value.clearDrawingCanvas();
    }
    stage.value = 'drawing1';
  };
  reader.onerror = (e) => {
    console.error("Error reading file:", e);
    alert("Error reading template file.");
  };
  reader.readAsDataURL(file);
}

function handleClearDrawing() {
  if (drawingCanvasComponentRef.value) {
    drawingCanvasComponentRef.value.clearDrawingCanvas();
  }
}

function handleSaveDrawing1() {
  console.log('Save Drawing 1 clicked');
  if (drawingCanvasComponentRef.value) {
    drawing1DataURL.value = drawingCanvasComponentRef.value.getCanvasDataURL();
    console.log('Drawing 1 saved:', drawing1DataURL.value ? 'Data captured' : 'No data');
    stage.value = 'readyForDrawing2';
    // The template image in DrawingCanvas will be hidden/shown based on templateSrc prop
    // We need to clear the canvas for the next drawing
    drawingCanvasComponentRef.value.clearDrawingCanvas(); 
  }
}

function handleStartDrawing2() {
  console.log('Start Drawing 2 clicked');
  stage.value = 'drawing2';
  if (drawingCanvasComponentRef.value) {
    drawingCanvasComponentRef.value.clearDrawingCanvas(); // Clear for second drawing
  }
  // Template visibility is handled by :templateSrc prop in DrawingCanvas
}

function handleSaveDrawing2() {
  console.log('Save Drawing 2 & Compare clicked');
  if (drawingCanvasComponentRef.value) {
    drawing2DataURL.value = drawingCanvasComponentRef.value.getCanvasDataURL();
    console.log('Drawing 2 saved:', drawing2DataURL.value ? 'Data captured' : 'No data');
    stage.value = 'compared';
    compareAndDisplayResults();
  }
}

async function urlToImageData(url) {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error("URL is null or empty"));
      return;
    }
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Handle CORS if loading from different origins
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Attempt to use natural dimensions, but fallback if not available (e.g. for very small/broken images)
      // For comparison, it's best if all images are compared at the same dimensions.
      // The drawing canvas dimensions could be a good reference.
      const targetWidth = drawingCanvasComponentRef.value?.drawingCanvasRef?.width || 500;
      const targetHeight = drawingCanvasComponentRef.value?.drawingCanvasRef?.height || 400;
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      
      // Draw image scaled to fit target dimensions while maintaining aspect ratio
      const hRatio = targetWidth / img.naturalWidth;
      const vRatio = targetHeight / img.naturalHeight;
      const ratio = Math.min(hRatio, vRatio);
      const centerShift_x = (targetWidth - img.naturalWidth * ratio) / 2;
      const centerShift_y = (targetHeight - img.naturalHeight * ratio) / 2;
      
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight,
                    centerShift_x, centerShift_y, img.naturalWidth * ratio, img.naturalHeight * ratio);
      resolve(ctx.getImageData(0, 0, targetWidth, targetHeight));
    };
    img.onerror = (err) => {
      console.error("Error loading image for ImageData conversion:", url, err);
      reject(new Error(`Failed to load image: ${url}`));
    };
    img.src = url;
  });
}

async function compareAndDisplayResults() {
  console.log('Comparing images...');
  if (!drawing1DataURL.value || !drawing2DataURL.value || !currentTemplateSrc.value) {
    console.error("Missing data for comparison.");
    return;
  }

  try {
    // Ensure ResembleJS is loaded (it's global via CDN)
    if (typeof window.resemble === 'undefined') {
      alert("Resemble.js not loaded. Cannot compare images.");
      console.error("Resemble.js is not defined on window.");
      return;
    }

    const [data1, data2, templateImgData] = await Promise.all([
      urlToImageData(drawing1DataURL.value),
      urlToImageData(drawing2DataURL.value),
      urlToImageData(currentTemplateSrc.value)
    ]);

    if (!data1 || !data2 || !templateImgData) {
        console.error("Failed to convert one or more images to ImageData.");
        return;
    }
    
    // Placeholder for actual comparison logic
    // console.log("ImageData ready for comparison: ", { data1, data2, templateImgData });

    const comparisonPromises = [
      new Promise(resolve => window.resemble(data1).compareTo(data2).ignoreColors().onComplete(resolve)),
      new Promise(resolve => window.resemble(data1).compareTo(templateImgData).ignoreColors().onComplete(resolve)),
      new Promise(resolve => window.resemble(data2).compareTo(templateImgData).ignoreColors().onComplete(resolve))
    ];

    const results = await Promise.all(comparisonPromises);

    const sim1vs2 = 100 - parseFloat(results[0].rawMisMatchPercentage);
    const sim1vsT = 100 - parseFloat(results[1].rawMisMatchPercentage);
    const sim2vsT = 100 - parseFloat(results[2].rawMisMatchPercentage);

    console.log(`Similarity - Drawing 1 vs Drawing 2: ${sim1vs2.toFixed(2)}%`);
    console.log(`Similarity - Drawing 1 vs Template: ${sim1vsT.toFixed(2)}%`);
    console.log(`Similarity - Drawing 2 vs Template: ${sim2vsT.toFixed(2)}%`);

    const newComparisonSet = {
      id: allComparisonResults.value.length, // Simple ID for now
      drawing1URL: drawing1DataURL.value,
      drawing2URL: drawing2DataURL.value,
      templateURL: currentTemplateSrc.value,
      sim1vs2: sim1vs2,
      sim1vsT: sim1vsT,
      sim2vsT: sim2vsT,
    };
    allComparisonResults.value.push(newComparisonSet);
    saveResultsToLocalStorage(); // Save after adding new set
    // Overall average is a computed prop in ComparisonResults, so it will update automatically.

  } catch (error) {
    console.error("Error during image data conversion or comparison:", error);
    alert("An error occurred during image comparison. Check the console.");
  }
  // This will involve:
  // 1. Getting ImageData for drawing1DataURL, drawing2DataURL, and currentTemplateSrc (if it's an image URL)
  //    or directly from canvas if we decide to draw template onto a hidden canvas.
  // 2. Using Resemble.js to compare them.
  // 3. Storing results in allComparisonResults.
  // 4. Making comparisonArea visible.
  console.log('Drawing 1 URL:', drawing1DataURL.value);
  console.log('Drawing 2 URL:', drawing2DataURL.value);
  console.log('Template URL:', currentTemplateSrc.value);
  
  // Visibility of comparisonArea is now handled by v-if in ComparisonResults.vue
}

function handleRestartProcess() {
  console.log('Restart Process clicked');
  currentTemplateSrc.value = null; 
  drawing1DataURL.value = null;
  drawing2DataURL.value = null;
  stage.value = 'initial';
  if (drawingCanvasComponentRef.value) {
    drawingCanvasComponentRef.value.clearDrawingCanvas();
  }
  // Comparison results are not cleared here, only the current drawing process
}

function handleClearAllResults() {
  console.log('Clear All Results clicked');
  allComparisonResults.value = [];
  drawing1DataURL.value = null;
  drawing2DataURL.value = null;
  currentTemplateSrc.value = null; // Also clear current template
  saveResultsToLocalStorage(); // Save the empty array to localStorage
  stage.value = 'initial'; // Reset stage
  if (drawingCanvasComponentRef.value) {
    drawingCanvasComponentRef.value.clearDrawingCanvas();
  }
}

const LOCAL_STORAGE_KEY = 'doubleImageVueResults';

function saveResultsToLocalStorage() {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allComparisonResults.value));
    console.log('Results saved to localStorage');
  } catch (e) {
    console.error("Error saving results to localStorage:", e);
  }
}

function loadResultsFromLocalStorage() {
  try {
    const savedResults = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedResults) {
      allComparisonResults.value = JSON.parse(savedResults);
      console.log('Results loaded from localStorage');
    }
  } catch (e) {
    console.error("Error loading results from localStorage:", e);
    allComparisonResults.value = []; 
  }
}

const THEME_STORAGE_KEY = 'doubleImageVueTheme';

function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
  currentTheme.value = theme;
}

function toggleTheme() {
  const newTheme = currentTheme.value === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  } catch (e) {
    console.error("Error saving theme to localStorage:", e);
  }
}

function loadThemeFromLocalStorage() {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme) {
      applyTheme(savedTheme);
    } else {
      applyTheme('light'); // Default to light theme
    }
  } catch (e) {
    console.error("Error loading theme from localStorage:", e);
    applyTheme('light'); // Default on error
  }
}

onMounted(() => {
  loadResultsFromLocalStorage();
  loadThemeFromLocalStorage();
});

// We will add imports and logic here as we build components
</script>

<style>
/* Styles from style.css are now global. 
   App-specific or scoped styles can be added here if needed. */
#app-container { /* Changed from #app to avoid conflict if #app is used by Vue internally on body */
  display: flex;
  flex-direction: column;
  align-items: center;
  /* padding: 20px; /* This is in body style.css, so might not be needed here */
}
</style>
