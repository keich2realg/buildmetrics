"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Point {
  x: number;
  y: number;
}

interface CalibrationData {
  distance: string;
  unit: string;
  pointA: Point;
  pointB: Point;
}

interface ScaleCalibrationProps {
  file: File;
  onCalibrate: (data: CalibrationData) => void;
  existingCalibration: CalibrationData | null;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;

export function ScaleCalibration({
  file,
  onCalibrate,
  existingCalibration,
}: ScaleCalibrationProps) {
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pointA, setPointA] = useState<Point | null>(
    existingCalibration?.pointA || null
  );
  const [pointB, setPointB] = useState<Point | null>(
    existingCalibration?.pointB || null
  );
  const [distance, setDistance] = useState(
    existingCalibration?.distance || ""
  );
  const [unit, setUnit] = useState(existingCalibration?.unit || "m");

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load image
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Reset zoom & pan when opening
  useEffect(() => {
    if (open) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [open]);

  // Draw on canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.naturalWidth) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    const dotRadius = Math.max(8, Math.min(canvas.width, canvas.height) * 0.006);
    const fontSize = Math.max(16, Math.min(canvas.width, canvas.height) * 0.012);
    const lineWidth = Math.max(3, Math.min(canvas.width, canvas.height) * 0.003);

    // Draw point A
    if (pointA) {
      ctx.beginPath();
      ctx.arc(pointA.x, pointA.y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#4A7C9B";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#4A7C9B";
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillText("A", pointA.x + dotRadius + 4, pointA.y + fontSize * 0.35);
    }

    // Draw point B
    if (pointB) {
      ctx.beginPath();
      ctx.arc(pointB.x, pointB.y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#e11d48";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#e11d48";
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillText("B", pointB.x + dotRadius + 4, pointB.y + fontSize * 0.35);
    }

    // Draw line between A and B
    if (pointA && pointB) {
      ctx.beginPath();
      ctx.moveTo(pointA.x, pointA.y);
      ctx.lineTo(pointB.x, pointB.y);
      ctx.strokeStyle = "#4A7C9B";
      ctx.lineWidth = lineWidth;
      ctx.setLineDash([10, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [pointA, pointB]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Canvas click → place point (coordinates in image space)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) return; // Don't place points while panning
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (!pointA) {
      setPointA({ x, y });
    } else if (!pointB) {
      setPointB({ x, y });
    } else {
      setPointA({ x, y });
      setPointB(null);
      setDistance("");
    }
  };

  // ── Zoom ──
  const handleZoomIn = () => setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  const handleZoomOut = () => setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM));
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((z) => Math.max(MIN_ZOOM, Math.min(z + delta, MAX_ZOOM)));
    },
    []
  );

