export function calculateComparisonScores(resembleResults, drawing1TimeStr, drawing2TimeStr) {
  if (!resembleResults || resembleResults.length < 3) {
    console.error("Invalid resembleResults for score calculation");
    return {
      sim1vs2: 0, sim1vsT: 0, sim2vsT: 0,
      avgLikeness: 0, timeEfficiencyScore: 0, overallScore: 0,
    };
  }

  const drawing1Time = parseFloat(drawing1TimeStr);
  const drawing2Time = parseFloat(drawing2TimeStr);

  const d1Time = isNaN(drawing1Time) ? 999 : drawing1Time;
  const d2Time = isNaN(drawing2Time) ? 999 : drawing2Time;

  const sim1vs2 = 100 - parseFloat(resembleResults[0].rawMisMatchPercentage);
  const sim1vsT = 100 - parseFloat(resembleResults[1].rawMisMatchPercentage);
  const sim2vsT = 100 - parseFloat(resembleResults[2].rawMisMatchPercentage);

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
    new Promise(resolve => window.resemble(imageData1).compareTo(imageData2).onComplete(resolve)),
    new Promise(resolve => window.resemble(imageData1).compareTo(templateImageData).onComplete(resolve)),
    new Promise(resolve => window.resemble(imageData2).compareTo(templateImageData).onComplete(resolve))
  ];
  return Promise.all(comparisonPromises);
}
