import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

const TARGET_SIZE = 800; // Target dimension for processed images
const PADDING = 40; // Padding around the product

let segmenter: any = null;

// Lazy load the segmentation model
const getSegmenter = async () => {
  if (!segmenter) {
    console.log('Loading segmentation model...');
    segmenter = await pipeline('image-segmentation', 'Xenova/segformer-b0-finetuned-ade-512-512', {
      device: 'webgpu',
    });
  }
  return segmenter;
};

export const loadImage = (file: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

const removeBackground = async (imageElement: HTMLImageElement): Promise<ImageData> => {
  const seg = await getSegmenter();
  
  // Create canvas for input image
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  
  // Resize for processing (max 1024px)
  let width = imageElement.naturalWidth;
  let height = imageElement.naturalHeight;
  const maxDim = 1024;
  
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }
  
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(imageElement, 0, 0, width, height);
  
  const imageData = canvas.toDataURL('image/jpeg', 0.9);
  console.log('Processing with segmentation model...');
  
  const result = await seg(imageData);
  
  if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
    throw new Error('Invalid segmentation result');
  }
  
  // Apply mask to remove background
  const outputImageData = ctx.getImageData(0, 0, width, height);
  const data = outputImageData.data;
  
  for (let i = 0; i < result[0].mask.data.length; i++) {
    // Invert mask to keep subject
    const alpha = Math.round((1 - result[0].mask.data[i]) * 255);
    data[i * 4 + 3] = alpha;
  }
  
  return outputImageData;
};

const findBoundingBox = (imageData: ImageData): { x: number; y: number; width: number; height: number } => {
  const { data, width, height } = imageData;
  let minX = width, minY = height, maxX = 0, maxY = 0;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];
      if (alpha > 20) { // Threshold for visible pixels
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
};

export const processProductImage = async (
  file: Blob,
  onProgress?: (status: string) => void
): Promise<Blob> => {
  try {
    onProgress?.('Loading image...');
    const img = await loadImage(file);
    
    onProgress?.('Removing background...');
    const maskedImageData = await removeBackground(img);
    
    onProgress?.('Cropping to product...');
    const bounds = findBoundingBox(maskedImageData);
    
    // Create canvas with the masked image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = maskedImageData.width;
    tempCanvas.height = maskedImageData.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) throw new Error('Could not get temp canvas context');
    tempCtx.putImageData(maskedImageData, 0, 0);
    
    // Calculate output size maintaining aspect ratio
    const productWidth = bounds.width;
    const productHeight = bounds.height;
    const aspectRatio = productWidth / productHeight;
    
    let outputWidth: number, outputHeight: number;
    const availableSize = TARGET_SIZE - (PADDING * 2);
    
    if (aspectRatio > 1) {
      // Wider than tall
      outputWidth = availableSize;
      outputHeight = Math.round(availableSize / aspectRatio);
    } else {
      // Taller than wide
      outputHeight = availableSize;
      outputWidth = Math.round(availableSize * aspectRatio);
    }
    
    // Create final canvas with white background
    onProgress?.('Creating final image...');
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = TARGET_SIZE;
    finalCanvas.height = TARGET_SIZE;
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) throw new Error('Could not get final canvas context');
    
    // Fill with white background
    finalCtx.fillStyle = '#FFFFFF';
    finalCtx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);
    
    // Calculate centered position
    const offsetX = Math.round((TARGET_SIZE - outputWidth) / 2);
    const offsetY = Math.round((TARGET_SIZE - outputHeight) / 2);
    
    // Draw the cropped product centered
    finalCtx.drawImage(
      tempCanvas,
      bounds.x, bounds.y, bounds.width, bounds.height, // Source
      offsetX, offsetY, outputWidth, outputHeight // Destination
    );
    
    onProgress?.('Finalizing...');
    
    return new Promise((resolve, reject) => {
      const writeWebp = () => finalCanvas.toBlob(
        (blob) => {
          if (blob) {
            console.log('Successfully processed image (webp)');
            resolve(blob);
          } else {
            // Browser doesn't support WebP encode → fall back to JPEG
            finalCanvas.toBlob(
              (jpegBlob) => jpegBlob ? resolve(jpegBlob) : reject(new Error('Failed to create blob')),
              'image/jpeg',
              0.92
            );
          }
        },
        'image/webp',
        0.85
      );
      writeWebp();
    });
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
};