  // ── Pan ── (middle-click or Ctrl+click drag, or just drag if zoomed)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Pan with middle button, or any button when zoomed > 1 and holding Space
    if (e.button === 1 || (zoom > 1 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY };
      panOrigin.current = { ...pan };
    }
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPan({
        x: panOrigin.current.x + dx,
        y: panOrigin.current.y + dy,
      });
    },
    [isPanning, pan]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleValidate = () => {
    if (!pointA || !pointB || !distance) return;
    onCalibrate({ distance, unit, pointA, pointB });
    setOpen(false);
  };

  const handleReset = () => {
    setPointA(null);
    setPointB(null);
    setDistance("");
  };

  const isCalibrated = existingCalibration !== null;
  const zoomPercent = Math.round(zoom * 100);

  return (
    <>
      <Button
        type="button"
        variant={isCalibrated ? "outline" : "default"}
        size="sm"
        onClick={() => setOpen(true)}
        className={
          isCalibrated
            ? "border-steel/30 text-steel hover:bg-steel/5 cursor-pointer"
            : "bg-steel/10 text-steel hover:bg-steel/20 border border-steel/20 cursor-pointer"
        }
      >
        <svg
          className="h-4 w-4 mr-1.5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5"
          />
        </svg>
        {isCalibrated
          ? `Calibré : ${existingCalibration.distance} ${existingCalibration.unit}`
          : "Calibrer l'échelle (Recommandé)"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!max-w-[100vw] !w-[100vw] !h-[100dvh] sm:!max-w-[95vw] sm:!w-[95vw] sm:!h-[95vh] p-0 flex flex-col overflow-hidden rounded-none sm:rounded-lg">
          {/* Header */}
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-border/60 shrink-0">
            <DialogTitle className="text-anthracite flex items-center gap-2">
              <svg
                className="h-5 w-5 text-steel"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5"
                />
              </svg>
              Calibration visuelle de l&apos;échelle
            </DialogTitle>
            <DialogDescription>
              Cliquez sur deux points du plan pour tracer une ligne de référence,
              puis indiquez la distance réelle. Zoomez avec la molette, déplacez
              avec <kbd className="px-1 py-0.5 bg-secondary rounded text-xs font-mono">Alt</kbd>+clic.
            </DialogDescription>
          </DialogHeader>

          {/* Toolbar: Zoom controls + Step indicators */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-2 gap-2 bg-secondary/30 border-b border-border/40 shrink-0">
            {/* Step indicators */}
            <div className="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm">
              <div className="flex items-center gap-1">
                <div className={`h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full ${pointA ? "bg-steel" : "bg-border"}`} />
                <span className={pointA ? "text-steel font-medium" : "text-muted-foreground"}>
                  {pointA ? "A ✓" : "1. Point A"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full ${pointB ? "bg-rose-500" : "bg-border"}`} />
                <span className={pointB ? "text-rose-600 font-medium" : "text-muted-foreground"}>
                  {pointB ? "B ✓" : "2. Point B"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full ${pointA && pointB ? "bg-border animate-pulse" : "bg-border"}`} />
                <span className="text-muted-foreground">3. Distance</span>
              </div>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= MIN_ZOOM}
                className="h-8 w-8 sm:h-7 sm:w-7 p-0 cursor-pointer"
                title="Dézoomer"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                </svg>
              </Button>
              <button
                type="button"
                onClick={handleZoomReset}
                className="text-xs font-mono text-muted-foreground hover:text-anthracite px-2 min-w-[52px] text-center cursor-pointer"
                title="Réinitialiser le zoom"
              >
                {zoomPercent}%
              </button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= MAX_ZOOM}
                className="h-8 w-8 sm:h-7 sm:w-7 p-0 cursor-pointer"
                title="Zoomer"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </Button>
            </div>
          </div>

          {/* Canvas viewport — takes all remaining space */}
          <div
            ref={containerRef}
            className="flex-1 h-full min-h-0 overflow-hidden bg-neutral-100 relative"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: isPanning ? "grabbing" : zoom > 1 ? "crosshair" : "crosshair" }}
          >
            {imageUrl && (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: isPanning ? "none" : "transform 0.15s ease-out",
                }}
              >
                {/* Hidden image for loading */}
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Plan"
                  className="hidden"
                  onLoad={drawCanvas}
                />
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  className="max-w-full max-h-full object-contain"
                  style={{ display: "block" }}
                />
              </div>
            )}
          </div>

          {/* Distance input panel — appears when both points placed */}
          {pointA && pointB && (
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 px-4 sm:px-6 py-3 bg-steel/5 border-t border-steel/20 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex-1 space-y-1.5">
                <Label className="text-sm font-medium text-anthracite">
                  Distance entre A et B :
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="5.00"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    className="flex-1 h-11 sm:h-9 text-base sm:text-sm"
                    autoFocus
                  />
                  <Select value={unit} onValueChange={(v) => v && setUnit(v)}>
                    <SelectTrigger className="w-20 h-11 sm:h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="m">m</SelectItem>
                      <SelectItem value="cm">cm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="h-11 sm:h-9 flex-1 sm:flex-none cursor-pointer"
                >
                  Réinitialiser
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleValidate}
                  disabled={!distance}
                  className="h-11 sm:h-9 flex-1 sm:flex-none bg-steel hover:bg-steel-dark text-white cursor-pointer"
                >
                  ✓ Valider
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
