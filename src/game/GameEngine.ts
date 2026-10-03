import {
  Lane,
  LaneType,
  Obstacle,
  Collectible,
  Decoration,
  Particle,
  CharacterSkin,
  ActivePowerUps,
  DeathCause,
  Biome,
} from '../types/game';
import { getBiomeForScore } from '../data/biomes';
import { sound } from '../audio/soundEffects';

export interface GameEngineCallbacks {
  onScoreUpdate: (score: number, highscore: number) => void;
  onCornCollect: (amount: number, total: number) => void;
  onGameOver: (score: number, deathCause: DeathCause, runCorn: number) => void;
  onAchievementProgress: (id: string, delta: number) => void;
}

export class GameEngine {
  // Canvas & Dimensions
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  // Grid & World
  public readonly minCol = -4;
  public readonly maxCol = 4;
  public tileSize: number = 44;
  public originX: number = 0;
  public originY: number = 0;

  // Player State
  public playerGridX: number = 0;
  public playerGridY: number = 0;
  public playerAnimX: number = 0;
  public playerAnimY: number = 0;
  public playerAnimZ: number = 0;
  public playerFacing: 0 | 1 | 2 | 3 = 0; // 0=Up, 1=Right, 2=Down, 3=Left

  public isHopping: boolean = false;
  private hopStartTime: number = 0;
  private hopDuration: number = 140; // ms
  private hopStartGridX: number = 0;
  private hopStartGridY: number = 0;
  private hopTargetGridX: number = 0;
  private hopTargetGridY: number = 0;
  private queuedHop: { dx: number; dy: number; facing: 0 | 1 | 2 | 3 } | null = null;

  // River riding
  public currentLogSpeed: number = 0;

  // Camera
  public cameraY: number = 0;
  public cameraX: number = 0;

  // Eagle / Predator
  public idleTimer: number = 0;
  public readonly eagleMaxIdle: number = 5.5; // seconds before eagle strikes
  public eagleState: {
    active: boolean;
    x: number;
    y: number;
    z: number;
    targetX: number;
    targetY: number;
    caughtPlayer: boolean;
  } = {
    active: false,
    x: 0,
    y: 0,
    z: 200,
    targetX: 0,
    targetY: 0,
    caughtPlayer: false,
  };

  // World Lanes
  public lanes: Map<number, Lane> = new Map();
  public highestGeneratedLane: number = -1;

  // Game Loop & Timers
  private animFrameId: number | null = null;
  private lastTime: number = 0;
  public isRunning: boolean = false;
  public isPaused: boolean = false;
  public isDead: boolean = false;
  public deathCause: DeathCause | null = null;

  // Scoring & Stats
  public score: number = 0;
  public highestScore: number = 0;
  public maxForwardY: number = 0;
  public runCorn: number = 0;
  public totalCorn: number = 0;
  public cornCombo: number = 1;
  public comboTimer: number = 0;

  // Power Ups
  public powerUps: ActivePowerUps = {
    shield: false,
    slowMoDuration: 0,
    magnetDuration: 0,
    frenzyDuration: 0,
  };

  // Particles
  public particles: Particle[] = [];

  // Active Skin
  public activeSkin: CharacterSkin;

  // Active Biome
  public activeBiome: Biome;

  // Callbacks
  private callbacks: GameEngineCallbacks;

  constructor(
    canvas: HTMLCanvasElement,
    skin: CharacterSkin,
    savedStats: { highScore: number; totalCorn: number },
    callbacks: GameEngineCallbacks
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.activeSkin = skin;
    this.highestScore = savedStats.highScore;
    this.totalCorn = savedStats.totalCorn;
    this.callbacks = callbacks;
    this.activeBiome = getBiomeForScore(0);

    this.resize();
    this.reset();
  }

