import { calculateComparisonScores, performResemblanceAnalysis } from '@/utils/comparisonUtils.js';

describe('comparisonUtils.js', () => {
  describe('calculateComparisonScores', () => {
    // ... existing tests for calculateComparisonScores ...
    it('should calculate scores correctly with valid inputs', () => {
      const resembleResults = [
        { rawMisMatchPercentage: 10.0 }, 
        { rawMisMatchPercentage: 20.0 }, 
        { rawMisMatchPercentage: 30.0 }, 
      ];
      const drawing1TimeStr = "10.0";
      const drawing2TimeStr = "12.0";
      const scores = calculateComparisonScores(resembleResults, drawing1TimeStr, drawing2TimeStr);
      expect(scores.sim1vs2).toBe(90.00);
      expect(scores.sim1vsT).toBe(80.00);
      expect(scores.sim2vsT).toBe(70.00);
      expect(scores.avgLikeness).toBe(80.00);
      expect(scores.timeEfficiencyScore).toBe(96.00);
      expect(scores.overallScore).toBe(84.80);
    });

    it('should handle zero mismatch (100% similarity)', () => {
      const resembleResults = [
        { rawMisMatchPercentage: 0.0 },
        { rawMisMatchPercentage: 0.0 },
        { rawMisMatchPercentage: 0.0 },
      ];
      const drawing1TimeStr = "5.0";
      const drawing2TimeStr = "5.0";
      const scores = calculateComparisonScores(resembleResults, drawing1TimeStr, drawing2TimeStr);
      expect(scores.overallScore).toBe(100.00);
    });

    it('should handle 100% mismatch (0% similarity)', () => {
      const resembleResults = [
        { rawMisMatchPercentage: 100.0 },
        { rawMisMatchPercentage: 100.0 },
        { rawMisMatchPercentage: 100.0 },
      ];
      const drawing1TimeStr = "60.0"; 
      const drawing2TimeStr = "120.0"; 
      const scores = calculateComparisonScores(resembleResults, drawing1TimeStr, drawing2TimeStr);
      expect(scores.overallScore).toBe(0.00);
      expect(scores.timeEfficiencyScore).toBe(0.00);
    });

    it('should return all zeros if resembleResults is invalid', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const scores = calculateComparisonScores(null, "10", "10");
      expect(scores.overallScore).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith("Invalid resembleResults for score calculation");
      consoleErrorSpy.mockRestore();
    });

    it('should handle invalid time strings by penalizing timeEfficiencyScore', () => {
        const resembleResults = [
            { rawMisMatchPercentage: 10.0 }, 
            { rawMisMatchPercentage: 20.0 }, 
            { rawMisMatchPercentage: 30.0 }, 
          ];
          const drawing1TimeStr = "abc"; 
          const drawing2TimeStr = "10.0";
          const scores = calculateComparisonScores(resembleResults, drawing1TimeStr, drawing2TimeStr);
          expect(scores.timeEfficiencyScore).toBe(0);
    });
  });

  describe('performResemblanceAnalysis', () => {
    let mockResembleInstance;
    let originalWindowResemble;

    beforeEach(() => {
      // Mock window.resemble
      mockResembleInstance = {
        compareTo: jest.fn().mockReturnThis(), // chainable
        onComplete: jest.fn(function(callback) {
          // Simulate async completion with dummy data
          // The actual data structure depends on what Resemble.js provides
          process.nextTick(() => callback({ rawMisMatchPercentage: Math.random() * 100 }));
          return this; // for chaining if any
        }),
      };
      originalWindowResemble = window.resemble; // Store original
      window.resemble = jest.fn(() => mockResembleInstance);
    });

    afterEach(() => {
      window.resemble = originalWindowResemble; // Restore original
    });

    it('should call resemble for all three comparisons', async () => {
      const dummyImageData = { data: new Uint8ClampedArray(4), width: 1, height: 1 };
      await performResemblanceAnalysis(dummyImageData, dummyImageData, dummyImageData);

      expect(window.resemble).toHaveBeenCalledTimes(3);
      expect(mockResembleInstance.compareTo).toHaveBeenCalledTimes(3);
      expect(mockResembleInstance.onComplete).toHaveBeenCalledTimes(3);

      // Check arguments for compareTo
      expect(mockResembleInstance.compareTo.mock.calls[0][0]).toBe(dummyImageData); // data1.compareTo(data2)
      expect(mockResembleInstance.compareTo.mock.calls[1][0]).toBe(dummyImageData); // data1.compareTo(templateImgData)
      expect(mockResembleInstance.compareTo.mock.calls[2][0]).toBe(dummyImageData); // data2.compareTo(templateImgData)
    });

    it('should resolve with an array of three results', async () => {
      const dummyImageData = { data: new Uint8ClampedArray(4), width: 1, height: 1 };
      const results = await performResemblanceAnalysis(dummyImageData, dummyImageData, dummyImageData);
      
      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(result).toHaveProperty('rawMisMatchPercentage');
        expect(typeof result.rawMisMatchPercentage).toBe('number');
      });
    });

    it('should throw an error if Resemble.js is not loaded', async () => {
      window.resemble = undefined; // Simulate Resemble.js not being loaded
      const dummyImageData = { data: new Uint8ClampedArray(4), width: 1, height: 1 };
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(performResemblanceAnalysis(dummyImageData, dummyImageData, dummyImageData))
        .rejects.toThrow("Resemble.js not loaded.");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Resemble.js not loaded.");
      consoleErrorSpy.mockRestore();
    });

    it('should throw an error if ImageData is invalid', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const dummyImageData = { data: new Uint8ClampedArray(4), width: 1, height: 1 };

      await expect(performResemblanceAnalysis(null, dummyImageData, dummyImageData))
        .rejects.toThrow("Invalid ImageData for resemblance analysis.");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Invalid ImageData for resemblance analysis.");
      consoleErrorSpy.mockRestore();
    });
  });
});
