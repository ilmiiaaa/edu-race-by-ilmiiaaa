import React, { useEffect, useRef } from 'react';
import { LeaderboardEntry } from '../types/game';

interface CarRenderState {
  playerId: string;
  displayName: string;
  carColor: string;
  carNumber: number;
  currentX: number; // 0 to 1 normalized
  targetX: number;
  laneY: number; // 0 to 1 normalized
  nitroTime: number; // timestamp until nitro effect ends
  exhaustParticles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }>;
}

interface RaceTrackCanvasProps {
  players: LeaderboardEntry[];
  highlightPlayerId?: string;
  height?: number;
  isLiveRace?: boolean;
}

export const RaceTrackCanvas: React.FC<RaceTrackCanvasProps> = ({
  players,
  highlightPlayerId,
  height = 240,
  isLiveRace = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const carsRef = useRef<Map<string, CarRenderState>>(new Map());
  const animationFrameRef = useRef<number | null>(null);
  const roadOffsetRef = useRef<number>(0);

  // Update or sync cars state when players change
  useEffect(() => {
    const cars = carsRef.current;
    const totalCount = Math.max(1, players.length);

    players.forEach((p, index) => {
      // Calculate lane spacing
      const lanePadding = 0.12;
      const usableHeight = 1.0 - lanePadding * 2;
      const laneStep = totalCount > 1 ? usableHeight / (totalCount - 1) : 0;
      const targetLaneY = totalCount === 1 ? 0.5 : lanePadding + index * laneStep;

      // Target X: 0.08 (Start) to 0.90 (Finish)
      const startX = 0.08;
      const finishX = 0.90;
      const progressRatio = Math.max(0, Math.min(100, p.raceProgress || 0)) / 100;
      const targetX = startX + progressRatio * (finishX - startX);

      let car = cars.get(p.playerId);
      if (!car) {
        car = {
          playerId: p.playerId,
          displayName: p.displayName,
          carColor: p.carColor || '#3b82f6',
          carNumber: p.carNumber || index + 1,
          currentX: startX,
          targetX,
          laneY: targetLaneY,
          nitroTime: 0,
          exhaustParticles: [],
        };
        cars.set(p.playerId, car);
      } else {
        // Trigger nitro if progress increased
        if (targetX > car.targetX + 0.01) {
          car.nitroTime = Date.now() + 1400;
        }
        car.targetX = targetX;
        car.laneY = targetLaneY;
        car.displayName = p.displayName;
        car.carColor = p.carColor || car.carColor;
      }
    });

    // Remove old cars
    for (const key of cars.keys()) {
      if (!players.some((p) => p.playerId === key)) {
        cars.delete(key);
      }
    }
  }, [players]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      const width = canvas.width;
      const h = canvas.height;

      // Clear Canvas
      ctx.clearRect(0, 0, width, h);

      // --- 1. DRAW TRACK BACKGROUND ---
      // Top and bottom curb/grass
      ctx.fillStyle = '#1e293b'; // Slate track tarmac
      ctx.fillRect(0, 0, width, h);

      // Track borders (Red & White Curbs)
      const curbHeight = 8;
      const curbSegment = 24;

      // Road movement offset
      roadOffsetRef.current = (roadOffsetRef.current + (isLiveRace ? 30 : 5) * dt) % curbSegment;

      // Top curb
      for (let x = -curbSegment; x < width + curbSegment; x += curbSegment) {
        const isRed = Math.floor((x + roadOffsetRef.current) / curbSegment) % 2 === 0;
        ctx.fillStyle = isRed ? '#ef4444' : '#ffffff';
        ctx.fillRect(x - (roadOffsetRef.current % curbSegment), 0, curbSegment, curbHeight);
        ctx.fillRect(x - (roadOffsetRef.current % curbSegment), h - curbHeight, curbSegment, curbHeight);
      }

      // Asphalt texture / subtle road lanes
      const laneCount = Math.max(2, Math.min(6, players.length));
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([12, 16]);
      for (let i = 1; i < laneCount; i++) {
        const ly = (h / laneCount) * i;
        ctx.beginPath();
        ctx.moveTo(0, ly);
        ctx.lineTo(width, ly);
        ctx.stroke();
      }
      ctx.setLineDash([]); // Reset line dash

      // --- 2. DRAW START & FINISH LINES ---
      const startX = width * 0.08;
      const finishX = width * 0.90;

      // Start line (White solid line with banner)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(startX, curbHeight);
      ctx.lineTo(startX, h - curbHeight);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('START', startX - 28, curbHeight + 14);

      // Finish line (Checkered Pattern!)
      const checkSize = 7;
      const cols = 2;
      const rows = Math.ceil((h - curbHeight * 2) / checkSize);

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const isBlack = (c + r) % 2 === 0;
          ctx.fillStyle = isBlack ? '#0f172a' : '#ffffff';
          ctx.fillRect(finishX + c * checkSize, curbHeight + r * checkSize, checkSize, checkSize);
        }
      }

      // Finish banner text
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('FINISH 🏁', finishX - 10, curbHeight + 14);

      // --- 3. DRAW CARS ---
      const now = Date.now();
      const cars = Array.from(carsRef.current.values());

      cars.forEach((car) => {
        // LERP position towards target
        const lerpSpeed = 4.0;
        car.currentX += (car.targetX - car.currentX) * Math.min(1, lerpSpeed * dt);

        const carPixelX = car.currentX * width;
        const carPixelY = car.laneY * h;
        const isNitro = now < car.nitroTime;

        // Exhaust Particles
        if (isNitro || Math.random() < 0.25) {
          car.exhaustParticles.push({
            x: carPixelX - 18,
            y: carPixelY + (Math.random() - 0.5) * 6,
            vx: -(isNitro ? 70 : 35) + (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 12,
            life: 1.0,
            color: isNitro ? (Math.random() > 0.5 ? '#f97316' : '#38bdf8') : '#94a3b8',
          });
        }

        // Update & Render Particles
        for (let i = car.exhaustParticles.length - 1; i >= 0; i--) {
          const p = car.exhaustParticles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt * (isNitro ? 2.5 : 3.0);

          if (p.life <= 0) {
            car.exhaustParticles.splice(i, 1);
            continue;
          }

          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.life * 0.7);
          ctx.beginPath();
          ctx.arc(p.x, p.y, (1 - p.life) * 5 + 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1.0;

        // Draw Car Body
        drawCarSprite(ctx, carPixelX, carPixelY, car, isNitro, highlightPlayerId === car.playerId);
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [players, highlightPlayerId, isLiveRace]);

  // Helper function to render a high-quality 2D Racing Kart
  const drawCarSprite = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    car: CarRenderState,
    isNitro: boolean,
    isHighlighted: boolean
  ) => {
    ctx.save();
    ctx.translate(x, y);

    // Highlight aura for active player
    if (isHighlighted) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 15, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 18, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tires (4 black rounded rectangles)
    ctx.fillStyle = '#0f172a';
    const tireW = 8;
    const tireH = 4;
    // Front wheels
    ctx.fillRect(8, -12, tireW, tireH);
    ctx.fillRect(8, 8, tireW, tireH);
    // Rear wheels
    ctx.fillRect(-14, -13, tireW, tireH);
    ctx.fillRect(-14, 9, tireW, tireH);

    // Rear wing / Spoiler
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-18, -10, 4, 20);

    // Main Chassis
    ctx.fillStyle = car.carColor;
    ctx.beginPath();
    // Rounded aerodynamic kart body shape pointing right
    ctx.roundRect(-14, -8, 28, 16, [4, 8, 8, 4]);
    ctx.fill();

    // Center Cockpit / Driver Helmet
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-1, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    // Visor
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(1, 0, 3.5, -Math.PI / 3, Math.PI / 3);
    ctx.fill();

    // Hood Number Decal
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${car.carNumber}`, 8, 0);

    // Nitro Thruster Flame
    if (isNitro) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(-18, -4);
      ctx.lineTo(-28 - Math.random() * 8, 0);
      ctx.lineTo(-18, 4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-18, -2);
      ctx.lineTo(-24 - Math.random() * 5, 0);
      ctx.lineTo(-18, 2);
      ctx.closePath();
      ctx.fill();
    }

    // Name Tag Above Car
    ctx.font = isHighlighted ? 'bold 10px sans-serif' : '9px sans-serif';
    const nameText = car.displayName.length > 12 ? car.displayName.substring(0, 11) + '..' : car.displayName;
    const textWidth = ctx.measureText(nameText).width;

    ctx.fillStyle = isHighlighted ? 'rgba(234, 179, 8, 0.95)' : 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(-textWidth / 2 - 4, -22, textWidth + 8, 13, 3);
    ctx.fill();

    ctx.fillStyle = isHighlighted ? '#0f172a' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(nameText, 0, -15.5);

    ctx.restore();
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700 bg-slate-900">
      <canvas
        ref={canvasRef}
        width={960}
        height={height}
        className="w-full h-auto block select-none pointer-events-none"
        style={{ aspectRatio: '960 / ' + height }}
      />
      {/* Mobile progress indicator badge */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 bg-slate-950/80 backdrop-blur-md rounded-full text-xs font-semibold text-amber-400 border border-slate-700">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>{players.length} Pembalap di Lintasan</span>
      </div>
    </div>
  );
};