  public resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const rect = parent.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Calculate tile size suited for mobile portrait or desktop
    const minCols = 10;
    this.tileSize = Math.max(38, Math.min(54, Math.floor(this.width / minCols)));
    this.originX = this.width / 2;
    // Position player slightly below center for visibility ahead
    this.originY = this.height * 0.65;
  }

  public setCallbacks(callbacks: GameEngineCallbacks) {
    this.callbacks = callbacks;
  }

  public setSkin(skin: CharacterSkin) {
    this.activeSkin = skin;
  }

  public reset() {
    this.playerGridX = 0;
    this.playerGridY = 0;
    this.playerAnimX = 0;
    this.playerAnimY = 0;
    this.playerAnimZ = 0;
    this.playerFacing = 0;

    this.isHopping = false;
    this.queuedHop = null;
    this.currentLogSpeed = 0;

    this.cameraY = 0;
    this.cameraX = 0;

    this.idleTimer = 0;
    this.eagleState = {
      active: false,
      x: 0,
      y: 0,
      z: 300,
      targetX: 0,
      targetY: 0,
      caughtPlayer: false,
    };

    this.score = 0;
    this.maxForwardY = 0;
    this.runCorn = 0;
    this.cornCombo = 1;
    this.comboTimer = 0;

    this.isDead = false;
    this.deathCause = null;
    this.isPaused = false;

    this.powerUps = {
      shield: false,
      slowMoDuration: 0,
      magnetDuration: 0,
      frenzyDuration: 0,
    };

    this.particles = [];
    this.lanes.clear();
    this.highestGeneratedLane = -1;

    // Generate initial safe buffer and forward tracks
    for (let y = -4; y <= 24; y++) {
      this.generateLane(y);
    }

    this.activeBiome = getBiomeForScore(0);
    this.callbacks.onScoreUpdate(0, this.highestScore);
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  // --- Procedural Generation ---

  private generateLane(index: number) {
    if (this.lanes.has(index)) return;

    let type: LaneType = 'GRASS';
    const obstacles: Obstacle[] = [];
    const collectibles: Collectible[] = [];
    const decorations: Decoration[] = [];
    let speed = 0;
    let direction: 1 | -1 = Math.random() > 0.5 ? 1 : -1;

    if (index <= 1) {
      // Safe spawn area
      type = 'GRASS';
      // Side boundary decorations (trees)
      for (let x = -8; x <= 8; x++) {
        if (x < this.minCol || x > this.maxCol) {
          decorations.push({ x, type: 'TREE', heightVariation: (x * 7) % 5 });
        }
      }
    } else {
      // Pick lane type based on progression
      const prevLane = this.lanes.get(index - 1);
      const prevType = prevLane ? prevLane.type : 'GRASS';

      // Avoid more than 4 consecutive roads or rivers
      let roadStreak = 0;
      let riverStreak = 0;
      for (let i = 1; i <= 3; i++) {
        const l = this.lanes.get(index - i);
        if (l?.type === 'ROAD') roadStreak++;
        if (l?.type === 'RIVER') riverStreak++;
      }

      const roll = Math.random();

      if (riverStreak >= 3 || roadStreak >= 4) {
        type = 'GRASS';
      } else if (roll < 0.28) {
        type = 'GRASS';
      } else if (roll < 0.65) {
        type = 'ROAD';
      } else if (roll < 0.88) {
        type = 'RIVER';
      } else {
        type = 'RAILROAD';
      }

      // Add boundary trees on every lane
      for (let x = -7; x <= 7; x++) {
        if (x < this.minCol || x > this.maxCol) {
          decorations.push({ x, type: 'TREE' });
        }
      }

      if (type === 'GRASS') {
        // Safe lane with scattered trees, rocks, flowers
        const numObstacles = Math.floor(Math.random() * 2) + 1;
        const availableCols = [-3, -2, -1, 0, 1, 2, 3];
        // Shuffle available cols
        for (let i = availableCols.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [availableCols[i], availableCols[j]] = [availableCols[j], availableCols[i]];
        }

        for (let i = 0; i < numObstacles; i++) {
          const col = availableCols[i];
          const decType = Math.random() > 0.4 ? 'TREE' : 'ROCK';
          decorations.push({ x: col, type: decType });
        }

        // Add corn or power up occasionally
        if (Math.random() < 0.35) {
          const freeCols = availableCols.slice(numObstacles);
          if (freeCols.length > 0) {
            const coinCol = freeCols[0];
            const pUpRoll = Math.random();
            let cType: Collectible['type'] = 'CORN';
            if (pUpRoll < 0.05) cType = 'SHIELD';
            else if (pUpRoll < 0.10) cType = 'SLOWMO';
            else if (pUpRoll < 0.15) cType = 'MAGNET';
            else if (pUpRoll < 0.22) cType = 'GOLDEN_EGG';

            collectibles.push({
              id: `c_${index}_${coinCol}`,
              x: coinCol,
              y: index,
              type: cType,
              bobOffset: Math.random() * Math.PI * 2,
            });
          }
        }
      } else if (type === 'ROAD') {
        // Road with moving vehicles
        const baseSpeed = 1.4 + Math.random() * 1.8 + Math.min(2.0, index * 0.015);
        speed = baseSpeed * direction;

        const carCount = Math.floor(Math.random() * 2) + 2; // 2 or 3 cars
        const spacing = 18 / carCount;
        const subTypes = ['sedan', 'sports', 'truck', 'bus'];
        const carColors = ['#EF4444', '#3B82F6', '#EAB308', '#10B981', '#EC4899', '#8B5CF6'];

        for (let i = 0; i < carCount; i++) {
          const offset = i * spacing + (Math.random() * 1.5 - 0.75);
          const subType = subTypes[Math.floor(Math.random() * subTypes.length)];
          const width = subType === 'truck' ? 2.4 : subType === 'bus' ? 2.8 : 1.5;
          const color = carColors[Math.floor(Math.random() * carColors.length)];

          obstacles.push({
            id: `car_${index}_${i}`,
            type: subType === 'truck' || subType === 'bus' ? 'TRUCK' : 'CAR',
            x: offset - 9,
            width,
            speed,
            color,
            subType,
          });
        }
      } else if (type === 'RIVER') {
        // River with floating logs or lily pads
        const baseSpeed = 0.9 + Math.random() * 1.1 + Math.min(1.2, index * 0.008);
        speed = baseSpeed * direction;

        const isLilypads = Math.random() < 0.35;
        const logCount = isLilypads ? 4 : 3;
        const spacing = 18 / logCount;

        for (let i = 0; i < logCount; i++) {
          const offset = i * spacing + (Math.random() * 0.8 - 0.4);
          const width = isLilypads ? 1.0 : Math.random() > 0.5 ? 2.4 : 1.8;

          obstacles.push({
            id: `log_${index}_${i}`,
            type: isLilypads ? 'LILYPAD' : 'LOG',
            x: offset - 9,
            width,
            speed,
            color: isLilypads ? '#22C55E' : '#78350F',
            subType: isLilypads ? 'lilypad' : 'woodLog',
          });

          // Floating corn on logs sometimes!
          if (Math.random() < 0.22) {
            collectibles.push({
              id: `corn_log_${index}_${i}`,
              x: offset - 9,
              y: index,
              type: 'CORN',
              bobOffset: Math.random() * Math.PI * 2,
            });
          }
        }
      } else if (type === 'RAILROAD') {
        // High speed train lane
        speed = 0;
      }
    }

    const lane: Lane = {
      index,
      type,
      obstacles,
      collectibles,
      decorations,
      speed,
      direction,
      hasLilypads: type === 'RIVER' && obstacles.some((o) => o.type === 'LILYPAD'),
    };

    if (type === 'RAILROAD') {
      lane.trainState = {
        approaching: false,
        warningTimer: 2.0 + Math.random() * 4.0,
        isLightOn: false,
        trainActive: false,
        trainX: direction === 1 ? -18 : 18,
        trainSpeed: direction === 1 ? 16 : -16,
        trainLength: 12,
        cooldownTimer: 0,
      };
    }

    this.lanes.set(index, lane);
    this.highestGeneratedLane = Math.max(this.highestGeneratedLane, index);
  }

  // --- Input & Controls ---

  public handleInput(dx: number, dy: number) {
    if (this.isDead || this.isPaused) return;

    let facing: 0 | 1 | 2 | 3 = 0;
    if (dy > 0) facing = 0; // Up
    else if (dy < 0) facing = 2; // Down
    else if (dx > 0) facing = 1; // Right
    else if (dx < 0) facing = 3; // Left

    if (this.isHopping) {
      // Buffer the next hop if near end of animation
      this.queuedHop = { dx, dy, facing };
      return;
    }

    this.executeHop(dx, dy, facing);
  }

  private executeHop(dx: number, dy: number, facing: 0 | 1 | 2 | 3) {
    const targetX = Math.round(this.playerGridX + dx);
    const targetY = Math.round(this.playerGridY + dy);

    // Boundary constraints
    if (targetX < this.minCol || targetX > this.maxCol) {
      // Hit outer hedge/fence
      this.playerFacing = facing;
      sound.triggerHaptic(10);
      return;
    }

    // Do not allow player to drop behind visible camera bottom
    if (targetY < Math.floor(this.cameraY - 2.5)) {
      return;
    }

    // Check tree/rock collision in destination lane
    const targetLane = this.lanes.get(targetY);
    if (targetLane) {
      const obstacle = targetLane.decorations.find(
        (d) => (d.type === 'TREE' || d.type === 'ROCK') && Math.round(d.x) === targetX
      );
      if (obstacle) {
        // Blocked by tree/rock
        this.playerFacing = facing;
        sound.triggerHaptic(15);
        this.spawnDust(this.playerGridX, this.playerGridY, '#94A3B8', 3);
        return;
      }
    }

    // Start hop
    this.isHopping = true;
    this.hopStartTime = performance.now();
    this.hopStartGridX = this.playerGridX;
    this.hopStartGridY = this.playerGridY;
    this.hopTargetGridX = targetX;
    this.hopTargetGridY = targetY;
    this.playerFacing = facing;

    // Reset eagle idle timer on forward progress
    if (dy > 0) {
      this.idleTimer = 0;
    }

    sound.playHop();
    sound.triggerHaptic(12);

    // Spawn skin trail
    this.spawnSkinTrail(this.playerGridX, this.playerGridY);
  }

  // --- Main Update Loop ---

  private loop = (currentTime: number) => {
    if (!this.isRunning) return;

    const delta = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    if (!this.isPaused) {
      this.update(delta);
    }
    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    const timeScale = this.powerUps.slowMoDuration > 0 ? 0.45 : 1.0;

    // Update active powerup timers
    if (this.powerUps.slowMoDuration > 0) {
      this.powerUps.slowMoDuration -= dt * 1000;
    }
    if (this.powerUps.magnetDuration > 0) {
      this.powerUps.magnetDuration -= dt * 1000;
    }
    if (this.powerUps.frenzyDuration > 0) {
      this.powerUps.frenzyDuration -= dt * 1000;
    }

    // Update combo timer
    if (this.cornCombo > 1) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.cornCombo = 1;
      }
    }

    // Update eagle predator timer
    if (!this.isDead) {
      this.idleTimer += dt;
      if (this.idleTimer >= this.eagleMaxIdle && !this.eagleState.active) {
        // Trigger eagle swoop!
        this.eagleState.active = true;
        this.eagleState.targetX = this.playerAnimX;
        this.eagleState.targetY = this.playerAnimY;
        this.eagleState.x = this.playerAnimX;
        this.eagleState.y = this.playerAnimY + 12;
        this.eagleState.z = 240;
        sound.playEagleSwoop();
      }
    }

    // Update eagle swoop movement
    if (this.eagleState.active) {
      const speed = 28 * dt;
      this.eagleState.y -= speed * 0.9;
      this.eagleState.z -= speed * 18;

      if (this.eagleState.z <= 0 && !this.eagleState.caughtPlayer) {
        this.eagleState.caughtPlayer = true;
        this.die('EAGLE');
      }
    }

    // Ensure lanes are populated ahead
    while (this.highestGeneratedLane < this.playerGridY + 22) {
      this.generateLane(this.highestGeneratedLane + 1);
    }

    // Prune distant old lanes to conserve memory
    const pruneThreshold = Math.floor(this.cameraY - 8);
    for (const key of this.lanes.keys()) {
      if (key < pruneThreshold) {
        this.lanes.delete(key);
      }
    }

    // Update Lanes & Obstacles
    for (const lane of this.lanes.values()) {
      this.updateLane(lane, dt * timeScale);
    }

    // Update Player Hop Animation
    if (this.isHopping) {
      const now = performance.now();
      const progress = Math.min(1, (now - this.hopStartTime) / this.hopDuration);

      // Smooth step
      const t = progress;
      this.playerGridX = this.hopStartGridX + (this.hopTargetGridX - this.hopStartGridX) * t;
      this.playerGridY = this.hopStartGridY + (this.hopTargetGridY - this.hopStartGridY) * t;
      this.playerAnimX = this.playerGridX;
      this.playerAnimY = this.playerGridY;
      // Parabolic jump height
      this.playerAnimZ = Math.sin(progress * Math.PI) * 20;

      if (progress >= 1) {
        this.isHopping = false;
        this.playerGridX = Math.round(this.hopTargetGridX);
        this.playerGridY = Math.round(this.hopTargetGridY);
        this.playerAnimX = this.playerGridX;
        this.playerAnimY = this.playerGridY;
        this.playerAnimZ = 0;

        // Landing dust
        const landLane = this.lanes.get(this.playerGridY);
        if (landLane?.type === 'RIVER') {
          // Check if on log
          const onLog = this.checkLogCollision(this.playerGridX, this.playerGridY, landLane);
          if (onLog) {
            this.spawnDust(this.playerGridX, this.playerGridY, '#38BDF8', 4);
          } else {
            // Sunk into water!
            this.die('RIVER');
          }
        } else {
          this.spawnDust(this.playerGridX, this.playerGridY, '#CBD5E1', 3);
        }

        // Process score advancement
        if (this.playerGridY > this.maxForwardY) {
          const delta = this.playerGridY - this.maxForwardY;
          this.maxForwardY = this.playerGridY;
          const frenzyMultiplier = this.powerUps.frenzyDuration > 0 ? 2 : 1;
          this.score += delta * frenzyMultiplier;

          if (this.score > this.highestScore) {
            this.highestScore = this.score;
          }

          // Check biome shift
          this.activeBiome = getBiomeForScore(this.score);

          this.callbacks.onScoreUpdate(this.score, this.highestScore);
          this.callbacks.onAchievementProgress('score_50', this.score);
          this.callbacks.onAchievementProgress('score_100', this.score);

          if (this.playerGridY >= 1) {
            this.callbacks.onAchievementProgress('first_cross', 1);
          }
        }

        // Process next queued hop for responsive mobile thumb tapping
        if (this.queuedHop) {
          const q = this.queuedHop;
          this.queuedHop = null;
          this.executeHop(q.dx, q.dy, q.facing);
        }
      }
    } else {
      // Idle on grid or riding log
      this.playerAnimX = this.playerGridX;
      this.playerAnimY = this.playerGridY;
      this.playerAnimZ = 0;

      const currentLane = this.lanes.get(this.playerGridY);
      if (currentLane?.type === 'RIVER') {
        const onLog = this.checkLogCollision(this.playerGridX, this.playerGridY, currentLane);
        if (onLog) {
          // Ride log
          this.playerGridX += currentLane.speed * dt * timeScale;
          this.playerAnimX = this.playerGridX;

          // Check out of bounds while riding log
          if (this.playerGridX < this.minCol - 0.8 || this.playerGridX > this.maxCol + 0.8) {
            this.die('RIVER');
          }
        } else if (!this.isDead) {
          this.die('RIVER');
        }
      }
    }

    // Check Collectibles
    this.checkCollectibles(dt);

    // Check Vehicle & Train Collisions
    if (!this.isDead) {
      this.checkHazardCollisions();
    }

    // Smooth Camera Tracking
    const targetCamY = this.playerAnimY;
    const targetCamX = this.playerAnimX * 0.25;
    this.cameraY += (targetCamY - this.cameraY) * Math.min(1, dt * 7);
    this.cameraX += (targetCamX - this.cameraX) * Math.min(1, dt * 4);

    // Update Particles
    this.updateParticles(dt);
  }

  private updateLane(lane: Lane, dt: number) {
    const wrapMin = -11;
    const wrapMax = 11;
    const wrapSpan = wrapMax - wrapMin;

    if (lane.type === 'ROAD' || lane.type === 'RIVER') {
      for (const obstacle of lane.obstacles) {
        obstacle.x += obstacle.speed * dt;

        // Wrap around bounds
        if (lane.direction === 1 && obstacle.x > wrapMax) {
          obstacle.x -= wrapSpan;
        } else if (lane.direction === -1 && obstacle.x < wrapMin) {
          obstacle.x += wrapSpan;
        }
      }
    } else if (lane.type === 'RAILROAD' && lane.trainState) {
      const ts = lane.trainState;
      if (ts.trainActive) {
        ts.trainX += ts.trainSpeed * dt;
        // Check train passed
        if (
          (ts.trainSpeed > 0 && ts.trainX > wrapMax + ts.trainLength) ||
          (ts.trainSpeed < 0 && ts.trainX < wrapMin - ts.trainLength)
        ) {
          ts.trainActive = false;
          ts.approaching = false;
          ts.isLightOn = false;
          ts.warningTimer = 4.0 + Math.random() * 5.0;
        }
      } else {
        ts.warningTimer -= dt;
        if (ts.warningTimer <= 1.4 && ts.warningTimer > 0) {
          // Warning blink & bell
          ts.approaching = true;
          ts.isLightOn = Math.floor(ts.warningTimer * 6) % 2 === 0;
          if (Math.random() < dt * 4) {
            sound.playTrainBell();
          }
        } else if (ts.warningTimer <= 0) {
          // Launch train!
          ts.trainActive = true;
          ts.trainX = ts.trainSpeed > 0 ? wrapMin - ts.trainLength : wrapMax + ts.trainLength;
          sound.playTrainWhoosh();
        }
      }
    }

    // Collectibles bobbing
    for (const c of lane.collectibles) {
      c.bobOffset += dt * 3.5;
    }
  }

  private checkLogCollision(playerX: number, playerY: number, lane: Lane): boolean {
    const margin = 0.45;
    for (const log of lane.obstacles) {
      const left = log.x - log.width / 2 - margin;
      const right = log.x + log.width / 2 + margin;
      if (playerX >= left && playerX <= right) {
        return true;
      }
    }
    return false;
  }

  private checkHazardCollisions() {
    const currentLane = this.lanes.get(Math.round(this.playerGridY));
    if (!currentLane) return;

    const chickenWidth = 0.55;
    const chickenX = this.playerAnimX;

    // Check Road Vehicles
    if (currentLane.type === 'ROAD') {
      for (const car of currentLane.obstacles) {
        const carLeft = car.x - car.width / 2;
        const carRight = car.x + car.width / 2;
        const chickenLeft = chickenX - chickenWidth / 2;
        const chickenRight = chickenX + chickenWidth / 2;

        if (chickenRight > carLeft + 0.1 && chickenLeft < carRight - 0.1) {
          // Hit by vehicle!
          if (this.powerUps.shield) {
            // Deflect with shield!
            this.powerUps.shield = false;
            sound.playShieldPop();
            this.spawnExplosion(chickenX, this.playerAnimY, '#38BDF8', 12);
            sound.triggerHaptic([30, 50, 30]);
            return;
          }
          this.die('CAR');
          return;
        }
      }
    }

    // Check Train
    if (currentLane.type === 'RAILROAD' && currentLane.trainState?.trainActive) {
      const ts = currentLane.trainState;
      const trainLeft = ts.trainSpeed > 0 ? ts.trainX - ts.trainLength : ts.trainX;
      const trainRight = ts.trainSpeed > 0 ? ts.trainX : ts.trainX + ts.trainLength;

      if (chickenX >= trainLeft - 0.3 && chickenX <= trainRight + 0.3) {
        if (this.powerUps.shield) {
          this.powerUps.shield = false;
          sound.playShieldPop();
          this.spawnExplosion(chickenX, this.playerAnimY, '#EF4444', 15);
          return;
        }
        this.die('TRAIN');
      }
    }
  }

  private checkCollectibles(dt: number) {
    const lane = this.lanes.get(Math.round(this.playerGridY));
    if (!lane) return;

    for (let i = lane.collectibles.length - 1; i >= 0; i--) {
      const c = lane.collectibles[i];
      let dist = Math.hypot(c.x - this.playerAnimX, c.y - this.playerAnimY);

      // Magnet pull
      if (this.powerUps.magnetDuration > 0 && dist < 3.2) {
        const angle = Math.atan2(this.playerAnimY - c.y, this.playerAnimX - c.x);
        c.x += Math.cos(angle) * dt * 7;
        c.y += Math.sin(angle) * dt * 7;
        dist = Math.hypot(c.x - this.playerAnimX, c.y - this.playerAnimY);
      }

      if (dist < 0.7) {
        // Collect!
        lane.collectibles.splice(i, 1);
        this.collectItem(c);
      }
    }
  }

  private collectItem(c: Collectible) {
    if (c.type === 'CORN') {
      const amount = 1 * (this.powerUps.frenzyDuration > 0 ? 2 : 1);
      this.runCorn += amount;
      this.totalCorn += amount;
      this.cornCombo = Math.min(10, this.cornCombo + 1);
      this.comboTimer = 2.5;

      sound.playCorn(this.cornCombo);
      sound.triggerHaptic(10);
      this.spawnSparkles(c.x, c.y, '#FBBF24', 8);
      this.callbacks.onCornCollect(amount, this.totalCorn);
      this.callbacks.onAchievementProgress('corn_hoarder', this.totalCorn);
    } else if (c.type === 'GOLDEN_EGG') {
      const amount = 5;
      this.runCorn += amount;
      this.totalCorn += amount;
      sound.playGoldenEgg();
      sound.triggerHaptic([20, 40, 20]);
      this.spawnSparkles(c.x, c.y, '#F59E0B', 15);
      this.callbacks.onCornCollect(amount, this.totalCorn);
    } else if (c.type === 'SHIELD') {
      this.powerUps.shield = true;
      sound.playPowerUp();
      sound.triggerHaptic([30, 30]);
      this.spawnSparkles(c.x, c.y, '#38BDF8', 12);
    } else if (c.type === 'SLOWMO') {
      this.powerUps.slowMoDuration = 6000;
      sound.playPowerUp();
      sound.triggerHaptic([20, 20]);
      this.spawnSparkles(c.x, c.y, '#A855F7', 12);
    } else if (c.type === 'MAGNET') {
      this.powerUps.magnetDuration = 7000;
      sound.playPowerUp();
      sound.triggerHaptic([20, 20]);
      this.spawnSparkles(c.x, c.y, '#EF4444', 12);
    }
  }

  private die(cause: DeathCause) {
    if (this.isDead) return;
    this.isDead = true;
    this.deathCause = cause;

    if (cause === 'RIVER') {
      sound.playSplash();
      this.spawnWaterSplash(this.playerAnimX, this.playerAnimY);
    } else if (cause === 'EAGLE') {
      // Caught in mid-air
      sound.playSquawk();
    } else {
      sound.playSquawk();
      sound.playHonk();
      this.spawnExplosion(this.playerAnimX, this.playerAnimY, '#EF4444', 18);
    }

    sound.triggerHaptic([80, 100, 80]);

    setTimeout(() => {
      this.callbacks.onGameOver(this.score, cause, this.runCorn);
    }, 700);
  }

  // --- Particle Systems ---

  private spawnDust(gridX: number, gridY: number, color: string, count: number = 3) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: gridX + (Math.random() * 0.4 - 0.2),
        y: gridY + (Math.random() * 0.4 - 0.2),
        z: 0,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        vz: Math.random() * 2 + 1,
        color,
        size: Math.random() * 4 + 3,
        life: 0.35,
        maxLife: 0.35,
        type: 'DUST',
      });
    }
  }

  private spawnSkinTrail(gridX: number, gridY: number) {
    const effect = this.activeSkin.specialEffect || 'FEATHER';
    const color = this.activeSkin.accentColor || '#FFFFFF';

    for (let i = 0; i < 2; i++) {
      this.particles.push({
        x: gridX + (Math.random() * 0.3 - 0.15),
        y: gridY + (Math.random() * 0.3 - 0.15),
        z: 4,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        vz: Math.random() * 1.5,
        color: effect === 'NEON' ? '#00FFFF' : effect === 'MAGIC' ? '#C084FC' : color,
        size: effect === 'BUBBLE' ? 5 : 4,
        life: 0.4,
        maxLife: 0.4,
        type: effect === 'BUBBLE' ? 'WATER' : effect === 'FEATHER' ? 'FEATHER' : 'SPARK',
      });
    }
  }

  private spawnSparkles(gridX: number, gridY: number, color: string, count: number = 8) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: gridX,
        y: gridY,
        z: 10,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        vz: Math.random() * 4 + 2,
        color,
        size: Math.random() * 5 + 3,
        life: 0.6,
        maxLife: 0.6,
        type: 'SPARK',
      });
    }
  }

  private spawnWaterSplash(gridX: number, gridY: number) {
    for (let i = 0; i < 14; i++) {
      this.particles.push({
        x: gridX + (Math.random() * 0.4 - 0.2),
        y: gridY + (Math.random() * 0.4 - 0.2),
        z: 0,
        vx: (Math.random() - 0.5) * 2.5,
        vy: (Math.random() - 0.5) * 2.5,
        vz: Math.random() * 5 + 3,
        color: '#E0F2FE',
        size: Math.random() * 5 + 3,
        life: 0.5,
        maxLife: 0.5,
        type: 'WATER',
      });
    }
  }

  private spawnExplosion(gridX: number, gridY: number, color: string, count: number = 16) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: gridX,
        y: gridY,
        z: 6,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        vz: Math.random() * 6 + 2,
        color: Math.random() > 0.5 ? color : '#FFFFFF',
        size: Math.random() * 6 + 4,
        life: 0.6,
        maxLife: 0.6,
        type: 'FEATHER',
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vz -= 12 * dt; // Gravity
      if (p.z < 0) p.z = 0;
    }
  }

  // --- Rendering Pipeline ---

  public render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Save camera transform
    this.ctx.save();

    // 2.5D Orthographic perspective projection
    // Grid (0,0) rendered at originX, originY
    const camPixelX = this.cameraX * this.tileSize;
    const camPixelY = this.cameraY * this.tileSize;

    this.ctx.translate(this.originX - camPixelX, this.originY + camPixelY);

    // Visible lane range
    const visibleRangeY = Math.ceil(this.height / this.tileSize) + 6;
    const minVisibleY = Math.floor(this.cameraY - 4);
    const maxVisibleY = Math.ceil(this.cameraY + visibleRangeY);

    // 1. Render Ground Terrain
    for (let y = minVisibleY; y <= maxVisibleY; y++) {
      const lane = this.lanes.get(y);
      if (lane) {
        this.renderLaneGround(lane);
      }
    }

    // 2. Render Depth-Sorted Game Objects (Decorations, Logs, Collectibles, Vehicles, Chicken)
    // In our top-down perspective, higher Y (further forward) is rendered after lower Y.
    for (let y = minVisibleY; y <= maxVisibleY; y++) {
      const lane = this.lanes.get(y);
      if (!lane) continue;

      // Render decorations (trees, rocks, flowers)
      for (const dec of lane.decorations) {
        this.renderDecoration(dec, lane.index);
      }

      // Render logs / lilypads on river
      if (lane.type === 'RIVER') {
        for (const log of lane.obstacles) {
          this.renderLog(log, lane.index);
        }
      }

      // Render collectibles
      for (const c of lane.collectibles) {
        this.renderCollectible(c);
      }

      // Render vehicles on road
      if (lane.type === 'ROAD') {
        for (const car of lane.obstacles) {
          this.renderCar(car, lane.index);
        }
      }

      // Render train track signals & train
      if (lane.type === 'RAILROAD') {
        this.renderRailroad(lane);
      }

      // Render Player Chicken if in this lane
      if (Math.round(this.playerAnimY) === y && !this.isDead) {
        this.renderChicken();
      }
    }

    // If dead (e.g. eagle carrying or splat), render chicken accordingly
    if (this.isDead && this.deathCause === 'EAGLE') {
      this.renderChicken();
    }

    // 3. Render Eagle if active
    if (this.eagleState.active) {
      this.renderEagle();
    }

    // 4. Render Particles
    this.renderParticles();

    this.ctx.restore();

    // 5. Render HUD / Vignette Overlay
    this.renderVignette();
  }

  // --- Rendering Primitives ---

  private renderLaneGround(lane: Lane) {
    const yPixel = -lane.index * this.tileSize;
    const tileH = this.tileSize;
    const biome = this.activeBiome;

    // Full screen width background bar
    const leftX = -this.width * 1.5;
    const rightW = this.width * 3;

    if (lane.type === 'GRASS') {
      // Grass strip with checkerboard shade
      this.ctx.fillStyle = lane.index % 2 === 0 ? biome.grassColor : biome.grassDarkColor;
      this.ctx.fillRect(leftX, yPixel - tileH / 2, rightW, tileH);

      // Grass edge highlight
      this.ctx.fillStyle = 'rgba(255,255,255,0.08)';
      this.ctx.fillRect(leftX, yPixel - tileH / 2, rightW, 2);
    } else if (lane.type === 'ROAD') {
      // Asphalt road
      this.ctx.fillStyle = biome.roadColor;
      this.ctx.fillRect(leftX, yPixel - tileH / 2, rightW, tileH);

      // Dashed lane marking
      this.ctx.fillStyle = biome.roadMarkColor;
      const dashW = 16;
      const dashH = 3;
      const spacing = 36;
      for (let x = -this.width; x < this.width; x += spacing) {
        this.ctx.fillRect(x, yPixel - dashH / 2, dashW, dashH);
      }

      // Asphalt curb border
      this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
      this.ctx.fillRect(leftX, yPixel + tileH / 2 - 2, rightW, 2);
    } else if (lane.type === 'RIVER') {
      // Flowing water
      this.ctx.fillStyle = biome.waterColor;
      this.ctx.fillRect(leftX, yPixel - tileH / 2, rightW, tileH);

      // Water flow shine streaks
      this.ctx.fillStyle = biome.waterShineColor;
      const streamTime = performance.now() * 0.001 * lane.direction * 35;
      const streamW = 20;
      for (let x = -this.width + (streamTime % 60); x < this.width; x += 60) {
        this.ctx.fillRect(x, yPixel - 4, streamW, 2);
        this.ctx.fillRect(x + 25, yPixel + 6, streamW * 0.6, 2);
      }
    } else if (lane.type === 'RAILROAD') {
      // Gravel ballast
      this.ctx.fillStyle = biome.railGravelColor;
      this.ctx.fillRect(leftX, yPixel - tileH / 2, rightW, tileH);

      // Wooden rail ties
      this.ctx.fillStyle = '#451A03';
      const tieW = 6;
      const tieH = tileH - 6;
      for (let x = -this.width; x < this.width; x += 18) {
        this.ctx.fillRect(x - tieW / 2, yPixel - tieH / 2, tieW, tieH);
      }

      // Steel rails (top & bottom)
      this.ctx.fillStyle = '#94A3B8';
      this.ctx.fillRect(leftX, yPixel - 9, rightW, 3);
      this.ctx.fillRect(leftX, yPixel + 6, rightW, 3);

      // Steel shine
      this.ctx.fillStyle = '#F8FAFC';
      this.ctx.fillRect(leftX, yPixel - 9, rightW, 1);
      this.ctx.fillRect(leftX, yPixel + 6, rightW, 1);
    }
  }

  private renderDecoration(dec: Decoration, laneIndex: number) {
    const x = dec.x * this.tileSize;
    const y = -laneIndex * this.tileSize;

    if (dec.type === 'TREE') {
      // Tree shadow
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      this.ctx.beginPath();
      this.ctx.ellipse(x + 4, y + 4, 16, 10, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Trunk
      this.ctx.fillStyle = '#78350F';
      this.ctx.fillRect(x - 4, y - 10, 8, 12);

      // 3D Voxel Foliage (Layers)
      const foliageColor = this.activeBiome.id === 'alpine_snowpass' ? '#1E293B' : '#15803D';
      const foliageLight = this.activeBiome.id === 'alpine_snowpass' ? '#F8FAFC' : '#22C55E';

      // Bottom layer
      this.ctx.fillStyle = foliageColor;
      this.ctx.beginPath();
      this.ctx.roundRect(x - 16, y - 30, 32, 22, 6);
      this.ctx.fill();

      // Top highlight layer
      this.ctx.fillStyle = foliageLight;
      this.ctx.beginPath();
      this.ctx.roundRect(x - 13, y - 38, 26, 16, 5);
      this.ctx.fill();
    } else if (dec.type === 'ROCK') {
      // Rock shadow
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      this.ctx.beginPath();
      this.ctx.ellipse(x + 3, y + 3, 14, 8, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Rock body
      this.ctx.fillStyle = '#64748B';
      this.ctx.beginPath();
      this.ctx.roundRect(x - 12, y - 14, 24, 16, 4);
      this.ctx.fill();

      // Highlight facet
      this.ctx.fillStyle = '#94A3B8';
      this.ctx.beginPath();
      this.ctx.roundRect(x - 10, y - 16, 16, 8, 3);
      this.ctx.fill();
    }
  }

  private renderLog(log: Obstacle, laneIndex: number) {
    const x = log.x * this.tileSize;
    const y = -laneIndex * this.tileSize;
    const w = log.width * this.tileSize;
    const h = this.tileSize * 0.7;

    if (log.type === 'LILYPAD') {
      // Lilypad
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      this.ctx.beginPath();
      this.ctx.arc(x + 2, y + 2, w * 0.45, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#22C55E';
      this.ctx.beginPath();
      this.ctx.arc(x, y, w * 0.45, 0.25, Math.PI * 1.85);
      this.ctx.lineTo(x, y);
      this.ctx.closePath();
      this.ctx.fill();

      // Flower on lilypad
      this.ctx.fillStyle = '#F472B6';
      this.ctx.beginPath();
      this.ctx.arc(x, y - 2, 4, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      // Wooden Log (3D rounded cylinder)
      // Drop shadow on water
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      this.ctx.beginPath();
      this.ctx.roundRect(x - w / 2 + 3, y - h / 2 + 4, w, h, 6);
      this.ctx.fill();

      // Main bark
      this.ctx.fillStyle = '#78350F';
      this.ctx.beginPath();
      this.ctx.roundRect(x - w / 2, y - h / 2, w, h, 6);
      this.ctx.fill();

      // Log top highlight
      this.ctx.fillStyle = '#92400E';
      this.ctx.fillRect(x - w / 2 + 4, y - h / 2 + 2, w - 8, h * 0.4);

      // Wood ring ends
      this.ctx.fillStyle = '#D97706';
      this.ctx.beginPath();
      this.ctx.ellipse(x - w / 2 + 4, y, 3, h * 0.35, 0, 0, Math.PI * 2);
      this.ctx.ellipse(x + w / 2 - 4, y, 3, h * 0.35, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private renderCar(car: Obstacle, laneIndex: number) {
    const x = car.x * this.tileSize;
    const y = -laneIndex * this.tileSize;
    const w = car.width * this.tileSize;
    const h = this.tileSize * 0.65;
    const dir = car.speed > 0 ? 1 : -1;

    // Drop shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.beginPath();
    this.ctx.roundRect(x - w / 2 + 3, y - h / 2 + 4, w, h, 5);
    this.ctx.fill();

    // Wheels (4 black rounded rects)
    this.ctx.fillStyle = '#0F172A';
    const wheelW = 8;
    const wheelH = 4;
    this.ctx.fillRect(x - w / 2 + 6, y - h / 2 - 2, wheelW, wheelH);
    this.ctx.fillRect(x + w / 2 - 14, y - h / 2 - 2, wheelW, wheelH);
    this.ctx.fillRect(x - w / 2 + 6, y + h / 2 - 2, wheelW, wheelH);
    this.ctx.fillRect(x + w / 2 - 14, y + h / 2 - 2, wheelW, wheelH);

    // Car Body (lower chassis)
    this.ctx.fillStyle = car.color;
    this.ctx.beginPath();
    this.ctx.roundRect(x - w / 2, y - h / 2, w, h, 5);
    this.ctx.fill();

    // Car Roof / Cabin
    const cabinW = w * 0.55;
    const cabinH = h * 0.75;
    const cabinX = x - (dir === 1 ? w * 0.08 : -w * 0.08);

    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'; // tinted windshield
    this.ctx.beginPath();
    this.ctx.roundRect(cabinX - cabinW / 2, y - cabinH / 2 - 3, cabinW, cabinH, 4);
    this.ctx.fill();

    // Roof top
    this.ctx.fillStyle = car.color;
    this.ctx.beginPath();
    this.ctx.roundRect(cabinX - cabinW / 2 + 3, y - cabinH / 2 - 2, cabinW - 6, cabinH - 4, 3);
    this.ctx.fill();

    // Headlights (glowing yellow in direction of movement)
    this.ctx.fillStyle = '#FEF08A';
    const lightX = dir === 1 ? x + w / 2 - 2 : x - w / 2;
    this.ctx.fillRect(lightX, y - h / 2 + 4, 2, 5);
    this.ctx.fillRect(lightX, y + h / 2 - 9, 2, 5);

    // Taillights (red)
    this.ctx.fillStyle = '#EF4444';
    const tailX = dir === 1 ? x - w / 2 : x + w / 2 - 2;
    this.ctx.fillRect(tailX, y - h / 2 + 4, 2, 4);
    this.ctx.fillRect(tailX, y + h / 2 - 8, 2, 4);
  }

  private renderRailroad(lane: Lane) {
    const y = -lane.index * this.tileSize;

    // Signal Post at right edge of screen
    const signalX = (this.maxCol + 1) * this.tileSize;
    const ts = lane.trainState;

    // Post base
    this.ctx.fillStyle = '#475569';
    this.ctx.fillRect(signalX - 3, y - 22, 6, 26);

    // Crossbuck sign
    this.ctx.fillStyle = '#F8FAFC';
    this.ctx.fillRect(signalX - 10, y - 24, 20, 4);
    this.ctx.fillRect(signalX - 2, y - 30, 4, 16);

    // Blinking lights
    const lightColor = ts?.isLightOn ? '#EF4444' : '#450A0A';
    this.ctx.fillStyle = lightColor;
    this.ctx.beginPath();
    this.ctx.arc(signalX - 6, y - 22, 3.5, 0, Math.PI * 2);
    this.ctx.arc(signalX + 6, y - 22, 3.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Render Express Train if active
    if (ts?.trainActive) {
      const trainW = ts.trainLength * this.tileSize;
      const trainH = this.tileSize * 0.8;
      const tx = ts.trainX * this.tileSize;

      // Drop shadow
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      this.ctx.fillRect(tx - trainW / 2 + 5, y - trainH / 2 + 5, trainW, trainH);

      // Train Body
      this.ctx.fillStyle = '#E2E8F0';
      this.ctx.beginPath();
      this.ctx.roundRect(tx - trainW / 2, y - trainH / 2, trainW, trainH, 6);
      this.ctx.fill();

      // Red express racing stripe
      this.ctx.fillStyle = '#DC2626';
      this.ctx.fillRect(tx - trainW / 2, y - 3, trainW, 6);

      // Windows
      this.ctx.fillStyle = '#0F172A';
      for (let wx = tx - trainW / 2 + 15; wx < tx + trainW / 2 - 15; wx += 24) {
        this.ctx.fillRect(wx, y - trainH / 2 + 4, 12, 7);
      }

      // Front bullet nose
      const noseDir = ts.trainSpeed > 0 ? 1 : -1;
      const frontX = noseDir === 1 ? tx + trainW / 2 : tx - trainW / 2;
      this.ctx.fillStyle = '#FEF08A';
      this.ctx.beginPath();
      this.ctx.arc(frontX, y, 6, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private renderCollectible(c: Collectible) {
    const x = c.x * this.tileSize;
    const y = -c.y * this.tileSize;
    const bob = Math.sin(c.bobOffset) * 4;

    // Drop shadow
    this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
    this.ctx.beginPath();
    this.ctx.ellipse(x, y + 6, 8, 4, 0, 0, Math.PI * 2);
    this.ctx.fill();

    if (c.type === 'CORN') {
      // Golden Ear of Corn
      this.ctx.fillStyle = '#F59E0B';
      this.ctx.beginPath();
      this.ctx.ellipse(x, y - 10 + bob, 6, 10, 0.2, 0, Math.PI * 2);
      this.ctx.fill();

      // Yellow corn kernels
      this.ctx.fillStyle = '#FBBF24';
      this.ctx.beginPath();
      this.ctx.arc(x - 1, y - 12 + bob, 3, 0, Math.PI * 2);
      this.ctx.arc(x + 2, y - 8 + bob, 3, 0, Math.PI * 2);
      this.ctx.fill();

      // Green husk leaves at bottom
      this.ctx.fillStyle = '#22C55E';
      this.ctx.beginPath();
      this.ctx.ellipse(x - 3, y - 3 + bob, 3, 6, -0.4, 0, Math.PI * 2);
      this.ctx.ellipse(x + 3, y - 3 + bob, 3, 6, 0.4, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (c.type === 'GOLDEN_EGG') {
      // Shimmering Golden Egg
      this.ctx.fillStyle = '#F59E0B';
      this.ctx.beginPath();
      this.ctx.ellipse(x, y - 10 + bob, 8, 12, 0, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#FEF08A';
      this.ctx.beginPath();
      this.ctx.ellipse(x - 2, y - 13 + bob, 3, 5, -0.3, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (c.type === 'SHIELD') {
      // Blue Shield Orb
      this.ctx.fillStyle = '#0284C7';
      this.ctx.beginPath();
      this.ctx.arc(x, y - 10 + bob, 11, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#38BDF8';
      this.ctx.beginPath();
      this.ctx.arc(x, y - 10 + bob, 8, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(x - 3, y - 13 + bob, 3, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (c.type === 'SLOWMO') {
      // Purple Snail Watch
      this.ctx.fillStyle = '#7E22CE';
      this.ctx.beginPath();
      this.ctx.arc(x, y - 10 + bob, 10, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#C084FC';
      this.ctx.beginPath();
      this.ctx.arc(x, y - 10 + bob, 7, 0, Math.PI * 2);
      this.ctx.fill();

      // Clock hands
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y - 10 + bob);
      this.ctx.lineTo(x, y - 14 + bob);
      this.ctx.moveTo(x, y - 10 + bob);
      this.ctx.lineTo(x + 3, y - 10 + bob);
      this.ctx.stroke();
    } else if (c.type === 'MAGNET') {
      // Red Horseshoe Magnet
      this.ctx.fillStyle = '#EF4444';
      this.ctx.beginPath();
      this.ctx.arc(x, y - 10 + bob, 9, Math.PI, 0, false);
      this.ctx.lineWidth = 5;
      this.ctx.strokeStyle = '#EF4444';
      this.ctx.stroke();

      // Silver tips
      this.ctx.fillStyle = '#E2E8F0';
      this.ctx.fillRect(x - 11, y - 10 + bob, 4, 4);
      this.ctx.fillRect(x + 7, y - 10 + bob, 4, 4);
    }
  }

  private renderChicken() {
    const x = this.playerAnimX * this.tileSize;
    const y = -this.playerAnimY * this.tileSize;
    const z = this.playerAnimZ;
    const facing = this.playerFacing;
    const skin = this.activeSkin;

    // Ground Shadow (scales with elevation Z)
    const shadowScale = Math.max(0.4, 1 - z / 50);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    this.ctx.beginPath();
    this.ctx.ellipse(x + 2, y + 4, 11 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Chicken Elevation Offset
    const cy = y - z;

    // 3D Voxel Squash & Stretch
    const hopProgress = this.isHopping
      ? (performance.now() - this.hopStartTime) / this.hopDuration
      : 0;
    const stretchY = this.isHopping ? 1 + Math.sin(hopProgress * Math.PI) * 0.25 : 1;
    const stretchX = this.isHopping ? 1 - Math.sin(hopProgress * Math.PI) * 0.15 : 1;

    this.ctx.save();
    this.ctx.translate(x, cy);
    this.ctx.scale(stretchX, stretchY);

    // 1. Chicken Body (Crisp rounded 3D cube)
    const bodyW = 20;
    const bodyH = 22;

    this.ctx.fillStyle = skin.accentColor; // side shadow
    this.ctx.beginPath();
    this.ctx.roundRect(-bodyW / 2 + 1, -bodyH, bodyW, bodyH, 6);
    this.ctx.fill();

    this.ctx.fillStyle = skin.primaryColor; // front face
    this.ctx.beginPath();
    this.ctx.roundRect(-bodyW / 2, -bodyH - 2, bodyW, bodyH, 6);
    this.ctx.fill();

    // 2. Head Comb (Red crest on top)
    this.ctx.fillStyle = skin.combColor;
    this.ctx.beginPath();
    this.ctx.roundRect(-4, -bodyH - 9, 8, 8, 3);
    this.ctx.fill();

    // 3. Beak & Eyes depending on facing direction
    if (facing === 0) {
      // Facing Up / Forward
      // Beak hidden on back, show tail feather
      this.ctx.fillStyle = skin.accentColor;
      this.ctx.beginPath();
      this.ctx.roundRect(-3, -bodyH / 2, 6, 8, 3);
      this.ctx.fill();
    } else if (facing === 1) {
      // Facing Right
      // Eye
      this.ctx.fillStyle = skin.eyeColor;
      this.ctx.beginPath();
      this.ctx.arc(4, -bodyH + 6, 2.5, 0, Math.PI * 2);
      this.ctx.fill();

      // Beak
      this.ctx.fillStyle = skin.beakColor;
      this.ctx.beginPath();
      this.ctx.moveTo(bodyW / 2 - 1, -bodyH + 6);
      this.ctx.lineTo(bodyW / 2 + 6, -bodyH + 9);
      this.ctx.lineTo(bodyW / 2 - 1, -bodyH + 11);
      this.ctx.closePath();
      this.ctx.fill();

      // Wattle
      this.ctx.fillStyle = skin.combColor;
      this.ctx.beginPath();
      this.ctx.arc(bodyW / 2 + 1, -bodyH + 13, 2, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (facing === 3) {
      // Facing Left
      // Eye
      this.ctx.fillStyle = skin.eyeColor;
      this.ctx.beginPath();
      this.ctx.arc(-4, -bodyH + 6, 2.5, 0, Math.PI * 2);
      this.ctx.fill();

      // Beak
      this.ctx.fillStyle = skin.beakColor;
      this.ctx.beginPath();
      this.ctx.moveTo(-bodyW / 2 + 1, -bodyH + 6);
      this.ctx.lineTo(-bodyW / 2 - 6, -bodyH + 9);
      this.ctx.lineTo(-bodyW / 2 + 1, -bodyH + 11);
      this.ctx.closePath();
      this.ctx.fill();

      // Wattle
      this.ctx.fillStyle = skin.combColor;
      this.ctx.beginPath();
      this.ctx.arc(-bodyW / 2 - 1, -bodyH + 13, 2, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      // Facing Down / Toward camera
      // Two eyes
      this.ctx.fillStyle = skin.eyeColor;
      this.ctx.beginPath();
      this.ctx.arc(-5, -bodyH + 6, 2.5, 0, Math.PI * 2);
      this.ctx.arc(5, -bodyH + 6, 2.5, 0, Math.PI * 2);
      this.ctx.fill();

      // Center beak
      this.ctx.fillStyle = skin.beakColor;
      this.ctx.beginPath();
      this.ctx.moveTo(-4, -bodyH + 8);
      this.ctx.lineTo(0, -bodyH + 14);
      this.ctx.lineTo(4, -bodyH + 8);
      this.ctx.closePath();
      this.ctx.fill();
    }

    // 4. Accessories
    if (skin.accessory === 'CROWN') {
      this.ctx.fillStyle = '#F59E0B';
      this.ctx.beginPath();
      this.ctx.moveTo(-7, -bodyH - 7);
      this.ctx.lineTo(-5, -bodyH - 14);
      this.ctx.lineTo(0, -bodyH - 9);
      this.ctx.lineTo(5, -bodyH - 14);
      this.ctx.lineTo(7, -bodyH - 7);
      this.ctx.closePath();
      this.ctx.fill();
    } else if (skin.accessory === 'VISOR') {
      this.ctx.fillStyle = '#38BDF8';
      this.ctx.fillRect(-8, -bodyH + 4, 16, 4);
    } else if (skin.accessory === 'HEADBAND') {
      this.ctx.fillStyle = '#EF4444';
      this.ctx.fillRect(-bodyW / 2 - 1, -bodyH + 2, bodyW + 2, 4);
    } else if (skin.accessory === 'GOGGLES') {
      this.ctx.fillStyle = '#0284C7';
      this.ctx.beginPath();
      this.ctx.arc(-5, -bodyH + 6, 4, 0, Math.PI * 2);
      this.ctx.arc(5, -bodyH + 6, 4, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (skin.accessory === 'WIZARD_HAT') {
      this.ctx.fillStyle = '#4C1D95';
      this.ctx.beginPath();
      this.ctx.moveTo(-10, -bodyH - 5);
      this.ctx.lineTo(0, -bodyH - 24);
      this.ctx.lineTo(10, -bodyH - 5);
      this.ctx.closePath();
      this.ctx.fill();
      // Hat brim
      this.ctx.fillRect(-12, -bodyH - 6, 24, 3);
    }

    // 5. Shield Orb if active
    if (this.powerUps.shield) {
      this.ctx.strokeStyle = '#38BDF8';
      this.ctx.lineWidth = 2.5;
      this.ctx.beginPath();
      this.ctx.arc(0, -bodyH / 2, 18, 0, Math.PI * 2);
      this.ctx.stroke();

      this.ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private renderEagle() {
    const e = this.eagleState;
    const x = e.x * this.tileSize;
    const y = -e.y * this.tileSize;
    const z = e.z;

    // Shadow on ground
    const shadowSize = Math.max(10, 45 - z * 0.12);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, shadowSize, shadowSize * 0.5, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Eagle Body in air
    const ey = y - z;
    this.ctx.fillStyle = '#1E293B';

    // Massive Wingspan
    this.ctx.beginPath();
    this.ctx.moveTo(x - 45, ey - 15);
    this.ctx.lineTo(x, ey);
    this.ctx.lineTo(x + 45, ey - 15);
    this.ctx.lineTo(x + 20, ey + 10);
    this.ctx.lineTo(x, ey + 5);
    this.ctx.lineTo(x - 20, ey + 10);
    this.ctx.closePath();
    this.ctx.fill();

    // Eagle Head & Beak
    this.ctx.fillStyle = '#F8FAFC';
    this.ctx.beginPath();
    this.ctx.arc(x, ey - 5, 8, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#F59E0B';
    this.ctx.beginPath();
    this.ctx.moveTo(x - 3, ey - 2);
    this.ctx.lineTo(x, ey + 8);
    this.ctx.lineTo(x + 3, ey - 2);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private renderParticles() {
    for (const p of this.particles) {
      const x = p.x * this.tileSize;
      const y = -p.y * this.tileSize - p.z;
      const alpha = Math.max(0, p.life / p.maxLife);

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;

      if (p.type === 'DUST') {
        this.ctx.beginPath();
        this.ctx.arc(x, y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (p.type === 'FEATHER') {
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, p.size, p.size * 0.5, p.vx, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (p.type === 'SPARK') {
        this.ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size);
      } else if (p.type === 'WATER') {
        this.ctx.beginPath();
        this.ctx.arc(x, y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }
  }

  private renderVignette() {
    // Subtle ambient top & bottom depth vignette
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, 'rgba(2, 6, 23, 0.45)');
    grad.addColorStop(0.15, 'rgba(2, 6, 23, 0)');
    grad.addColorStop(0.85, 'rgba(2, 6, 23, 0)');
    grad.addColorStop(1, 'rgba(2, 6, 23, 0.5)');

    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // If slow motion is active, subtle dreamy chromatic border
    if (this.powerUps.slowMoDuration > 0) {
      this.ctx.strokeStyle = 'rgba(192, 132, 252, 0.4)';
      this.ctx.lineWidth = 6;
      this.ctx.strokeRect(0, 0, this.width, this.height);
    }
  }
}
