import { TILE_SIZE, SCALE, SCALED_TILE, TileType, TILE_COLORS, Mob, Particle, Player, ItemType } from './types';
import { World, getTile } from './world';

export interface Camera {
  x: number;
  y: number;
}

const tempCanvas = document.createElement('canvas');
tempCanvas.width = TILE_SIZE;
tempCanvas.height = TILE_SIZE;
const tempCtx = tempCanvas.getContext('2d')!;

export function renderWorld(
  ctx: CanvasRenderingContext2D,
  world: World,
  camera: Camera,
  screenW: number,
  screenH: number
) {
  const startTileX = Math.floor(camera.x / SCALED_TILE) - 1;
  const startTileY = Math.floor(camera.y / SCALED_TILE) - 1;
  const endTileX = startTileX + Math.ceil(screenW / SCALED_TILE) + 3;
  const endTileY = startTileY + Math.ceil(screenH / SCALED_TILE) + 3;

  for (let ty = startTileY; ty < endTileY; ty++) {
    for (let tx = startTileX; tx < endTileX; tx++) {
      const tile = getTile(world, tx, ty);
      const colors = TILE_COLORS[tile];
      const colorIdx = ((tx * 7 + ty * 13) & 3);
      const baseColor = colors[colorIdx];

      const sx = tx * SCALED_TILE - camera.x;
      const sy = ty * SCALED_TILE - camera.y;

      ctx.fillStyle = baseColor;
      ctx.fillRect(sx, sy, SCALED_TILE, SCALED_TILE);

      // Draw tile details
      if (tile === TileType.GRASS) {
        // Small grass tufts
        const detRng = (tx * 31 + ty * 17) % 7;
        if (detRng < 3) {
          ctx.fillStyle = '#4CAF50';
          const gx = sx + ((detRng * 11) % (SCALED_TILE - 6));
          const gy = sy + ((detRng * 7) % (SCALED_TILE - 6));
          ctx.fillRect(gx, gy, SCALE * 2, SCALE * 2);
        }
      } else if (tile === TileType.TREE) {
        // Draw tree trunk
        ctx.fillStyle = '#5C3A1E';
        ctx.fillRect(sx + SCALED_TILE / 2 - SCALE * 2, sy + SCALED_TILE - SCALE * 6, SCALE * 4, SCALE * 6);
        // Draw tree leaves (round top)
        ctx.fillStyle = '#1B6B10';
        ctx.fillRect(sx + SCALE * 2, sy, SCALED_TILE - SCALE * 4, SCALED_TILE - SCALE * 4);
        ctx.fillStyle = '#228B22';
        ctx.fillRect(sx + SCALE * 4, sy + SCALE * 2, SCALED_TILE - SCALE * 8, SCALED_TILE - SCALE * 6);
      } else if (tile === TileType.ROCK) {
        ctx.fillStyle = '#A0A0A0';
        ctx.fillRect(sx + SCALE * 2, sy + SCALE * 2, SCALED_TILE - SCALE * 4, SCALED_TILE - SCALE * 4);
        ctx.fillStyle = '#888';
        ctx.fillRect(sx + SCALE * 4, sy + SCALE * 4, SCALE * 4, SCALE * 2);
      } else if (tile === TileType.FLOWER) {
        // Grass base + flower
        const flowerColor = ['#FF4444', '#FFFF44', '#FF88FF', '#44AAFF'][(tx + ty) & 3];
        ctx.fillStyle = flowerColor;
        ctx.fillRect(sx + SCALED_TILE / 2 - SCALE, sy + SCALED_TILE / 2 - SCALE * 2, SCALE * 3, SCALE * 3);
        ctx.fillStyle = '#228B22';
        ctx.fillRect(sx + SCALED_TILE / 2, sy + SCALED_TILE / 2 + SCALE, SCALE, SCALE * 3);
      } else if (tile === TileType.FARMLAND) {
        ctx.fillStyle = '#4A2A0A';
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(sx + SCALE, sy + SCALE * (2 + i * 3), SCALED_TILE - SCALE * 2, SCALE);
        }
      } else if (tile === TileType.WHEAT) {
        ctx.fillStyle = '#B8860B';
        for (let i = 0; i < 5; i++) {
          const wx = sx + SCALE + ((i * 7) % (SCALED_TILE - SCALE * 4));
          ctx.fillRect(wx, sy + SCALE * 2, SCALE, SCALED_TILE - SCALE * 4);
        }
        ctx.fillStyle = '#DAA520';
        for (let i = 0; i < 5; i++) {
          const wx = sx + SCALE + ((i * 7) % (SCALED_TILE - SCALE * 4));
          ctx.fillRect(wx - SCALE, sy + SCALE, SCALE * 3, SCALE * 2);
        }
      } else if (tile === TileType.WATER) {
        // Water animation
        const wave = ((Date.now() / 400 + tx + ty) | 0) % 4;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        if (wave < 2) {
          ctx.fillRect(sx + wave * SCALE * 4, sy + SCALE * 4, SCALE * 4, SCALE);
        } else {
          ctx.fillRect(sx + (wave - 2) * SCALE * 4 + SCALE * 2, sy + SCALE * 8, SCALE * 4, SCALE);
        }
      }
    }
  }
}

