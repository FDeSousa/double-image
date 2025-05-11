<template>
  <div v-if="isVisible" id="predefinedThumbnailsContainer">
    <div 
      v-for="templateFile in predefinedTemplateFiles" 
      :key="templateFile.filename" 
      class="thumbnail-item"
      @click="selectTemplate(templateFile.filename)"
    >
      <img :src="`/template_images/${templateFile.filename}`" :alt="`Template: ${templateFile.name}`" class="template-thumbnail">
      <p class="thumbnail-name">{{ templateFile.name }}</p>
    </div>
  </div>
</template>

<script setup>
// defineProps and defineEmits are compiler macros and do not need to be imported.
// eslint-disable-next-line no-undef
defineProps({
  isVisible: Boolean
});

// eslint-disable-next-line no-undef
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
