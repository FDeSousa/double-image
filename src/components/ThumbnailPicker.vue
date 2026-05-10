<template>
  <div v-if="isVisible" id="predefinedThumbnailsContainer">
    <div 
      v-for="templateFile in predefinedTemplateFiles" 
      :key="templateFile.filename" 
      class="thumbnail-item"
      role="button"
      tabindex="0"
      :aria-label="`Select template: ${templateFile.name}`"
      @click="selectTemplate(templateFile.filename)"
      @keydown.enter.prevent="selectTemplate(templateFile.filename)"
      @keydown.space.prevent="selectTemplate(templateFile.filename)"
    >
      <img :src="`/template_images/${templateFile.filename}`" :alt="`Template: ${templateFile.name}`" class="template-thumbnail">
      <p class="thumbnail-name">{{ templateFile.name }}</p>
    </div>
  </div>
</template>

<script setup>
const { defineProps, defineEmits } = require('vue'); // For testing purposes

defineProps({
  isVisible: Boolean
});

const emit = defineEmits(['select-template']);

const predefinedTemplateFiles = [
  { "filename": "simple_stick.png", "name": "Simple Stick" },
  { "filename": "fighting_stick.png", "name": "Fighting Stick" }
];

function selectTemplate(filename) {
  emit('select-template', `/template_images/${filename}`);
}
</script>

<style scoped>
/* Scoped styles for ThumbnailPicker.vue if needed.
   Most styles are global from assets/style.css */
#predefinedThumbnailsContainer {
  /* Ensure it matches the global style or override if necessary */
  /* display: flex; /* This will be controlled by v-if, so direct display style is less critical here */
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid #eee;
  margin-top: 10px;
  margin-bottom: 10px;
  max-width: 100%;
}
</style>
