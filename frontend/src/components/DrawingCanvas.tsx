import React, { useRef, useState, useEffect } from 'react';
import { DrawData } from '../types';

interface DrawingCanvasProps {
  isDrawer: boolean;
  onDrawingChange: (data: DrawData) => void;
  onClearCanvas: () => void;
  wsRef: React.MutableRefObject<WebSocket | null>;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ 
  isDrawer, 
  onDrawingChange, 
  onClearCanvas,
  wsRef
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [prevPos, setPrevPos] = useState({ x: 0, y: 0 });
  
  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to match its display size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);
  
  // WebSocket message handler for drawing data
  useEffect(() => {
    if (!wsRef.current) return;
    
    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'draw_data' && !isDrawer) {
        drawLine(
          data.data.prevX,
          data.data.prevY,
          data.data.currX,
          data.data.currY,
          data.data.color,
          data.data.size
        );
      } else if (data.type === 'clear_canvas') {
        clearCanvas();
      }
    };
    
    wsRef.current.addEventListener('message', handleMessage);
    
    return () => {
      if (wsRef.current) {
        wsRef.current.removeEventListener('message', handleMessage);
      }
    };
  }, [wsRef, isDrawer]);
  
  const drawLine = (
    prevX: number,
    prevY: number,
    currX: number,
    currY: number,
    color: string,
    size: number
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(currX, currY);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.closePath();
  };
  
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };
  
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsDrawing(true);
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setPrevPos({ x, y });
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawer) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const currX = e.clientX - rect.left;
    const currY = e.clientY - rect.top;
    
    // Draw line on local canvas
    drawLine(prevPos.x, prevPos.y, currX, currY, color, brushSize);
    
    // Send drawing data to server
    const drawData: DrawData = {
      prevX: prevPos.x,
      prevY: prevPos.y,
      currX,
      currY,
      color,
      size: brushSize
    };
    
    onDrawingChange(drawData);
    
    // Update previous position
    setPrevPos({ x: currX, y: currY });
  };
  
  const handleMouseUp = () => {
    setIsDrawing(false);
  };
  
  const handleMouseLeave = () => {
    setIsDrawing(false);
  };
  
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsDrawing(true);
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    setPrevPos({ x, y });
    e.preventDefault();
  };
  
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawer) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const currX = touch.clientX - rect.left;
    const currY = touch.clientY - rect.top;
    
    // Draw line on local canvas
    drawLine(prevPos.x, prevPos.y, currX, currY, color, brushSize);
    
    // Send drawing data to server
    const drawData: DrawData = {
      prevX: prevPos.x,
      prevY: prevPos.y,
      currX,
      currY,
      color,
      size: brushSize
    };
    
    onDrawingChange(drawData);
    
    // Update previous position
    setPrevPos({ x: currX, y: currY });
    e.preventDefault();
  };
  
  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(false);
    e.preventDefault();
  };
  
  const handleClearCanvas = () => {
    clearCanvas();
    onClearCanvas();
  };
  
  return (
    <div className="flex flex-col">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="drawing-canvas w-full h-[500px] cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        
        {!isDrawer && (
          <div className="absolute inset-0 bg-transparent cursor-not-allowed" />
        )}
      </div>
      
      {isDrawer && (
        <div className="flex items-center justify-between mt-4 p-2 bg-gray-100 rounded-md">
          <div className="flex items-center space-x-4">
            <div>
              <label htmlFor="colorPicker" className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <input
                id="colorPicker"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 border-0 p-0 cursor-pointer"
              />
            </div>
            
            <div>
              <label htmlFor="brushSize" className="block text-sm font-medium text-gray-700 mb-1">
                Brush Size: {brushSize}px
              </label>
              <input
                id="brushSize"
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-32"
              />
            </div>
          </div>
          
          <button
            onClick={handleClearCanvas}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Clear Canvas
          </button>
        </div>
      )}
    </div>
  );
};

export default DrawingCanvas; 