export function renderPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  camera: Camera
) {
  const sx = player.x * SCALED_TILE - camera.x;
  const sy = player.y * SCALED_TILE - camera.y;
  const hurt = player.hurtTimer > 0;
  const attacking = player.attackTime > 0;

  // Walking animation
  const walkFrame = (player.walkDist / 4 | 0) & 3;
  const legOffset = walkFrame < 2 ? -SCALE : SCALE;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(sx - SCALE, sy + SCALED_TILE - SCALE * 2, SCALED_TILE + SCALE * 2, SCALE * 3);

  const skinColor = hurt ? '#FF6666' : '#FFD5A0';
  const shirtColor = hurt ? '#CC3333' : '#3366CC';
  const pantsColor = hurt ? '#993333' : '#334488';
  const hairColor = '#5C3317';

  // Body (facing direction)
  if (player.dir === 0) { // up
    // Hair
    ctx.fillStyle = hairColor;
    ctx.fillRect(sx + SCALE * 2, sy, SCALED_TILE - SCALE * 4, SCALE * 4);
    // Head
    ctx.fillStyle = skinColor;
    ctx.fillRect(sx + SCALE * 3, sy + SCALE * 2, SCALED_TILE - SCALE * 6, SCALE * 6);
    // Eyes (back of head - none)
    // Body
    ctx.fillStyle = shirtColor;
    ctx.fillRect(sx + SCALE * 2, sy + SCALE * 8, SCALED_TILE - SCALE * 4, SCALE * 6);
    // Legs
    ctx.fillStyle = pantsColor;
    ctx.fillRect(sx + SCALE * 3 + legOffset, sy + SCALE * 14, SCALE * 3, SCALE * 4);
    ctx.fillRect(sx + SCALE * 8 - legOffset, sy + SCALE * 14, SCALE * 3, SCALE * 4);
  } else if (player.dir === 2) { // down
    // Head
    ctx.fillStyle = skinColor;
    ctx.fillRect(sx + SCALE * 3, sy, SCALED_TILE - SCALE * 6, SCALE * 8);
    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(sx + SCALE * 4, sy + SCALE * 4, SCALE * 2, SCALE * 2);
    ctx.fillRect(sx + SCALE * 9, sy + SCALE * 4, SCALE * 2, SCALE * 2);
    // Body
    ctx.fillStyle = shirtColor;
    ctx.fillRect(sx + SCALE * 2, sy + SCALE * 8, SCALED_TILE - SCALE * 4, SCALE * 6);
    // Legs
    ctx.fillStyle = pantsColor;
    ctx.fillRect(sx + SCALE * 3 + legOffset, sy + SCALE * 14, SCALE * 3, SCALE * 4);
    ctx.fillRect(sx + SCALE * 8 - legOffset, sy + SCALE * 14, SCALE * 3, SCALE * 4);
  } else if (player.dir === 1) { // right
    // Head
    ctx.fillStyle = skinColor;
    ctx.fillRect(sx + SCALE * 4, sy, SCALED_TILE - SCALE * 6, SCALE * 8);
    // Eye
    ctx.fillStyle = '#000';
    ctx.fillRect(sx + SCALE * 8, sy + SCALE * 4, SCALE * 2, SCALE * 2);
    // Body
    ctx.fillStyle = shirtColor;
    ctx.fillRect(sx + SCALE * 3, sy + SCALE * 8, SCALED_TILE - SCALE * 4, SCALE * 6);
    // Legs
    ctx.fillStyle = pantsColor;
    ctx.fillRect(sx + SCALE * 4 + legOffset, sy + SCALE * 14, SCALE * 3, SCALE * 4);
    ctx.fillRect(sx + SCALE * 9 - legOffset, sy + SCALE * 14, SCALE * 3, SCALE * 4);
  } else { // left
    // Head
    ctx.fillStyle = skinColor;
    ctx.fillRect(sx + SCALE * 2, sy, SCALED_TILE - SCALE * 6, SCALE * 8);
    // Eye
    ctx.fillStyle = '#000';
    ctx.fillRect(sx + SCALE * 5, sy + SCALE * 4, SCALE * 2, SCALE * 2);
    // Body
    ctx.fillStyle = shirtColor;
    ctx.fillRect(sx + SCALE * 2, sy + SCALE * 8, SCALED_TILE - SCALE * 4, SCALE * 6);
    // Legs
    ctx.fillStyle = pantsColor;
    ctx.fillRect(sx + SCALE * 2 + legOffset, sy + SCALE * 14, SCALE * 3, SCALE * 4);
    ctx.fillRect(sx + SCALE * 7 - legOffset, sy + SCALE * 14, SCALE * 3, SCALE * 4);
  }

  // Attack animation - swing item
  if (attacking) {
    const attackProgress = player.attackTime / 10;
    const swingAngle = attackProgress * Math.PI;
    const armLen = SCALE * 6;
    let ax = sx + SCALED_TILE / 2;
    let ay = sy + SCALE * 10;

    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const [dx, dy] = dirs[player.attackDir];
    ax += dx * armLen * Math.cos(swingAngle) + dy * armLen * Math.sin(swingAngle) * 0.5;
    ay += dy * armLen * Math.cos(swingAngle) + dx * armLen * Math.sin(swingAngle) * 0.5;

    // Draw tool
    const toolColor = player.activeItem === ItemType.SWORD ? '#C0C0C0' :
                      player.activeItem === ItemType.AXE ? '#8B5E3C' : '#808080';
    ctx.fillStyle = toolColor;
    ctx.fillRect(ax - SCALE, ay - SCALE * 3, SCALE * 3, SCALE * 7);
  }
}

