import { urlToImageData } from '@/utils/imageUtils.js';

// Global Image mock is already in DrawingCanvas.spec.js,
// but Jest runs tests in separate environments. So, we need it here too,
// or move it to a Jest setup file. For now, let's redefine it.
global.Image = class {
  constructor() {
    // These will be reassigned by the code under test
    this.onload = null; 
    this.onerror = null;
    this._src = ''; // Internal storage for src

    Object.defineProperty(this, 'src', {
      configurable: true, // Allow redefinition for tests if needed
      set(value) {
        this._src = value;
        // Simulate async loading
        process.nextTick(() => {
          if (value && value !== 'fail_load.png' && typeof this.onload === 'function') {
            this.naturalWidth = 100; // Mock dimensions
            this.naturalHeight = 100;
            this.onload();
          } else if (value === 'fail_load.png' && typeof this.onerror === 'function') {
            this.onerror(new Error('Mock image load error'));
          } else if (typeof this.onerror === 'function' && (!value || value === 'fail_load.png')) {
            // If src is empty or still fail_load but no specific onerror for fail_load, call generic error
            this.onerror(new Error('Mock image load error for empty or unspecified fail src'));
          }
        });
      },
      get() {
        return this._src;
      }
    });
  }
};


// Mock document.createElement('canvas')
const mockCanvasContext = {
  drawImage: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Uint8ClampedArray([1,2,3,4]), width: 100, height: 100 })), // Dummy ImageData
};
const mockCanvasElement = {
  getContext: jest.fn(() => mockCanvasContext),
  width: 0,
  height: 0,
};
global.document.createElement = jest.fn((elementName) => {
  if (elementName === 'canvas') {
    return mockCanvasElement;
  }
  throw new Error(`document.createElement mock doesn't support ${elementName}`);
});


describe('imageUtils.js', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Reset properties on shared mock instances (if any were used, but Image is new each time)
    // mockImageInstance.naturalWidth = 0; // Not needed if Image is a class creating new instances
    // mockImageInstance.naturalHeight = 0;
    // mockImageInstance.src = '';
    mockCanvasElement.width = 0;
    mockCanvasElement.height = 0;
  });

  describe('urlToImageData', () => {
    it('should resolve with ImageData on successful image load', async () => {
      const testUrl = 'test.png';
      const targetWidth = 100;
      const targetHeight = 100;
      
      const imageData = await urlToImageData(testUrl, targetWidth, targetHeight);

      // expect(global.Image).toHaveBeenCalledTimes(1); // global.Image is a class, not a jest.fn() spy itself
      // We can infer Image was constructed if other parts of the chain work.
      // For example, if drawImage was called, an image must have been "loaded".
      expect(document.createElement).toHaveBeenCalledWith('canvas');
      expect(mockCanvasElement.width).toBe(targetWidth);
      expect(mockCanvasElement.height).toBe(targetHeight);
      expect(mockCanvasElement.getContext).toHaveBeenCalledWith('2d');
      expect(mockCanvasContext.drawImage).toHaveBeenCalled();
      expect(mockCanvasContext.getImageData).toHaveBeenCalledWith(0, 0, targetWidth, targetHeight);
      expect(imageData).toBeDefined();
      expect(imageData.width).toBe(100); // From mockCanvasContext.getImageData
    });

    it('should reject if URL is null or empty', async () => {
      await expect(urlToImageData(null, 100, 100)).rejects.toThrow("URL is null or empty");
      await expect(urlToImageData('', 100, 100)).rejects.toThrow("URL is null or empty");
    });

    it('should reject if target dimensions are invalid', async () => {
      await expect(urlToImageData('test.png', 0, 100)).rejects.toThrow("Target width and height must be provided and be non-zero.");
      await expect(urlToImageData('test.png', 100, 0)).rejects.toThrow("Target width and height must be provided and be non-zero.");
    });

    it('should reject on image load error', async () => {
      const errorUrl = 'fail_load.png'; // Special URL for our mock Image to trigger error
      // The global.Image mock will call onerror for this src
      await expect(urlToImageData(errorUrl, 100, 100)).rejects.toThrow(`Failed to load image: ${errorUrl}`);
    });
    
    it('should reject if getContext returns null (though unlikely)', async () => {
      mockCanvasElement.getContext.mockReturnValueOnce(null);
      await expect(urlToImageData('test.png', 100, 100)).rejects.toThrow("Failed to get 2D context from temporary canvas.");
    });
  });
});
