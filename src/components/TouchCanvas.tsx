import React, { useRef, useEffect } from 'react';
import { GameEngine } from '../game/GameEngine';

interface TouchCanvasProps {
  engine: GameEngine | null;
  onMove: (dx: number, dy: number) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export const TouchCanvas: React.FC<TouchCanvasProps> = ({ engine, onMove, onCanvasReady }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number; hasMoved: boolean } | null>(null);

  useEffect(() => {
    if (canvasRef.current && onCanvasReady) {
      onCanvasReady(canvasRef.current);
    }
  }, [onCanvasReady]);

  // Resize observer
  useEffect(() => {
    const handleResize = () => {
      if (engine) {
        engine.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [engine]);

  // Touch and pointer gestures
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only left clicks / primary touches
    if (e.button !== 0) return;
    touchStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: performance.now(),
      hasMoved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const start = touchStartRef.current;
    if (!start || start.hasMoved) return;

    const diffX = e.clientX - start.x;
    const diffY = e.clientY - start.y;
    const distance = Math.hypot(diffX, diffY);
    const swipeThreshold = 26; // px

    if (distance >= swipeThreshold) {
      start.hasMoved = true;
      // Determine dominant direction
      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swipe
        if (diffX > 0) {
          onMove(1, 0); // Right
        } else {
          onMove(-1, 0); // Left
        }
      } else {
        // Vertical swipe
        if (diffY < 0) {
          onMove(0, 1); // Up / Forward
        } else {
          onMove(0, -1); // Down / Backward
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;

    if (!start.hasMoved) {
      const duration = performance.now() - start.time;
      if (duration < 350) {
        // Tap detected! Tap hops forward in current or forward direction
        onMove(0, 1);
      }
    }
  };

  // Keyboard navigation for desktop or tablets with keyboards
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!engine || engine.isDead || engine.isPaused) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
        case ' ':
          e.preventDefault();
          onMove(0, 1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          onMove(0, -1);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          onMove(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          onMove(1, 0);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine, onMove]);

  return (
    <div
      className="relative w-full h-full touch-none select-none overflow-hidden cursor-pointer"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        touchStartRef.current = null;
      }}
    >
      <canvas
        id="crossy-cluck-canvas"
        ref={canvasRef}
        className="w-full h-full block"
      />
    </div>
  );
};