export function renderMob(
  ctx: CanvasRenderingContext2D,
  mob: Mob,
  camera: Camera
) {
  const sx = mob.x * SCALED_TILE - camera.x;
  const sy = mob.y * SCALED_TILE - camera.y;
  const hurt = mob.hurtTimer > 0;
  const walkFrame = (mob.walkDist / 6 | 0) & 1;

  if (mob.type === 'zombie') {
    const baseColor = hurt ? '#FF6666' : '#44AA44';
    const darkColor = hurt ? '#CC3333' : '#338833';
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(sx - SCALE, sy + SCALED_TILE - SCALE * 2, SCALED_TILE + SCALE * 2, SCALE * 3);
    // Head
    ctx.fillStyle = baseColor;
    ctx.fillRect(sx + SCALE * 3, sy + walkFrame * SCALE, SCALED_TILE - SCALE * 6, SCALE * 8);
    // Eyes
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(sx + SCALE * 4, sy + SCALE * 3 + walkFrame * SCALE, SCALE * 2, SCALE * 2);
    ctx.fillRect(sx + SCALE * 9, sy + SCALE * 3 + walkFrame * SCALE, SCALE * 2, SCALE * 2);
    // Body
    ctx.fillStyle = darkColor;
    ctx.fillRect(sx + SCALE * 2, sy + SCALE * 9, SCALED_TILE - SCALE * 4, SCALE * 6);
    // Arms (reaching forward)
    ctx.fillStyle = baseColor;
    const armOff = walkFrame ? SCALE * 2 : 0;
    ctx.fillRect(sx - SCALE, sy + SCALE * 9 + armOff, SCALE * 3, SCALE * 5);
    ctx.fillRect(sx + SCALED_TILE - SCALE * 2, sy + SCALE * 9 - armOff, SCALE * 3, SCALE * 5);
    // Legs
    ctx.fillStyle = darkColor;
    ctx.fillRect(sx + SCALE * 3 + (walkFrame ? SCALE * 2 : 0), sy + SCALE * 15, SCALE * 3, SCALE * 3);
    ctx.fillRect(sx + SCALE * 8 - (walkFrame ? SCALE * 2 : 0), sy + SCALE * 15, SCALE * 3, SCALE * 3);
  } else if (mob.type === 'slime') {
    const baseColor = hurt ? '#FF8888' : '#44DD44';
    const bounce = walkFrame ? -SCALE * 2 : 0;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(sx, sy + SCALED_TILE - SCALE, SCALED_TILE, SCALE * 2);
    // Body
    ctx.fillStyle = baseColor;
    ctx.fillRect(sx + SCALE * 2, sy + SCALE * 2 + bounce, SCALED_TILE - SCALE * 4, SCALED_TILE - SCALE * 4 + (walkFrame ? SCALE * 2 : 0));
    ctx.fillStyle = '#55EE55';
    ctx.fillRect(sx + SCALE * 3, sy + SCALE * 3 + bounce, SCALED_TILE - SCALE * 6, SCALED_TILE - SCALE * 8 + (walkFrame ? SCALE * 2 : 0));
    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(sx + SCALE * 5, sy + SCALE * 6 + bounce, SCALE * 2, SCALE * 2);
    ctx.fillRect(sx + SCALE * 10, sy + SCALE * 6 + bounce, SCALE * 2, SCALE * 2);
  } else if (mob.type === 'airwizard') {
    const baseColor = hurt ? '#FF88FF' : '#CC44FF';
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(sx - SCALE, sy + SCALED_TILE - SCALE * 2, SCALED_TILE + SCALE * 2, SCALE * 3);
    // Robe
    ctx.fillStyle = baseColor;
    ctx.fillRect(sx + SCALE * 2, sy + SCALE * 4, SCALED_TILE - SCALE * 4, SCALED_TILE - SCALE * 6);
    // Head
    ctx.fillStyle = '#FFD5A0';
    ctx.fillRect(sx + SCALE * 4, sy, SCALED_TILE - SCALE * 8, SCALE * 6);
    // Eyes
    ctx.fillStyle = '#FF00FF';
    ctx.fillRect(sx + SCALE * 5, sy + SCALE * 2, SCALE * 2, SCALE * 2);
    ctx.fillRect(sx + SCALE * 9, sy + SCALE * 2, SCALE * 2, SCALE * 2);
    // Hat
    ctx.fillStyle = '#8800AA';
    ctx.fillRect(sx + SCALE * 3, sy - SCALE * 3, SCALED_TILE - SCALE * 6, SCALE * 4);
    ctx.fillRect(sx + SCALE * 5, sy - SCALE * 5, SCALE * 6, SCALE * 3);
    // Floating effect
    const floatY = Math.sin(Date.now() / 200) * SCALE * 2;
    ctx.fillStyle = 'rgba(200,100,255,0.3)';
    ctx.fillRect(sx + SCALE, sy + SCALED_TILE - SCALE * 2 + floatY, SCALED_TILE - SCALE * 2, SCALE * 3);
  }

  // HP bar for mobs
  if (mob.hp < mob.maxHp) {
    const barW = SCALED_TILE;
    const barH = SCALE * 2;
    const barX = sx;
    const barY = sy - SCALE * 4;
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#FF3333';
    ctx.fillRect(barX, barY, barW * (mob.hp / mob.maxHp), barH);
  }
}

