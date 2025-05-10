<template>
  <div id="comparisonArea" v-if="results && results.length > 0">
    <div id="comparisonHeaderRow" class="comparison-header-row">
      <h2>Your comparisons:</h2>
      <div id="overallAverageContainer" style="font-weight: bold;">
        <p id="overallAverageText">Overall Average: {{ overallAverage.toFixed(2) }}%</p>
      </div>
    </div>
    <ComparisonSet 
      v-for="resultSet in displayedResults" 
      :key="resultSet.id" 
      :resultSet="resultSet"
    />
  </div>
</template>

<script setup>
import { defineProps, computed } from 'vue';
import ComparisonSet from './ComparisonSet.vue';

const props = defineProps({
  results: Array
});

const displayedResults = computed(() => {
  if (!props.results) return [];
  return [...props.results].reverse(); // Create a new reversed array for display
});

const overallAverage = computed(() => {
  if (!props.results || props.results.length === 0) {
    return 0;
  }
  let totalSimilarity = 0;
  let count = 0;
  props.results.forEach(set => {
    totalSimilarity += (Number(set.sim1vs2) || 0) + (Number(set.sim1vsT) || 0) + (Number(set.sim2vsT) || 0);
    count += 3;
  });
  return count > 0 ? totalSimilarity / count : 0;
});
</script>

<style scoped>
/* Styles are mostly global, but specific adjustments for this container can go here */
#comparisonArea {
  margin-top: 20px;
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column; /* Ensure sets stack vertically */
  align-items: center; /* Center content like the header row */
  border: 1px solid #ccc;
  padding: 10px;
}

.comparison-header-row {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding: 0 10px;
  box-sizing: border-box;
}

#comparisonArea h2 {
  margin: 0;
  text-align: left;
}

#overallAverageContainer {
  margin: 0;
  text-align: right;
}

#overallAverageContainer p {
  margin: 0;
}
</style>
