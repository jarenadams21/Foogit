import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

interface Frame {
  id: number;
  data: string;
  transform: {
    scaleX: number;
    scaleY: number;
    rotate: number;
    translateX: number;
    translateY: number;
  };
}

interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  paddleWidth: number;
  paddleHeight: number;
  ballRadius: number;
  playerSpeed: number;
  ballSpeed: number;
}

const gameConfig: GameConfig = {
  canvasWidth: 400,
  canvasHeight: 300,
  paddleWidth: 10,
  paddleHeight: 60,
  ballRadius: 10,
  playerSpeed: 4,
  ballSpeed: 3,
};

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const studioRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const [animationFrames, setAnimationFrames] = useState<Frame[]>([]);
  const [isTransforming, setIsTransforming] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [currentTransform, setCurrentTransform] = useState({
    scaleX: 1,
    scaleY: 1,
    rotate: 0,
    translateX: 0,
    translateY: 0,
  });
  const [transformMode, setTransformMode] = useState<'XYZ' | 'Rotate'>('XYZ');
  const [animationVisible, setAnimationVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const workerRef = useRef<Worker>();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    // Initialize Web Worker
    workerRef.current = new Worker(new URL('./animationWorker.js', import.meta.url));

    // Clean up Web Worker on component unmount
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [selectedImage]);

  const handleTransformStart = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsTransforming(true);
    setLastMousePos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
  }, []);

  const handleTransform = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isTransforming || !selectedImage) return;
    
    const { offsetX, offsetY } = e.nativeEvent;
    const deltaX = offsetX - lastMousePos.x;
    const deltaY = offsetY - lastMousePos.y;

    setCurrentTransform((prev) => {
      if (transformMode === 'XYZ') {
        return {
          ...prev,
          translateX: prev.translateX + deltaX,
          translateY: prev.translateY + deltaY,
        };
      } else if (transformMode === 'Rotate') {
        return {
          ...prev,
          rotate: prev.rotate + deltaX / 2,
        };
      }
      return prev;
    });

    setLastMousePos({ x: offsetX, y: offsetY });
  }, [isTransforming, transformMode, lastMousePos, selectedImage]);

  const handleTransformEnd = useCallback(() => {
    setIsTransforming(false);
    const canvas = studioRef.current!;
    const ctx = canvas.getContext('2d');
    if (ctx && selectedImage) {
      const img = new Image();
      img.src = selectedImage;
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        const canvasAspectRatio = canvas.width / canvas.height;
        let drawWidth = canvas.width;
        let drawHeight = canvas.height;

        if (aspectRatio > canvasAspectRatio) {
          drawHeight = canvas.width / aspectRatio;
        } else {
          drawWidth = canvas.height * aspectRatio;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(
          currentTransform.translateX + drawWidth / 2,
          currentTransform.translateY + drawHeight / 2
        );
        ctx.rotate((currentTransform.rotate * Math.PI) / 180);
        ctx.scale(currentTransform.scaleX, currentTransform.scaleY);
        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.restore();

        const newFrame = {
          id: Date.now(),
          data: canvas.toDataURL(),
          transform: { ...currentTransform },
        };
        setAnimationFrames((prevFrames) => [...prevFrames, newFrame]);
      };
    }
  }, [currentTransform, selectedImage]);

  const saveFrame = useCallback(() => {
    const canvas = studioRef.current!;
    const ctx = canvas.getContext('2d');
    if (ctx && selectedImage) {
      const newFrame = {
        id: Date.now(),
        data: canvas.toDataURL(),
        transform: { ...currentTransform },
      };
      setAnimationFrames((prevFrames) => [...prevFrames, newFrame]);
    }
  }, [currentTransform, selectedImage]);

  const renderPreview = useCallback(() => {
    setAnimationVisible(true);
    setIsAnimating(true);
  }, []);

  const closeAnimation = useCallback(() => {
    setAnimationVisible(false);
    setIsAnimating(false);
    setFrameIndex(0);
  }, []);

  useEffect(() => {
    if (isAnimating && animationFrames.length > 0) {
      const interval = setInterval(() => {
        setFrameIndex((prevIndex) => (prevIndex + 1) % animationFrames.length);
      }, 500);

      return () => clearInterval(interval);
    }
  }, [isAnimating, animationFrames]);

  useEffect(() => {
    if (animationVisible && previewRef.current && animationFrames.length > 0) {
      const ctx = previewRef.current.getContext('2d');
      if (ctx) {
        const currentFrame = animationFrames[frameIndex];

        workerRef.current?.postMessage({ imageData: currentFrame.data, frameIndex });

        workerRef.current!.onmessage = (e: MessageEvent) => {
          const { processedData } = e.data;
          const img = new Image();
          img.src = processedData;
          img.onload = () => {
            ctx.clearRect(0, 0, previewRef.current!.width, previewRef.current!.height);
            ctx.save();
            ctx.translate(
              currentFrame.transform.translateX + previewRef.current!.width / 2,
              currentFrame.transform.translateY + previewRef.current!.height / 2
            );
            ctx.rotate((currentFrame.transform.rotate * Math.PI) / 180);
            ctx.scale(currentFrame.transform.scaleX, currentFrame.transform.scaleY);
            ctx.drawImage(img, -previewRef.current!.width / 2, -previewRef.current!.height / 2);
            ctx.restore();
          };
        };
      }
    }
  }, [frameIndex, animationVisible, animationFrames]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        setSelectedImage(imageUrl);
        const newFrame = {
          id: Date.now(),
          data: imageUrl,
          transform: {
            scaleX: 1,
            scaleY: 1,
            rotate: 0,
            translateX: 0,
            translateY: 0,
          },
        };
        setAnimationFrames((prevFrames) => [...prevFrames, newFrame]);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ width: '50%' }}>
        <canvas ref={canvasRef} width={gameConfig.canvasWidth} height={gameConfig.canvasHeight} />
      </div>
      <div style={{ width: '50%', padding: '10px' }}>
        <input type="file" accept="image/*" onChange={handleImageUpload} />
        <div style={{ margin: '10px 0' }}>
          <label>
            Transform Mode:
            <select value={transformMode} onChange={(e) => setTransformMode(e.target.value as 'XYZ' | 'Rotate')}>
              <option value="XYZ">XYZ Plane</option>
              <option value="Rotate">Rotate</option>
            </select>
          </label>
        </div>
        <canvas
          ref={studioRef}
          width={400}
          height={300}
          style={{ border: '1px solid black', marginBottom: '10px' }}
          onMouseDown={handleTransformStart}
          onMouseMove={handleTransform}
          onMouseUp={handleTransformEnd}
        />
        <button onClick={saveFrame}>Save Frame</button>
        <button onClick={renderPreview}>Preview Animation</button>
        <div className="saved-frames">
          <button>Saved Frames ▼</button>
          <div className="frame-list">
            {animationFrames.map((frame, index) => (
              <div key={frame.id}>
                <button onClick={() => setFrameIndex(index)}>Frame {index + 1}</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {animationVisible && (
        <div className="animation-sheet">
          <button onClick={closeAnimation}>Close Animation</button>
          <canvas ref={previewRef} width={400} height={300} className="preview-canvas" />
        </div>
      )}
    </div>
  );
};

export default App;
