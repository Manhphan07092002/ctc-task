import { useEffect, useRef, useState } from 'react';
import { SelfieSegmentation, Results } from '@mediapipe/selfie_segmentation';
import { Camera } from '@mediapipe/camera_utils';

export type BgMode = 'none' | 'blur' | 'image';

export const useVirtualBackground = (
  rawStream: MediaStream | null,
  isCamOn: boolean,
  bgMode: BgMode,
  bgImageUrl?: string
) => {
  const [processedStream, setProcessedStream] = useState<MediaStream | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const selfieSegmentationRef = useRef<SelfieSegmentation | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  const modeRef = useRef<BgMode>('none');
  
  useEffect(() => {
    modeRef.current = bgMode;
  }, [bgMode]);

  // Preload background image
  useEffect(() => {
    if (bgMode === 'image' && bgImageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = bgImageUrl;
      img.onload = () => { bgImageRef.current = img; };
    }
  }, [bgImageUrl, bgMode]);

  useEffect(() => {
    // If no processing needed or no raw stream, clear processed stream
    if (bgMode === 'none' || !rawStream || !isCamOn) {
      setProcessedStream(null);
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      return;
    }

    // Setup Video and Canvas Elements
    if (!videoRef.current) {
      videoRef.current = document.createElement('video');
      videoRef.current.playsInline = true;
      videoRef.current.muted = true;
    }
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = 640;
      canvasRef.current.height = 480;
    }

    const videoEl = videoRef.current;
    const canvasEl = canvasRef.current;
    
    // Only capture stream once
    if (!processedStream) {
        const outStream = canvasEl.captureStream(30);
        setProcessedStream(outStream);
    }

    videoEl.srcObject = new MediaStream(rawStream.getVideoTracks());

    const onResults = (results: Results) => {
      const ctx = canvasEl.getContext('2d');
      if (!ctx) return;

      const currentMode = modeRef.current;
      
      ctx.save();
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

      if (currentMode === 'none') {
        ctx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height);
        ctx.restore();
        return;
      }

      // Draw mask mapping the person
      ctx.drawImage(results.segmentationMask, 0, 0, canvasEl.width, canvasEl.height);
      
      // Draw person inside the mask
      ctx.globalCompositeOperation = 'source-in';
      ctx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height);

      // Draw background behind the person
      ctx.globalCompositeOperation = 'destination-over';

      if (currentMode === 'blur') {
        ctx.filter = 'blur(12px)';
        ctx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height);
      } else if (currentMode === 'image' && bgImageRef.current) {
        ctx.drawImage(bgImageRef.current, 0, 0, canvasEl.width, canvasEl.height);
      } else {
        ctx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height);
      }

      ctx.restore();
    };

    if (!selfieSegmentationRef.current) {
      const selfieSegmentation = new SelfieSegmentation({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
      });
      selfieSegmentation.setOptions({
        modelSelection: 1, // 1 is landscape (faster)
        selfieMode: false,
      });
      selfieSegmentation.onResults(onResults);
      selfieSegmentationRef.current = selfieSegmentation;
    }

    if (!cameraRef.current) {
      const camera = new Camera(videoEl, {
        onFrame: async () => {
          if (videoEl.videoWidth === 0) return;
          if (canvasEl.width !== videoEl.videoWidth) {
              canvasEl.width = videoEl.videoWidth;
              canvasEl.height = videoEl.videoHeight;
          }
          await selfieSegmentationRef.current?.send({ image: videoEl });
        },
        width: 640,
        height: 480
      });
      camera.start();
      cameraRef.current = camera;
    }

    return () => {
      // Cleanup handled efficiently via effect deps
    };
  }, [rawStream, bgMode, isCamOn]);

  return { processedStream };
};
