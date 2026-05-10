import { calculateComparisonScores, calculateJaccardSimilarity, performResemblanceAnalysis } from '@/utils/comparisonUtils.js';

describe('comparisonUtils.js', () => {
  describe('calculateJaccardSimilarity', () => {
    function makeImageData(pixels) {
      // pixels: array of booleans — true = drawn (black), false = background (white)
      const data = new Uint8ClampedArray(pixels.length * 4);
      pixels.forEach((drawn, i) => {
        const v = drawn ? 0 : 255;
        data[i * 4] = v;
        data[i * 4 + 1] = v;
        data[i * 4 + 2] = v;
        data[i * 4 + 3] = 255;
      });
      return { data, width: pixels.length, height: 1 };
    }

    it('should return 100 when both canvases are blank', () => {
      const blank = makeImageData([false, false]);
      expect(calculateJaccardSimilarity(blank, blank)).toBe(100);
    });

    it('should return 100 for identical drawings', () => {
      const img = makeImageData([true, false, true]);
      expect(calculateJaccardSimilarity(img, img)).toBeCloseTo(100);
    });

    it('should return 0 for completely non-overlapping drawings', () => {
      const a = makeImageData([true, false]);
      const b = makeImageData([false, true]);
      expect(calculateJaccardSimilarity(a, b)).toBe(0);
    });

    it('should return 50 for 50% overlap (1 shared, 1 exclusive each)', () => {
      const a = makeImageData([true, true, false]);  // drawn: pixels 0,1
      const b = makeImageData([true, false, true]);  // drawn: pixels 0,2
      // intersection = {0}, union = {0,1,2} => 1/3 ... wait
      // Actually: a={0,1}, b={0,2} => intersection={0}, union={0,1,2} => 1/3 ~33%
      expect(calculateJaccardSimilarity(a, b)).toBeCloseTo(33.33, 1);
    });
  });

  describe('calculateComparisonScores', () => {
    it('should calculate scores correctly with valid inputs', () => {
      const simScores = { sim1vs2: 90.0, sim1vsT: 80.0, sim2vsT: 70.0 };
      const scores = calculateComparisonScores(simScores, "10.0", "12.0");
      expect(scores.sim1vs2).toBe(90.00);
      expect(scores.sim1vsT).toBe(80.00);
      expect(scores.sim2vsT).toBe(70.00);
      expect(scores.avgLikeness).toBe(80.00);
      expect(scores.timeEfficiencyScore).toBe(96.00);
      expect(scores.overallScore).toBe(84.80);
    });

    it('should handle zero mismatch (100% similarity)', () => {
      const simScores = { sim1vs2: 100.0, sim1vsT: 100.0, sim2vsT: 100.0 };
      const scores = calculateComparisonScores(simScores, "5.0", "5.0");
      expect(scores.overallScore).toBe(100.00);
    });

    it('should handle 0% similarity', () => {
      const simScores = { sim1vs2: 0.0, sim1vsT: 0.0, sim2vsT: 0.0 };
      const scores = calculateComparisonScores(simScores, "60.0", "120.0");
      expect(scores.overallScore).toBe(0.00);
      expect(scores.timeEfficiencyScore).toBe(0.00);
    });

    it('should return all zeros if simScores is invalid', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const scores = calculateComparisonScores(null, "10", "10");
      expect(scores.overallScore).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith("Invalid simScores for score calculation");
      consoleErrorSpy.mockRestore();
    });

    it('should handle invalid time strings by penalizing timeEfficiencyScore', () => {
      const simScores = { sim1vs2: 90.0, sim1vsT: 80.0, sim2vsT: 70.0 };
      const scores = calculateComparisonScores(simScores, "abc", "10.0");
      expect(scores.timeEfficiencyScore).toBe(0);
    });
  });

  describe('performResemblanceAnalysis', () => {
    let mockResembleInstance;
    let originalWindowResemble;

    beforeEach(() => {
      mockResembleInstance = {
        compareTo: jest.fn().mockReturnThis(),
        ignoreAntialiasing: jest.fn().mockReturnThis(),
        ignoreColors: jest.fn().mockReturnThis(),
        onComplete: jest.fn(function(callback) {
          process.nextTick(() => callback({ rawMisMatchPercentage: Math.random() * 100 }));
          return this;
        }),
      };
      originalWindowResemble = window.resemble;
      window.resemble = jest.fn(() => mockResembleInstance);
    });

    afterEach(() => {
      window.resemble = originalWindowResemble;
    });

    it('should call resemble for all three comparisons', async () => {
      const dummyImageData = { data: new Uint8ClampedArray(4), width: 1, height: 1 };
      await performResemblanceAnalysis(dummyImageData, dummyImageData, dummyImageData);

      expect(window.resemble).toHaveBeenCalledTimes(3);
      expect(mockResembleInstance.compareTo).toHaveBeenCalledTimes(3);
      expect(mockResembleInstance.ignoreAntialiasing).toHaveBeenCalledTimes(3);
      expect(mockResembleInstance.ignoreColors).toHaveBeenCalledTimes(3);
      expect(mockResembleInstance.onComplete).toHaveBeenCalledTimes(3);
    });

    it('should resolve with an array of three results', async () => {
      const dummyImageData = { data: new Uint8ClampedArray(4), width: 1, height: 1 };
      const results = await performResemblanceAnalysis(dummyImageData, dummyImageData, dummyImageData);
      
      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(result).toHaveProperty('rawMisMatchPercentage');
      });
    });

    it('should throw an error if Resemble.js is not loaded', async () => {
      window.resemble = undefined;
      const dummyImageData = { data: new Uint8ClampedArray(4), width: 1, height: 1 };
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(performResemblanceAnalysis(dummyImageData, dummyImageData, dummyImageData))
        .rejects.toThrow("Resemble.js not loaded.");
      consoleErrorSpy.mockRestore();
    });

    it('should throw an error if ImageData is invalid', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const dummyImageData = { data: new Uint8ClampedArray(4), width: 1, height: 1 };

      await expect(performResemblanceAnalysis(null, dummyImageData, dummyImageData))
        .rejects.toThrow("Invalid ImageData for resemblance analysis.");
      consoleErrorSpy.mockRestore();
    });
  });
});
