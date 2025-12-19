
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Point } from '../types';

interface ImageEditorProps {
  imageSrc: string;
  brushSize: number;
  onConfirm: (compositeBase64: string) => void;
  onCancel: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ imageSrc, brushSize, onConfirm, onCancel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [history, setHistory] = useState<ImageData[]>([]);

  // Initialize canvas
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      // Calculate responsive size while maintaining aspect ratio
      const maxWidth = Math.min(window.innerWidth * 0.8, 1200);
      const maxHeight = window.innerHeight * 0.6;
      let width = img.width;
      let height = img.height;

      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width *= ratio;
      height *= ratio;

      setCanvasSize({ width, height });

      if (imageCanvasRef.current && maskCanvasRef.current) {
        const iCtx = imageCanvasRef.current.getContext('2d');
        const mCtx = maskCanvasRef.current.getContext('2d');
        if (iCtx && mCtx) {
          imageCanvasRef.current.width = width;
          imageCanvasRef.current.height = height;
          maskCanvasRef.current.width = width;
          maskCanvasRef.current.height = height;

          iCtx.drawImage(img, 0, 0, width, height);
          
          // Initialize transparent mask
          mCtx.clearRect(0, 0, width, height);
          saveToHistory();
        }
      }
    };
  }, [imageSrc]);

  const saveToHistory = useCallback(() => {
    const ctx = maskCanvasRef.current?.getContext('2d');
    if (ctx && canvasSize.width > 0) {
      const data = ctx.getImageData(0, 0, canvasSize.width, canvasSize.height);
      setHistory(prev => [...prev.slice(-10), data]);
    }
  }, [canvasSize]);

  const undo = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop(); // remove current state
      const lastState = newHistory[newHistory.length - 1];
      const ctx = maskCanvasRef.current?.getContext('2d');
      if (ctx && lastState) {
        ctx.putImageData(lastState, 0, 0);
        setHistory(newHistory);
      }
    }
  };

  const clearMask = () => {
    const ctx = maskCanvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      saveToHistory();
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const ctx = maskCanvasRef.current?.getContext('2d');
    if (ctx) {
      const { x, y } = getCoordinates(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'; // Transparent red for visual cue
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = maskCanvasRef.current?.getContext('2d');
    if (ctx) {
      const { x, y } = getCoordinates(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
  };

  const handleConfirm = () => {
    // Create a composite canvas to send to Gemini
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasSize.width;
    tempCanvas.height = canvasSize.height;
    const ctx = tempCanvas.getContext('2d');
    if (ctx && imageCanvasRef.current && maskCanvasRef.current) {
      // 1. Draw original image
      ctx.drawImage(imageCanvasRef.current, 0, 0);
      // 2. Draw mask (using non-transparent red for AI detection)
      ctx.globalAlpha = 1.0;
      ctx.drawImage(maskCanvasRef.current, 0, 0);
      
      onConfirm(tempCanvas.toDataURL('image/png'));
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-5xl mx-auto">
      <div className="relative border-4 border-slate-700 rounded-xl overflow-hidden shadow-2xl bg-slate-800 canvas-container group">
        <canvas
          ref={imageCanvasRef}
          className="block max-w-full"
        />
        <canvas
          ref={maskCanvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={(e) => { e.preventDefault(); startDrawing(e); }}
          onTouchMove={(e) => { e.preventDefault(); draw(e); }}
          onTouchEnd={stopDrawing}
          className="absolute top-0 left-0 cursor-crosshair touch-none"
        />
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <button 
             onClick={undo}
             className="px-3 py-1 bg-slate-900/80 hover:bg-slate-900 rounded-md text-sm border border-slate-600 transition"
           >
             撤销
           </button>
           <button 
             onClick={clearMask}
             className="px-3 py-1 bg-slate-900/80 hover:bg-slate-900 rounded-md text-sm border border-slate-600 transition"
           >
             清空
           </button>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4 w-full">
        <button
          onClick={onCancel}
          className="px-6 py-2 rounded-full border border-slate-600 text-slate-300 hover:bg-slate-800 transition font-medium"
        >
          重新上传
        </button>
        <button
          onClick={handleConfirm}
          className="px-8 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-lg shadow-blue-900/20"
        >
          立即移除水印
        </button>
      </div>
    </div>
  );
};

export default ImageEditor;