export function renderParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  camera: Camera
) {
  for (const p of particles) {
    const sx = p.x * SCALED_TILE - camera.x;
    const sy = p.y * SCALED_TILE - camera.y;
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(sx, sy, p.size * SCALE, p.size * SCALE);
  }
  ctx.globalAlpha = 1;
}

export function renderHUD(
  ctx: CanvasRenderingContext2D,
  player: Player,
  screenW: number,
  screenH: number
) {
  const padding = SCALE * 4;

  // HP bar
  const hpBarW = SCALE * 60;
  const hpBarH = SCALE * 8;
  const hpX = padding;
  const hpY = padding;

  ctx.fillStyle = '#222';
  ctx.fillRect(hpX, hpY, hpBarW, hpBarH);
  ctx.fillStyle = '#FF3333';
  ctx.fillRect(hpX, hpY, hpBarW * (player.hp / player.maxHp), hpBarH);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = SCALE;
  ctx.strokeRect(hpX, hpY, hpBarW, hpBarH);

  // Stamina bar
  const stamY = hpY + hpBarH + SCALE * 3;
  ctx.fillStyle = '#222';
  ctx.fillRect(hpX, stamY, hpBarW, hpBarH);
  ctx.fillStyle = '#FFCC00';
  ctx.fillRect(hpX, stamY, hpBarW * (player.stamina / player.maxStamina), hpBarH);
  ctx.strokeRect(hpX, stamY, hpBarW, hpBarH);

  // XP bar
  const xpY = stamY + hpBarH + SCALE * 3;
  const xpForLevel = player.level * 50;
  ctx.fillStyle = '#222';
  ctx.fillRect(hpX, xpY, hpBarW, hpBarH / 2);
  ctx.fillStyle = '#4488FF';
  ctx.fillRect(hpX, xpY, hpBarW * Math.min(1, player.xp / xpForLevel), hpBarH / 2);

  // Score & Level
  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${SCALE * 6}px monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(`Lv${player.level}`, hpX + hpBarW + SCALE * 6, hpY + hpBarH);
  ctx.fillText(`Score: ${player.score}`, hpX + hpBarW + SCALE * 6, stamY + hpBarH);

  // Active item
  if (player.activeItem !== null) {
    const names: Record<number, string> = {
      0: 'Wood', 1: 'Stone', 2: 'DirT', 3: 'Sand', 4: 'Seeds',
      5: 'Wheat', 6: 'Sword', 7: 'Axe', 8: 'Pickaxe', 9: 'Shovel', 10: 'Hoe'
    };
    ctx.fillStyle = '#FFF';
    ctx.textAlign = 'center';
    ctx.fillText(names[player.activeItem] ?? '', screenW / 2, screenH - padding);
  }

  // Controls hint
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = `${SCALE * 4}px monospace`;
  ctx.textAlign = 'right';
  ctx.fillText('WASD:Move  SPACE:Attack  E:Inventory  1-9:Select  Q:Craft', screenW - padding, screenH - padding);
}

export function updateCamera(camera: Camera, player: Player, screenW: number, screenH: number) {
  const targetX = player.x * SCALED_TILE - screenW / 2 + SCALED_TILE / 2;
  const targetY = player.y * SCALED_TILE - screenH / 2 + SCALED_TILE / 2;
  camera.x += (targetX - camera.x) * 0.15;
  camera.y += (targetY - camera.y) * 0.15;
  }
  
