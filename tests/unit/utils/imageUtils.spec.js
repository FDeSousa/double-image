import { urlToImageData, binariseImageData } from '@/utils/imageUtils.js';

global.Image = class {
  constructor() {
    this.onload = null; 
    this.onerror = null;
    this._src = '';

    Object.defineProperty(this, 'src', {
      configurable: true,
      set(value) {
        this._src = value;
        process.nextTick(() => {
          if (value && value !== 'fail_load.png' && typeof this.onload === 'function') {
            this.naturalWidth = 100;
            this.naturalHeight = 100;
            this.onload();
          } else if (value === 'fail_load.png' && typeof this.onerror === 'function') {
            this.onerror(new Error('Mock image load error'));
          } else if (typeof this.onerror === 'function' && (!value || value === 'fail_load.png')) {
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

const mockCanvasContext = {
  fillStyle: '',
  fillRect: jest.fn(),
  drawImage: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Uint8ClampedArray([255,255,255,255, 0,0,0,255]), width: 2, height: 1 })),
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
    jest.clearAllMocks();
    mockCanvasElement.width = 0;
    mockCanvasElement.height = 0;
  });

  describe('binariseImageData', () => {
    it('should turn bright pixels white and dark pixels black', () => {
      const data = new Uint8ClampedArray([
        200, 200, 200, 255, // luminance ~200 => dark => black
        250, 250, 250, 255, // luminance 250 => bright => white
        0,   0,   0,   255, // luminance 0 => black
        255, 255, 255, 255, // luminance 255 => white
      ]);
      const imageData = { data };
      binariseImageData(imageData, 240);
      // pixel 0: 200 < 240 threshold => black
      expect(data[0]).toBe(0); expect(data[1]).toBe(0); expect(data[2]).toBe(0);
      // pixel 1: 250 > 240 => white
      expect(data[4]).toBe(255); expect(data[5]).toBe(255); expect(data[6]).toBe(255);
      // pixel 2: 0 < 240 => black
      expect(data[8]).toBe(0);
      // pixel 3: 255 > 240 => white
      expect(data[12]).toBe(255);
    });

    it('should set alpha to fully opaque for all pixels', () => {
      const data = new Uint8ClampedArray([100, 100, 100, 128]); // semi-transparent
      const imageData = { data };
      binariseImageData(imageData);
      expect(data[3]).toBe(255);
    });

    it('should return the same ImageData object (mutates in place)', () => {
      const imageData = { data: new Uint8ClampedArray(4) };
      const result = binariseImageData(imageData);
      expect(result).toBe(imageData);
    });
  });

  describe('urlToImageData', () => {
    it('should resolve with binarised ImageData on successful image load', async () => {
      const testUrl = 'test.png';
      const targetWidth = 100;
      const targetHeight = 100;
      
      const imageData = await urlToImageData(testUrl, targetWidth, targetHeight);

      expect(document.createElement).toHaveBeenCalledWith('canvas');
      expect(mockCanvasElement.width).toBe(targetWidth);
      expect(mockCanvasElement.height).toBe(targetHeight);
      expect(mockCanvasElement.getContext).toHaveBeenCalledWith('2d');
      expect(mockCanvasContext.fillRect).toHaveBeenCalledWith(0, 0, targetWidth, targetHeight);
      expect(mockCanvasContext.drawImage).toHaveBeenCalled();
      expect(mockCanvasContext.getImageData).toHaveBeenCalledWith(0, 0, targetWidth, targetHeight);
      expect(imageData).toBeDefined();
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
      const errorUrl = 'fail_load.png';
      await expect(urlToImageData(errorUrl, 100, 100)).rejects.toThrow(`Failed to load image: ${errorUrl}`);
    });
    
    it('should reject if getContext returns null', async () => {
      mockCanvasElement.getContext.mockReturnValueOnce(null);
      await expect(urlToImageData('test.png', 100, 100)).rejects.toThrow("Failed to get 2D context from temporary canvas.");
    });
  });
});
