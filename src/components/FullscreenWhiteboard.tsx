import { useRef, useEffect, useCallback, useState } from 'react';
import { X, Users, Pen, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WhiteboardStroke } from '@/lib/mediasoup';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FullscreenWhiteboardProps {
  strokes: WhiteboardStroke[];
  presenterName: string;
  isPresenter: boolean;
  onStroke?: (stroke: WhiteboardStroke) => void;
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

export function FullscreenWhiteboard({
  strokes,
  presenterName,
  isPresenter,
  onStroke,
  onClose,
}: FullscreenWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  const [color, setColor] = useState('#000000');
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [strokeWidth] = useState(4);
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

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
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
      y: (clientY - rect.top) / zoom,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isPresenter) return;
    e.preventDefault();
    const point = getCanvasPoint(e);
    setIsDrawing(true);
    setCurrentStroke([point]);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isPresenter) return;
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
      color,
      width: strokeWidth,
      tool,
    };

    redrawCanvas();
    drawStroke(ctx, tempStroke);
  };

  const stopDrawing = () => {
    if (!isDrawing || currentStroke.length < 2 || !isPresenter) {
      setIsDrawing(false);
      setCurrentStroke([]);
      return;
    }

    const stroke: WhiteboardStroke = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      points: currentStroke,
      color,
      width: strokeWidth,
      tool,
    };

    onStroke?.(stroke);
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

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
            <Pen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Shared Whiteboard</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              Presented by {presenterName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPresenter && (
            <div className="flex items-center gap-1.5 mr-4">
              {COLORS.map((c) => (
                <button
                  key={c.color}
                  onClick={() => setColor(c.color)}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                    color === c.color ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c.color }}
                />
              ))}
            </div>
          )}

          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              className="h-8 w-8"
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom(Math.min(2, zoom + 0.25))}
              className="h-8 w-8"
              disabled={zoom >= 2}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          <Button variant="outline" size="icon" onClick={handleDownload} className="rounded-xl">
            <Download className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-xl hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
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
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          className={cn(
            "touch-none",
            isPresenter && "cursor-crosshair"
          )}
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border bg-card/80 backdrop-blur-sm text-center">
        <p className="text-xs text-muted-foreground">
          {strokes.length} strokes • {isPresenter ? 'You are presenting' : 'View only mode'}
        </p>
      </div>
    </div>
  );
}
