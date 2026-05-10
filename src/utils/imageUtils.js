/**
 * Converts an ImageData object to a binary (black-and-white) representation.
 * Pixels brighter than `threshold` become pure white; all others become pure black.
 * This removes the white-background bias from pixel-difference comparisons.
 * @param {ImageData} imageData
 * @param {number} [threshold=240]
 * @returns {ImageData} The same ImageData object, mutated in place.
 */
export function binariseImageData(imageData, threshold = 240) {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Perceived-luminance weighting (ITU-R BT.601)
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    const isBackground = luminance > threshold;
    data[i]     = isBackground ? 255 : 0;
    data[i + 1] = isBackground ? 255 : 0;
    data[i + 2] = isBackground ? 255 : 0;
    data[i + 3] = 255; // fully opaque
  }
  return imageData;
}

export async function urlToImageData(url, targetWidth, targetHeight) {
  return new Promise((resolve, reject) => {
    if (!url) {
      return reject(new Error("URL is null or empty"));
    }
    if (!targetWidth || !targetHeight) {
        return reject(new Error("Target width and height must be provided and be non-zero."));
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        return reject(new Error("Failed to get 2D context from temporary canvas."));
      }

      // Fill with white so transparent areas compare as background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Calculate scaling to fit and center image
      const hRatio = targetWidth / img.naturalWidth;
      const vRatio = targetHeight / img.naturalHeight;
      const ratio = Math.min(hRatio, vRatio);
      const centerShiftX = (targetWidth - img.naturalWidth * ratio) / 2;
      const centerShiftY = (targetHeight - img.naturalHeight * ratio) / 2;
      
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight,
                    centerShiftX, centerShiftY, img.naturalWidth * ratio, img.naturalHeight * ratio);
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      resolve(binariseImageData(imageData));
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}
