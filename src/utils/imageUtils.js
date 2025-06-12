export async function urlToImageData(url, targetWidth, targetHeight) {
  return new Promise((resolve, reject) => {
    if (!url) {
      // console.warn("urlToImageData: URL is null or undefined.");
      // Resolve with null or reject, depending on desired handling for null URLs.
      // For now, let's match App.vue's original implicit rejection for null.
      // However, the original code had `if (!url) reject(new Error("URL is null"));`
      // but this was inside the Promise constructor, which is not how it works.
      // The check should be outside or the promise should be rejected directly.
      // Let's assume null/empty URL means we can't produce ImageData.
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
      
      if (!ctx) { // Should not happen with standard canvas but good guard
        return reject(new Error("Failed to get 2D context from temporary canvas."));
      }

      // Calculate scaling to fit and center image
      const hRatio = targetWidth / img.naturalWidth;
      const vRatio = targetHeight / img.naturalHeight;
      const ratio = Math.min(hRatio, vRatio);
      const centerShiftX = (targetWidth - img.naturalWidth * ratio) / 2;
      const centerShiftY = (targetHeight - img.naturalHeight * ratio) / 2;
      
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight,
                    centerShiftX, centerShiftY, img.naturalWidth * ratio, img.naturalHeight * ratio);
      resolve(ctx.getImageData(0, 0, targetWidth, targetHeight));
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}
