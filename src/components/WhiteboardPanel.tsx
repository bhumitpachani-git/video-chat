import { useRef, useState, useEffect, useCallback } from 'react';
import { X, Pen, Eraser, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { WhiteboardStroke, WhiteboardState } from '@/lib/mediasoup';
import { cn } from '@/lib/utils';

interface WhiteboardPanelProps {
  strokes: WhiteboardStroke[];
  onStroke: (stroke: WhiteboardStroke) => void;
  onClear: () => void;
  onClose: () => void;
}

const COLORS = ['#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

export function WhiteboardPanel({ strokes, onStroke, onClear, onClose }: WhiteboardPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState([3]);

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: WhiteboardStroke) => {
    if (stroke.points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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
      x: clientX - rect.left,
      y: clientY - rect.top
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
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="flex flex-col h-full glass-panel">
      <div className="flex items-center justify-between p-4 border-b border-border/30 glass-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 backdrop-blur-sm flex items-center justify-center border border-primary/20">
            <Pen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Whiteboard</h2>
            <p className="text-xs text-muted-foreground">Draw and collaborate</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors backdrop-blur-sm"
          data-testid="button-close-whiteboard"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="p-3 border-b border-border/30 space-y-3">
        <div className="flex items-center gap-2">
          <Button
            variant={tool === 'pen' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setTool('pen')}
            className="rounded-xl"
            data-testid="button-pen-tool"
          >
            <Pen className="w-4 h-4" />
          </Button>
          <Button
            variant={tool === 'eraser' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setTool('eraser')}
            className="rounded-xl"
            data-testid="button-eraser-tool"
          >
            <Eraser className="w-4 h-4" />
          </Button>
          <div className="h-6 w-px bg-border mx-1" />
          <Button
            variant="outline"
            size="icon"
            onClick={onClear}
            className="rounded-xl"
            data-testid="button-clear-whiteboard"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleDownload}
            className="rounded-xl"
            data-testid="button-download-whiteboard"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                "w-6 h-6 rounded-full border-2 transition-transform",
                color === c ? "scale-110 border-foreground" : "border-transparent"
              )}
              style={{ backgroundColor: c }}
              data-testid={`color-${c}`}
            />
          ))}
        </div>

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
          <span className="text-xs text-muted-foreground w-8">{strokeWidth[0]}px</span>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="cursor-crosshair touch-none"
          data-testid="whiteboard-canvas"
        />
      </div>
    </div>
  );
}
