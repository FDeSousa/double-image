<template>
  <div id="app-container">
    <h1>On the other hand</h1>
    <p class="subtitle">Try drawing with both hands! Can you be a two-hand artist?</p>

    <div class="controls">
        <button id="loadTemplateBtn">Load your template picture</button>
        <input type="file" id="templateInput" accept="image/*" style="display: none;">
        <button id="pickPredefinedBtn">Pick one of ours</button>
        <button id="clearBtn">Clear drawing</button>
        <button id="save1Btn" style="display: none;">Save first drawing</button>
        <button id="start2Btn" style="display: none;">Start second drawing</button>
        <button id="save2Btn" style="display: none;">Save second drawing & compare</button>
        <button id="restartBtn" style="display: none;">Restart this drawing pair</button>
        <button id="clearAllBtn" style="display: none;">Clear all saved results</button>
    </div>
    <div id="predefinedThumbnailsContainer" style="display: none;">
        <!-- Thumbnails will be populated here -->
    </div>

    <div id="drawingArea">
        <img id="templateImage" src="#" alt="Template Image" style="display: none;">
        <canvas id="drawingCanvas"></canvas>
    </div>

    <div id="comparisonArea" style="display: none;">
        <div id="comparisonHeaderRow" class="comparison-header-row">
            <h2>Your comparisons:</h2>
            <div id="overallAverageContainer" style="font-weight: bold;">
                <p id="overallAverageText">All drawings average score: -</p>
            </div>
        </div>
        <!-- Content will be dynamically generated -->
    </div>
  </div>
</template>

<script setup>
// Script setup for Vue 3 Composition API
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
