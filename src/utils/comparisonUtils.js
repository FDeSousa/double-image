/**
 * Computes the Jaccard similarity of drawn (non-white) pixels between two binarised ImageData objects.
 * Returns a value in [0, 100]: 0 when the drawings share no pixel, 100 when identical.
 * This metric is immune to white-background bias because it only considers drawn pixels.
 * @param {ImageData} imageDataA
 * @param {ImageData} imageDataB
 * @returns {number}
 */
export function calculateJaccardSimilarity(imageDataA, imageDataB) {
  const a = imageDataA.data;
  const b = imageDataB.data;
  let intersection = 0;
  let union = 0;
  // Each pixel is 4 bytes (R,G,B,A); a pure-black pixel (drawn) has R===0.
  for (let i = 0; i < a.length; i += 4) {
    const drawnA = a[i] === 0;
    const drawnB = b[i] === 0;
    if (drawnA || drawnB) union++;
    if (drawnA && drawnB) intersection++;
  }
  if (union === 0) return 100; // both canvases are blank — treat as identical
  return (intersection / union) * 100;
}

/**
 * Calculates the final comparison scores from pre-computed similarity values and drawing times.
 * @param {{ sim1vs2: number, sim1vsT: number, sim2vsT: number }} simScores
 * @param {string} drawing1TimeStr
 * @param {string} drawing2TimeStr
 */
export function calculateComparisonScores(simScores, drawing1TimeStr, drawing2TimeStr) {
  if (!simScores || typeof simScores.sim1vs2 !== 'number') {
    console.error("Invalid simScores for score calculation");
    return {
      sim1vs2: 0, sim1vsT: 0, sim2vsT: 0,
      avgLikeness: 0, timeEfficiencyScore: 0, overallScore: 0,
    };
  }

  const drawing1Time = parseFloat(drawing1TimeStr);
  const drawing2Time = parseFloat(drawing2TimeStr);

  const d1Time = isNaN(drawing1Time) ? 999 : drawing1Time;
  const d2Time = isNaN(drawing2Time) ? 999 : drawing2Time;

  const { sim1vs2, sim1vsT, sim2vsT } = simScores;

  const avgLikeness = (sim1vs2 + sim1vsT + sim2vsT) / 3;

  const timeDiff = Math.abs(d1Time - d2Time);
  const timeEfficiencyK = 2;
  const timeEfficiencyScore = Math.max(0, 100 - (timeDiff * timeEfficiencyK));

  const weightLikeness = 0.7;
  const weightTime = 0.3;
  const overallScore = (weightLikeness * avgLikeness) + (weightTime * timeEfficiencyScore);

  return {
    sim1vs2: parseFloat(sim1vs2.toFixed(2)),
    sim1vsT: parseFloat(sim1vsT.toFixed(2)),
    sim2vsT: parseFloat(sim2vsT.toFixed(2)),
    avgLikeness: parseFloat(avgLikeness.toFixed(2)),
    timeEfficiencyScore: parseFloat(timeEfficiencyScore.toFixed(2)),
    overallScore: parseFloat(overallScore.toFixed(2)),
  };
}

export async function performResemblanceAnalysis(imageData1, imageData2, templateImageData) {
  if (typeof window.resemble === 'undefined') {
    console.error("Resemble.js not loaded.");
    throw new Error("Resemble.js not loaded.");
  }
  if (!imageData1 || !imageData2 || !templateImageData) {
    console.error("Invalid ImageData for resemblance analysis.");
    throw new Error("Invalid ImageData for resemblance analysis.");
  }

  const comparisonPromises = [
    new Promise(resolve => window.resemble(imageData1).compareTo(imageData2).ignoreAntialiasing().ignoreColors().onComplete(resolve)),
    new Promise(resolve => window.resemble(imageData1).compareTo(templateImageData).ignoreAntialiasing().ignoreColors().onComplete(resolve)),
    new Promise(resolve => window.resemble(imageData2).compareTo(templateImageData).ignoreAntialiasing().ignoreColors().onComplete(resolve))
  ];
  return Promise.all(comparisonPromises);
}
