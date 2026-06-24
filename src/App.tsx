import { useState, useEffect, useCallback, useRef } from 'react';
import { ItemType, Mob, Particle, Player, SCALE, SCALED_TILE, TileType } from './game/types';
import { World, generateWorld, getTile } from './game/world';
import { Camera, renderWorld, renderPlayer, renderMob, renderParticles, renderHUD, updateCamera } from './game/renderer';
import { createPlayer, createMob, updatePlayer, updateMobAI, updateParticles, attack, selectItem, RECIPES, canCraft, craft, getInventoryItems, spawnParticles } from './game/engine';

type GameState = 'intro' | 'playing' | 'dead' | 'crafting' | 'inventory';

const WORLD_SIZE = 128;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('intro');
  const gameRef = useRef<{
    world: World;
    player: Player;
    mobs: Mob[];
    particles: Particle[];
    camera: Camera;
    keys: Set<string>;
    spawnTimer: number;
    dayTime: number;
    dayCount: number;
  } | null>(null);
  const animRef = useRef<number>(0);

  // Mobile joystick state
  const joystickRef = useRef<{ active: boolean; startX: number; startY: number; dx: number; dy: number; touchId: number }>({
    active: false, startX: 0, startY: 0, dx: 0, dy: 0, touchId: -1,
  });

  const initGame = useCallback(() => {
    const seed = Math.random() * 999999 | 0;
    const world = generateWorld(WORLD_SIZE, WORLD_SIZE, seed);
    const player = createPlayer(WORLD_SIZE / 2, WORLD_SIZE / 2);
    player.activeItem = ItemType.SWORD;

    const mobs: Mob[] = [];
    for (let i = 0; i < 15; i++) {
      let mx: number, my: number;
      do {
        mx = Math.random() * WORLD_SIZE | 0;
        my = Math.random() * WORLD_SIZE | 0;
      } while (!([TileType.GRASS, TileType.SAND, TileType.DIRT].includes(getTile(world, mx, my))));
      const type = Math.random() < 0.4 ? 'zombie' : 'slime';
      mobs.push(createMob(mx, my, type, 1));
    }

    gameRef.current = {
      world,
      player,
      mobs,
      particles: [],
      camera: { x: player.x * SCALED_TILE - 400, y: player.y * SCALED_TILE - 300 },
      keys: new Set(),
      spawnTimer: 0,
      dayTime: 0,
      dayCount: 1,
    };
    setGameState('playing');
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const game = gameRef.current;
      if (!game) return;

      if (gameState === 'intro') {
        if (key === 'enter' || key === ' ') { e.preventDefault(); initGame(); }
        return;
      }
      if (gameState === 'dead') {
        if (key === 'enter' || key === ' ') { e.preventDefault(); setGameState('intro'); }
        return;
      }
      if (gameState === 'crafting') {
        if (key === 'q' || key === 'escape') { setGameState('playing'); return; }
        if (key >= '1' && key <= '6') {
          const idx = parseInt(key) - 1;
          if (RECIPES[idx] && craft(RECIPES[idx], game.player)) {
            spawnParticles(game.particles, game.player.x, game.player.y, '#FFD700', 5);
          }
        }
        return;
      }
      if (gameState === 'inventory') {
        if (key === 'e' || key === 'escape') { setGameState('playing'); }
        return;
      }

      game.keys.add(key);
      if (key >= '1' && key <= '9') selectItem(game.player, parseInt(key) - 1);
      if (key === ' ' || key === 'space') { e.preventDefault(); attack(game.player, game.world, game.mobs, game.particles); }
      if (key === 'e') setGameState('inventory');
      if (key === 'q') setGameState('crafting');
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      gameRef.current?.keys.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, initGame]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const gameLoop = (now: number) => {
      const game = gameRef.current;
      if (!game || !canvas || !ctx) return;

      lastTime = now;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Apply joystick input to keys
      const joy = joystickRef.current;
      if (joy.active) {
        const deadzone = 0.25;
        game.keys.delete('w'); game.keys.delete('a'); game.keys.delete('s'); game.keys.delete('d');
        if (joy.dy < -deadzone) game.keys.add('w');
        if (joy.dy > deadzone) game.keys.add('s');
        if (joy.dx < -deadzone) game.keys.add('a');
        if (joy.dx > deadzone) game.keys.add('d');
      }

      updatePlayer(game.player, game.keys, game.world);
      for (const mob of game.mobs) updateMobAI(mob, game.player, game.world, game.mobs, game.particles);
      game.mobs = game.mobs.filter(m => !m.removed);

      // Spawn mobs
      game.spawnTimer++;
      if (game.spawnTimer > 300 && game.mobs.length < 30) {
        game.spawnTimer = 0;
        const angle = Math.random() * Math.PI * 2;
        const dist = 15 + Math.random() * 10;
        const mx = game.player.x + Math.cos(angle) * dist;
        const my = game.player.y + Math.sin(angle) * dist;
        const tx = Math.floor(mx);
        const ty = Math.floor(my);
        const tile = getTile(game.world, tx, ty);
        if ([TileType.GRASS, TileType.SAND, TileType.DIRT].includes(tile)) {
          game.mobs.push(createMob(mx, my, Math.random() < 0.5 ? 'zombie' : 'slime', Math.min(5, game.dayCount)));
        }
      }

      game.dayTime += 0.0005;
      if (game.dayTime >= 1) { game.dayTime = 0; game.dayCount++; }
      updateParticles(game.particles);
      updateCamera(game.camera, game.player, canvas.width, canvas.height);

      // Render
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      renderWorld(ctx, game.world, game.camera, canvas.width, canvas.height);
      for (const mob of game.mobs) renderMob(ctx, mob, game.camera);
      renderPlayer(ctx, game.player, game.camera);
      renderParticles(ctx, game.particles, game.camera);

      if (game.dayTime > 0.5) {
        const nightAlpha = Math.min(0.5, (game.dayTime - 0.5) * 2 * 0.5);
        ctx.fillStyle = `rgba(0,0,30,${nightAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      renderHUD(ctx, game.player, canvas.width, canvas.height);

      // Clear joystick keys each frame (joystick re-adds them next frame if still active)
      if (joy.active) {
        game.keys.delete('w'); game.keys.delete('a'); game.keys.delete('s'); game.keys.delete('d');
      }

      if (game.player.hp <= 0) { setGameState('dead'); return; }
      animRef.current = requestAnimationFrame(gameLoop);
    };

    animRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState]);

  // Touch joystick handler
  const handleJoystickStart = useCallback((e: React.TouchEvent) => {
    if (gameState !== 'playing') return;
    const touch = e.changedTouches[0];
    joystickRef.current = { active: true, startX: touch.clientX, startY: touch.clientY, dx: 0, dy: 0, touchId: touch.identifier };
  }, [gameState]);

  const handleJoystickMove = useCallback((e: React.TouchEvent) => {
    const joy = joystickRef.current;
    if (!joy.active) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joy.touchId) {
        const dx = touch.clientX - joy.startX;
        const dy = touch.clientY - joy.startY;
        const maxDist = 50;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clampedDist = Math.min(dist, maxDist);
        const angle = Math.atan2(dy, dx);
        joy.dx = (Math.cos(angle) * clampedDist) / maxDist;
        joy.dy = (Math.sin(angle) * clampedDist) / maxDist;
        break;
      }
    }
  }, []);

  const handleJoystickEnd = useCallback((e: React.TouchEvent) => {
    const joy = joystickRef.current;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joy.touchId) {
        joy.active = false;
        joy.dx = 0;
        joy.dy = 0;
        joy.touchId = -1;
        gameRef.current?.keys.delete('w');
        gameRef.current?.keys.delete('a');
        gameRef.current?.keys.delete('s');
        gameRef.current?.keys.delete('d');
        break;
      }
    }
  }, []);

  // Mobile action buttons
  const handleMobileAttack = useCallback(() => {
    const game = gameRef.current;
    if (game && gameState === 'playing') {
      attack(game.player, game.world, game.mobs, game.particles);
    }
  }, [gameState]);

  const handleMobileInventory = useCallback(() => {
    if (gameState === 'playing') setGameState('inventory');
    else if (gameState === 'inventory') setGameState('playing');
  }, [gameState]);

  const handleMobileCraft = useCallback(() => {
    if (gameState === 'playing') setGameState('crafting');
    else if (gameState === 'crafting') setGameState('playing');
  }, [gameState]);

  const handleMobileCraftItem = useCallback((idx: number) => {
    const game = gameRef.current;
    if (game && RECIPES[idx] && craft(RECIPES[idx], game.player)) {
      spawnParticles(game.particles, game.player.x, game.player.y, '#FFD700', 5);
    }
  }, []);

  const handleMobileToolSelect = useCallback((idx: number) => {
    const game = gameRef.current;
    if (game && gameState === 'playing') selectItem(game.player, idx);
  }, [gameState]);

  // Intro screen
  if (gameState === 'intro') {
    return <IntroScreen onStart={initGame} />;
  }

  // Death screen
  if (gameState === 'dead') {
    const game = gameRef.current;
    return (
      <div className="death-screen" onClick={() => setGameState('intro')} onTouchEnd={() => setGameState('intro')}>
        <div className="death-content">
          <h1 className="death-title">GAME OVER</h1>
          <p className="death-score">Score: {game?.player.score ?? 0}</p>
          <p className="death-level">Level: {game?.player.level ?? 1}</p>
          <p className="death-days">Days Survived: {game?.dayCount ?? 1}</p>
          <p className="death-prompt blink">Tap or press ENTER to continue</p>
        </div>
      </div>
    );
  }

  // Crafting overlay
  if (gameState === 'crafting') {
    const game = gameRef.current!;
    return (
      <>
        <canvas ref={canvasRef} className="game-canvas" />
        <div className="overlay">
          <div className="craft-panel">
            <h2>CRAFTING</h2>
            <div className="recipes">
              {RECIPES.map((r, i) => {
                const able = canCraft(r, game.player);
                const ingredientText = Array.from(r.ingredients.entries())
                  .map(([t, c]) => {
                    const names: Record<number, string> = { 0: 'Wood', 1: 'Stone', 2: 'DirT', 3: 'Sand', 4: 'Seeds', 5: 'Wheat' };
                    return `${c} ${names[t] ?? '?'}`;
                  }).join(' + ');
                return (
                  <div
                    key={i}
                    className={`recipe ${able ? 'can-craft' : 'cant-craft'}`}
                    onClick={() => able && handleMobileCraftItem(i)}
                    onTouchEnd={(e) => { e.preventDefault(); able && handleMobileCraftItem(i); }}
                  >
                    <span className="recipe-key">[{i + 1}]</span>
                    <span className="recipe-name">{r.name}</span>
                    <span className="recipe-ingredients">{ingredientText}</span>
                    <span className="recipe-arrow">=&gt; {r.resultCount}x</span>
                  </div>
                );
              })}
            </div>
            <button className="mobile-btn close-btn" onClick={handleMobileCraft} onTouchEnd={(e) => { e.preventDefault(); handleMobileCraft(); }}>
              CLOSE [Q/ESC]
            </button>
          </div>
        </div>
      </>
    );
  }

  // Inventory overlay
  if (gameState === 'inventory') {
    const game = gameRef.current!;
    const items = getInventoryItems(game.player);
    return (
      <>
        <canvas ref={canvasRef} className="game-canvas" />
        <div className="overlay">
          <div className="inventory-panel">
            <h2>INVENTORY</h2>
            <div className="inventory-grid">
              {items.length === 0 && <p className="empty">Empty</p>}
              {items.map((item, i) => (
                <div key={i} className="inventory-item">
                  <span className="item-name">{item.name}</span>
                  <span className="item-count">x{item.count}</span>
                </div>
              ))}
            </div>
            <div className="toolbar">
              <h3>TOOLBAR (tap to equip)</h3>
              <div className="toolbar-items">
                {['Sword', 'Axe', 'Pickaxe', 'Shovel', 'Hoe', 'Seeds'].map((t, i) => (
                  <div
                    key={i}
                    className={`tool-slot ${game.player.activeItem === (i + 6) ? 'active' : ''}`}
                    onClick={() => handleMobileToolSelect(i)}
                    onTouchEnd={(e) => { e.preventDefault(); handleMobileToolSelect(i); }}
                  >
                    [{i + 1}] {t}
                  </div>
                ))}
              </div>
            </div>
            <button className="mobile-btn close-btn" onClick={handleMobileInventory} onTouchEnd={(e) => { e.preventDefault(); handleMobileInventory(); }}>
              CLOSE [E/ESC]
            </button>
          </div>
        </div>
      </>
    );
  }

  // Playing state — canvas + mobile controls
  return (
    <div
      className="game-wrapper"
      onTouchStart={handleJoystickStart}
      onTouchMove={handleJoystickMove}
      onTouchEnd={handleJoystickEnd}
      onTouchCancel={handleJoystickEnd}
    >
      <canvas ref={canvasRef} className="game-canvas" />

      {/* Mobile virtual joystick zone (bottom-left) */}
      <div className="joystick-zone" />
      <div className={`joystick-base ${joystickRef.current.active ? 'active' : ''}`}>
        <div
          className="joystick-thumb"
          style={joystickRef.current.active ? {
            transform: `translate(${joystickRef.current.dx * 30}px, ${joystickRef.current.dy * 30}px)`,
          } : undefined}
        />
      </div>

      {/* Mobile action buttons (bottom-right) */}
      <div className="mobile-controls">
        <button className="action-btn attack-btn" onClick={handleMobileAttack} onTouchEnd={(e) => { e.preventDefault(); handleMobileAttack(); }}>
          ATK
        </button>
        <div className="action-row">
          <button className="action-btn inv-btn" onClick={handleMobileInventory} onTouchEnd={(e) => { e.preventDefault(); handleMobileInventory(); }}>
            INV
          </button>
          <button className="action-btn craft-btn" onClick={handleMobileCraft} onTouchEnd={(e) => { e.preventDefault(); handleMobileCraft(); }}>
            CFT
          </button>
        </div>
      </div>

      {/* Mobile toolbar (top) */}
      <div className="mobile-toolbar">
        {['Swd', 'Axe', 'Pik', 'Shv', 'Hoe', 'Sed'].map((t, i) => (
          <button
            key={i}
            className={`toolbar-btn ${gameRef.current?.player.activeItem === (i + 6) ? 'active' : ''}`}
            onClick={() => handleMobileToolSelect(i)}
            onTouchEnd={(e) => { e.preventDefault(); handleMobileToolSelect(i); }}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

function IntroScreen({ onStart }: { onStart: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'cinematic' | 'menu'>('cinematic');
  const [blink, setBlink] = useState(true);
  const startedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => setBlink(b => !b), 500);
    return () => clearInterval(interval);
  }, []);

  // Cinematic animation
  useEffect(() => {
    if (phase !== 'cinematic') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const W = canvas.width;
    const H = canvas.height;
    const CX = W / 2;
    const CY = H / 2;

    // Particles
    const particles: { x: number; y: number; tx: number; ty: number; vx: number; vy: number; size: number; color: string; alpha: number; delay: number }[] = [];
    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 100 + Math.random() * Math.max(W, H);
      const tx = CX + (Math.random() - 0.5) * 300;
      const ty = CY + (Math.random() - 0.5) * 80;
      particles.push({
        x: CX + Math.cos(angle) * dist,
        y: CY + Math.sin(angle) * dist,
        tx, ty,
        vx: 0, vy: 0,
        size: 1 + Math.random() * 3,
        color: ['#3B8C2A', '#FFD700', '#44DD44', '#FF6644', '#4488FF', '#FF44AA'][Math.random() * 6 | 0],
        alpha: 0,
        delay: Math.random() * 60,
      });
    }

    // Floating tiles
    const tiles: { x: number; y: number; tx: number; ty: number; size: number; color: string; alpha: number; delay: number; rotation: number; tRot: number }[] = [];
    const tileColors = ['#3B8C2A', '#2060C0', '#C8B86A', '#1A5C10', '#808080', '#6B4226'];
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 200 + Math.random() * Math.max(W, H) * 0.8;
      tiles.push({
        x: CX + Math.cos(angle) * dist,
        y: CY + Math.sin(angle) * dist,
        tx: CX - 200 + (i % 10) * 44 + (Math.random() - 0.5) * 20,
        ty: CY - 60 + Math.floor(i / 10) * 44 + (Math.random() - 0.5) * 20,
        size: 32 + Math.random() * 16,
        color: tileColors[Math.random() * tileColors.length | 0],
        alpha: 0,
        delay: 20 + Math.random() * 40,
        rotation: Math.random() * Math.PI * 2,
        tRot: 0,
      });
    }

    // Character walking
    const char = { x: -60, y: CY + 60, walkFrame: 0, visible: false, alpha: 0 };
    // Slime enemy
    const slime = { x: W + 60, y: CY + 60, bounce: 0, visible: false, alpha: 0 };
    // Sword slash
    const slash = { progress: 0, visible: false, alpha: 0 };

    // Title letters
    const titleText = 'CRAFTLET';
    const titleLetters: { x: number; y: number; targetY: number; alpha: number; delay: number; scale: number }[] = [];
    const letterWidth = Math.min(W * 0.08, 60);
    const totalW = titleText.length * letterWidth;
    const startX = CX - totalW / 2 + letterWidth / 2;
    for (let i = 0; i < titleText.length; i++) {
      titleLetters.push({
        x: startX + i * letterWidth,
        y: -80,
        targetY: CY - 140,
        alpha: 0,
        delay: 80 + i * 6,
        scale: 2,
      });
    }

    // Subtitle
    const subtitle = { alpha: 0, y: CY - 80 };
    // Craft items flying
    const items: { x: number; y: number; tx: number; ty: number; alpha: number; delay: number; size: number; color: string; icon: string }[] = [];
    const itemDefs = [
      { icon: 'sword', colo
