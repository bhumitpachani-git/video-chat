import { useEffect, useRef, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as bodyPix from '@tensorflow-models/body-pix';

export interface VirtualBackgroundOptions {
  backgroundBlur: boolean;
  backgroundImage: string | null;
  blurAmount?: number;
  edgeBlurAmount?: number;
}

interface UseVirtualBackgroundResult {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isModelLoading: boolean;
  isModelReady: boolean;
  error: string | null;
  startProcessing: (videoElement: HTMLVideoElement) => void;
  stopProcessing: () => void;
}

export function useVirtualBackground(
  options: VirtualBackgroundOptions
): UseVirtualBackgroundResult {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const modelRef = useRef<bodyPix.BodyPix | null>(null);
  const animationRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load background image when URL changes
  useEffect(() => {
    if (options.backgroundImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        backgroundImageRef.current = img;
        console.log('[VirtualBackground] Background image loaded');
      };
      img.onerror = () => {
        console.error('[VirtualBackground] Failed to load background image');
        backgroundImageRef.current = null;
      };
      img.src = options.backgroundImage;
    } else {
      backgroundImageRef.current = null;
    }
  }, [options.backgroundImage]);

  // Load BodyPix model
  useEffect(() => {
    const loadModel = async () => {
      if (modelRef.current) return;
      
      try {
        setIsModelLoading(true);
        setError(null);
        
        console.log('[VirtualBackground] Loading TensorFlow.js...');
        await tf.ready();
        
        // Use WebGL backend for better performance
        await tf.setBackend('webgl');
        console.log('[VirtualBackground] TensorFlow backend:', tf.getBackend());
        
        console.log('[VirtualBackground] Loading BodyPix model...');
        // Use proper config object matching BodyPix API
        modelRef.current = await bodyPix.load({
          architecture: 'MobileNetV1',
          outputStride: 16,
          multiplier: 0.75,
          quantBytes: 2,
        });
        
        setIsModelReady(true);
        console.log('[VirtualBackground] Model loaded successfully');
      } catch (err) {
        console.error('[VirtualBackground] Model loading error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load model');
      } finally {
        setIsModelLoading(false);
      }
    };

    if (options.backgroundBlur || options.backgroundImage) {
      loadModel();
    }

    return () => {
      // Clean up on unmount
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [options.backgroundBlur, options.backgroundImage]);

  // Process frame with virtual background
  const processFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const model = modelRef.current;

    if (!video || !canvas || !model || video.readyState < 2) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    try {
      // Get person segmentation with proper config
      const segmentation = await model.segmentPerson(video, {
        flipHorizontal: false,
        internalResolution: 'medium',
        segmentationThreshold: 0.7,
        maxDetections: 1,
        scoreThreshold: 0.3,
        nmsRadius: 20,
      });

      const width = canvas.width;
      const height = canvas.height;

      // Create offscreen canvas if needed
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement('canvas');
      }
      const offscreen = offscreenCanvasRef.current;
      offscreen.width = width;
      offscreen.height = height;
      const offCtx = offscreen.getContext('2d')!;

      // Clear the main canvas
      ctx.clearRect(0, 0, width, height);

      // Create mask from segmentation
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext('2d')!;

      // Draw person mask with smooth edges
      const maskImageData = maskCtx.createImageData(width, height);
      const maskData = segmentation.data;
      
      // Scale segmentation to canvas size
      const segWidth = segmentation.width;
      const segHeight = segmentation.height;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const segX = Math.floor((x / width) * segWidth);
          const segY = Math.floor((y / height) * segHeight);
          const segIdx = segY * segWidth + segX;
          const idx = (y * width + x) * 4;
          
          const isPerson = maskData[segIdx] === 1;
          
          maskImageData.data[idx] = 255;
          maskImageData.data[idx + 1] = 255;
          maskImageData.data[idx + 2] = 255;
          maskImageData.data[idx + 3] = isPerson ? 255 : 0;
        }
      }
      
      maskCtx.putImageData(maskImageData, 0, 0);
      
      // Apply edge blur to mask for smoother edges
      if (options.edgeBlurAmount && options.edgeBlurAmount > 0) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d')!;
        
        tempCtx.filter = `blur(${options.edgeBlurAmount}px)`;
        tempCtx.drawImage(maskCanvas, 0, 0);
        maskCtx.clearRect(0, 0, width, height);
        maskCtx.drawImage(tempCanvas, 0, 0);
      }

      // Step 1: Draw background
      if (options.backgroundImage && backgroundImageRef.current) {
        const img = backgroundImageRef.current;
        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;
        
        let dW: number, dH: number, dX: number, dY: number;
        if (imgRatio > canvasRatio) {
          dH = height;
          dW = height * imgRatio;
          dX = (width - dW) / 2;
          dY = 0;
        } else {
          dW = width;
          dH = width / imgRatio;
          dX = 0;
          dY = (height - dH) / 2;
        }
        ctx.drawImage(img, dX, dY, dW, dH);
      } else if (options.backgroundBlur) {
        offCtx.clearRect(0, 0, width, height);
        offCtx.filter = `blur(${options.blurAmount || 15}px)`;
        offCtx.drawImage(video, 0, 0, width, height);
        offCtx.filter = 'none';
        ctx.drawImage(offscreen, 0, 0);
      }

      // Step 2: Create masked person image
      const personCanvas = document.createElement('canvas');
      personCanvas.width = width;
      personCanvas.height = height;
      const personCtx = personCanvas.getContext('2d')!;
      
      // Draw the video frame
      personCtx.drawImage(video, 0, 0, width, height);
      
      // Apply mask using composite operation
      personCtx.globalCompositeOperation = 'destination-in';
      personCtx.drawImage(maskCanvas, 0, 0);
      
      // Step 3: Draw masked person on top of background
      ctx.drawImage(personCanvas, 0, 0);

    } catch (err) {
      // If segmentation fails, just draw the video
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    animationRef.current = requestAnimationFrame(processFrame);
  }, [options.backgroundBlur, options.backgroundImage, options.blurAmount, options.edgeBlurAmount]);

  const startProcessing = useCallback((videoElement: HTMLVideoElement) => {
    videoRef.current = videoElement;
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    if (modelRef.current && (options.backgroundBlur || options.backgroundImage)) {
      console.log('[VirtualBackground] Starting processing');
      animationRef.current = requestAnimationFrame(processFrame);
    }
  }, [processFrame, options.backgroundBlur, options.backgroundImage]);

  const stopProcessing = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    console.log('[VirtualBackground] Processing stopped');
  }, []);

  // Restart processing when model becomes ready or options change
  useEffect(() => {
    if (isModelReady && videoRef.current && (options.backgroundBlur || options.backgroundImage)) {
      startProcessing(videoRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isModelReady, options.backgroundBlur, options.backgroundImage, startProcessing]);

  return {
    canvasRef,
    isModelLoading,
    isModelReady,
    error,
    startProcessing,
    stopProcessing,
  };
}
