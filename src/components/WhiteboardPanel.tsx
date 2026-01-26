import { useRef, useState, useEffect, useCallback } from 'react';
import { X, Pen, Eraser, Trash2, Download, Undo2, Presentation, Users, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { WhiteboardStroke } from '@/lib/mediasoup';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WhiteboardPanelProps {
  strokes: WhiteboardStroke[];
  onStroke: (stroke: WhiteboardStroke) => void;
  onClear: () => void;
  onClose: () => void;
}

const COLORS = [
  { color: '#000000', name: 'Black' },
  { color: '#ef4444', name: 'Red' },
  { color: '#f97316', name: 'Orange' },
  { color: '#eab308', name: 'Yellow' },
  { color: '#22c55e', name: 'Green' },
  { color: '#3b82f6', name: 'Blue' },
  { color: '#8b5cf6', name: 'Purple' },
  { color: '#ec4899', name: 'Pink' },
];

export function WhiteboardPanel({ strokes, onStroke, onClear, onClose }: WhiteboardPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState([4]);
  const [isPresenting, setIsPresenting] = useState(false);
  const [zoom, setZoom] = useState(1);

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: WhiteboardStroke) => {
    if (stroke.points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      // Smooth curve using quadratic bezier
      const xc = (stroke.points[i].x + stroke.points[i - 1].x) / 2;
      const yc = (stroke.points[i].y + stroke.points[i - 1].y) / 2;
      ctx.quadraticCurveTo(stroke.points[i - 1].x, stroke.points[i - 1].y, xc, yc);
    }
    ctx.stroke();
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid pattern for visual reference
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    const gridSize = 20;
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    strokes.forEach(stroke => drawStroke(ctx, stroke));
  }, [strokes, drawStroke]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redrawCanvas();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [redrawCanvas]);

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const point = getCanvasPoint(e);
    setIsDrawing(true);
    setCurrentStroke([point]);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const point = getCanvasPoint(e);
    const newStroke = [...currentStroke, point];
    setCurrentStroke(newStroke);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tempStroke: WhiteboardStroke = {
      id: 'temp',
      points: newStroke,
      color: color,
      width: strokeWidth[0],
      tool: tool
    };
    
    redrawCanvas();
    drawStroke(ctx, tempStroke);
  };

  const stopDrawing = () => {
    if (!isDrawing || currentStroke.length < 2) {
      setIsDrawing(false);
      setCurrentStroke([]);
      return;
    }

    const stroke: WhiteboardStroke = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      points: currentStroke,
      color: color,
      width: strokeWidth[0],
      tool: tool
    };

    onStroke(stroke);
    setIsDrawing(false);
    setCurrentStroke([]);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
    toast.success('Whiteboard saved!');
  };

  const handleClear = () => {
    if (strokes.length === 0) return;
    onClear();
    toast.success('Whiteboard cleared');
  };

  const handlePresent = () => {
    setIsPresenting(!isPresenting);
    if (!isPresenting) {
      toast.success('Whiteboard is now visible to everyone!');
    } else {
      toast.info('Stopped presenting whiteboard');
    }
  };

  return (
    <div className="flex flex-col h-full glass-panel">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30 glass-header">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl backdrop-blur-sm flex items-center justify-center border shadow-inner transition-all",
            isPresenting 
              ? "bg-gradient-to-br from-primary/40 to-primary/20 border-primary/30" 
              : "bg-gradient-to-br from-primary/20 to-primary/10 border-primary/20"
          )}>
            <Pen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Whiteboard</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              {isPresenting ? 'Presenting to everyone' : 'Collaborate in real-time'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant={isPresenting ? "default" : "outline"}
            size="sm"
            onClick={handlePresent}
            className={cn(
              "rounded-xl text-xs",
              isPresenting && "bg-primary shadow-lg shadow-primary/30"
            )}
          >
            <Presentation className="w-3.5 h-3.5 mr-1.5" />
            {isPresenting ? 'Presenting' : 'Present'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
            data-testid="button-close-whiteboard"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-3 border-b border-border/30 space-y-3 bg-gradient-to-b from-muted/20 to-transparent">
        {/* Tools */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Button
              variant={tool === 'pen' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setTool('pen')}
              className={cn(
                "rounded-xl h-9 w-9",
                tool === 'pen' && "shadow-lg shadow-primary/20"
              )}
              data-testid="button-pen-tool"
            >
              <Pen className="w-4 h-4" />
            </Button>
            <Button
              variant={tool === 'eraser' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setTool('eraser')}
              className={cn(
                "rounded-xl h-9 w-9",
                tool === 'eraser' && "shadow-lg shadow-primary/20"
              )}
              data-testid="button-eraser-tool"
            >
              <Eraser className="w-4 h-4" />
            </Button>
            
            <div className="h-6 w-px bg-border/50 mx-1" />
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleClear}
              disabled={strokes.length === 0}
              className="rounded-xl h-9 w-9 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              data-testid="button-clear-whiteboard"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleDownload}
              className="rounded-xl h-9 w-9"
              data-testid="button-download-whiteboard"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              className="h-7 w-7 rounded-lg"
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom(Math.min(2, zoom + 0.25))}
              className="h-7 w-7 rounded-lg"
              disabled={zoom >= 2}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Colors */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-12">Color</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c.color}
                onClick={() => setColor(c.color)}
                title={c.name}
                className={cn(
                  "w-7 h-7 rounded-lg border-2 transition-all hover:scale-110",
                  color === c.color 
                    ? "border-foreground scale-110 shadow-lg ring-2 ring-foreground/20" 
                    : "border-transparent hover:border-muted-foreground/30"
                )}
                style={{ backgroundColor: c.color }}
                data-testid={`color-${c.color}`}
              />
            ))}
          </div>
        </div>

        {/* Stroke width */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-12">Size</span>
          <Slider
            value={strokeWidth}
            onValueChange={setStrokeWidth}
            min={1}
            max={20}
            step={1}
            className="flex-1"
            data-testid="slider-stroke-width"
          />
          <div 
            className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center"
            title={`${strokeWidth[0]}px`}
          >
            <div 
              className="rounded-full bg-foreground" 
              style={{ 
                width: Math.min(strokeWidth[0], 16), 
                height: Math.min(strokeWidth[0], 16) 
              }} 
            />
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div 
        ref={containerRef} 
        className={cn(
          "flex-1 overflow-hidden bg-white relative",
          isPresenting && "ring-2 ring-primary ring-inset"
        )}
      >
        {isPresenting && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium shadow-lg">
            <Presentation className="w-3 h-3" />
            Live
          </div>
        )}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          className={cn(
            "touch-none transition-transform",
            tool === 'pen' && "cursor-crosshair",
            tool === 'eraser' && "cursor-cell"
          )}
          data-testid="whiteboard-canvas"
        />
      </div>

      {/* Footer info */}
      <div className="px-4 py-2 border-t border-border/30 bg-muted/10">
        <p className="text-xs text-muted-foreground text-center">
          {strokes.length} {strokes.length === 1 ? 'stroke' : 'strokes'} • All changes sync in real-time
        </p>
      </div>
    </div>
  );
}
