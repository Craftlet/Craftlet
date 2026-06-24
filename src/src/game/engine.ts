import { TileType, ItemType, Player, Mob, Particle, SCALED_TILE, TILE_SIZE, SCALE } from './types';
import { World, getTile, setTile, mayPass, setData, getData } from './world';

export function createPlayer(x: number, y: number): Player {
  const inventory = new Map<ItemType, number>();
  inventory.set(ItemType.WOOD, 0);
  inventory.set(ItemType.STONE, 0);
  inventory.set(ItemType.DIRT, 0);
  inventory.set(ItemType.SAND, 0);
  inventory.set(ItemType.SEEDS, 0);
  inventory.set(ItemType.WHEAT, 0);

  return {
    x, y, hp: 10, maxHp: 10, dir: 2, walkDist: 0, hurtTimer: 0, removed: false,
    stamina: 10, maxStamina: 10, staminaRecharge: 0,
    attackTime: 0, attackDir: 2,
    inventory, activeItem: null,
    score: 0, xp: 0, level: 1,
  };
}

export function createMob(x: number, y: number, type: Mob['type'], level: number): Mob {
  const baseHp = type === 'airwizard' ? 100 : type === 'zombie' ? 4 + level * 2 : 2 + level;
  const baseSpeed = type === 'airwizard' ? 0.015 : type === 'zombie' ? 0.01 : 0.008;
  return {
    x, y, hp: baseHp, maxHp: baseHp, dir: 2, walkDist: 0, hurtTimer: 0, removed: false,
    speed: baseSpeed, attackTimer: 0, type, knockback: 0, level,
  };
}

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

export function moveEntity(e: { x: number; y: number; dir: number; walkDist: number }, dx: number, dy: number, world: World): boolean {
  if (dx !== 0 || dy !== 0) {
    e.walkDist++;
    if (Math.abs(dx) > Math.abs(dy)) {
      e.dir = dx > 0 ? 1 : 3;
    } else {
      e.dir = dy > 0 ? 2 : 0;
    }
  }

  const nx = e.x + dx;
  const ny = e.y + dy;

  // Check tile at feet
  const tx = Math.floor(nx + 0.5);
  const ty = Math.floor(ny + 0.5);
  const tile = getTile(world, tx, ty);

  if (mayPass(tile)) {
    e.x = nx;
    e.y = ny;
    return true;
  }
  return false;
}

export function attack(player: Player, world: World, mobs: Mob[], particles: Particle[]) {
  if (player.attackTime > 0 || player.stamina < 1) return;

  player.attackTime = 10;
  player.attackDir = player.dir;
  player.stamina -= 1;
  player.staminaRecharge = 40;

  const ax = player.x + DX[player.dir] * 1.2;
  const ay = player.y + DY[player.dir] * 1.2;

  // Check tile interaction
  const tx = Math.floor(ax + 0.5);
  const ty = Math.floor(ay + 0.5);
  const tile = getTile(world, tx, ty);

  let damage = 1;
  if (player.activeItem === ItemType.SWORD) damage = 3 + player.level;
  else if (player.activeItem === ItemType.AXE && tile === TileType.TREE) damage = 3;
  else if (player.activeItem === ItemType.PICKAXE && tile === TileType.ROCK) damage = 3;

  // Hit tile
  if (tile === TileType.TREE && (player.activeItem === ItemType.AXE || player.activeItem === null)) {
    const dmg = getData(world, tx, ty) + damage;
    if (dmg >= 5) {
      setTile(world, tx, ty, TileType.GRASS);
      setData(world, tx, ty, 0);
      player.inventory.set(ItemType.WOOD, (player.inventory.get(ItemType.WOOD) || 0) + 1);
      spawnParticles(particles, ax, ay, '#8B5E3C', 5);
      player.score += 1;
    } else {
      setData(world, tx, ty, dmg);
      spawnParticles(particles, ax, ay, '#228B22', 2);
    }
  } else if (tile === TileType.ROCK && (player.activeItem === ItemType.PICKAXE || player.activeItem === null)) {
    const dmg = getData(world, tx, ty) + damage;
    if (dmg >= 5) {
      setTile(world, tx, ty, TileType.GRASS);
      setData(world, tx, ty, 0);
      player.inventory.set(ItemType.STONE, (player.inventory.get(ItemType.STONE) || 0) + 1);
      spawnParticles(particles, ax, ay, '#888', 5);
      player.score += 1;
    } else {
      setData(world, tx, ty, dmg);
      spawnParticles(particles, ax, ay, '#AAA', 2);
    }
  } else if (tile === TileType.GRASS && player.activeItem === ItemType.SHOVEL) {
    setTile(world, tx, ty, TileType.DIRT);
    player.inventory.set(ItemType.DIRT, (player.inventory.get(ItemType.DIRT) || 0) + 1);
    spawnParticles(particles, ax, ay, '#6B4226', 3);
  } else if (tile === TileType.DIRT && player.activeItem === ItemType.HOE) {
    setTile(world, tx, ty, TileType.FARMLAND);
    spawnParticles(particles, ax, ay, '#5B3A1A', 3);
  } else if (tile === TileType.FARMLAND && player.activeItem === ItemType.SEEDS) {
    if ((player.inventory.get(ItemType.SEEDS) || 0) > 0) {
      player.inventory.set(ItemType.SEEDS, player.inventory.get(ItemType.SEEDS)! - 1);
      setTile(world, tx, ty, TileType.WHEAT);
      setData(world, tx, ty, 0); // growth stage
      spawnParticles(particles, ax, ay, '#4A7C2E', 3);
    }
  } else if (tile === TileType.WHEAT && getData(world, tx, ty) >= 5) {
    setTile(world, tx, ty, TileType.FARMLAND);
    player.inventory.set(ItemType.WHEAT, (player.inventory.get(ItemType.WHEAT) || 0) + 1);
    player.inventory.set(ItemType.SEEDS, (player.inventory.get(ItemType.SEEDS) || 0) + 2);
    spawnParticles(particles, ax, ay, '#DAA520', 4);
    player.score += 2;
  }

  // Hit mobs
  for (const mob of mobs) {
    if (mob.removed) continue;
    const dist = Math.sqrt((mob.x - ax) ** 2 + (mob.y - ay) ** 2);
    if (dist < 1.2) {
      mob.hp -= damage;
      mob.hurtTimer = 10;
      mob.knockback = 6;
      mob.dir = player.dir;
      spawnParticles(particles, mob.x, mob.y, '#FF4444', 3);

      if (mob.hp <= 0) {
        mob.removed = true;
        const scoreGain = mob.type === 'airwizard' ? 100 : mob.type === 'zombie' ? 10 : 5;
        player.score += scoreGain;
        player.xp += scoreGain;
        spawnParticles(particles, mob.x, mob.y, '#FFFF00', 8);
        checkLevelUp(player, particles);
      }
    }
  }
}

function checkLevelUp(player: Player, particles: Particle[]) {
  const xpNeeded = player.level * 50;
  if (player.xp >= xpNeeded) {
    player.xp -= xpNeeded;
    player.level++;
    player.maxHp += 2;
    player.hp = player.maxHp;
    player.maxStamina += 1;
    player.stamina = player.maxStamina;
    spawnParticles(particles, player.x, player.y, '#FFD700', 12);
  }
}

export function spawnParticles(particles: Particle[], x: number, y: number, color: string, count: number) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() - 0.5) * 0.08 - 0.04,
      life: 20 + Math.random() * 20,
      maxLife: 40,
      color,
      size: 1 + Math.random() * 2,
    });
  }
}

export function updateParticles(particles: Particle[]) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.002;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

export function updateMobAI(mob: Mob, player: Player, world: World, mobs: Mob[], particles: Particle[]) {
  if (mob.removed) return;
  if (mob.hurtTimer > 0) {
    mob.hurtTimer--;
    // Knockback
    if (mob.knockback > 0) {
      const kdx = DX[mob.dir] * 0.15;
      const kdy = DY[mob.dir] * 0.15;
      moveEntity(mob, -kdx, -kdy, world);
      mob.knockback--;
    }
    return;
  }

  // Move toward player if close enough
  const distToPlayer = Math.sqrt((mob.x - player.x) ** 2 + (mob.y - player.y) ** 2);

  if (distToPlayer < 12) {
    const dx = player.x - mob.x;
    const dy = player.y - mob.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ndx = (dx / len) * mob.speed;
    const ndy = (dy / len) * mob.speed;

    // Add some wobble
    const wobble = Math.sin(Date.now() / 500 + mob.x * 10) * 0.005;
    moveEntity(mob, ndx + wobble, ndy, world);
    mob.walkDist++;

    // Attack player
    if (distToPlayer < 0.9 && mob.attackTimer <= 0) {
      if (player.hurtTimer <= 0) {
        const dmg = mob.type === 'airwizard' ? 3 : mob.type === 'zombie' ? 2 : 1;
        player.hp -= dmg;
        player.hurtTimer = 30;
        spawnParticles(particles, player.x, player.y, '#FF0000', 4);
        mob.attackTimer = 30;
      }
    }
  } else {
    // Random wander
    if (Math.random() < 0.02) {
      mob.dir = (Math.random() * 4) | 0;
    }
    moveEntity(mob, DX[mob.dir] * mob.speed * 0.5, DY[mob.dir] * mob.speed * 0.5, world);
  }

  if (mob.attackTimer > 0) mob.attackTimer--;
}

export function updatePlayer(player: Player, keys: Set<string>, world: World) {
  let dx = 0, dy = 0;
  const speed = 0.04;

  if (keys.has('w') || keys.has('arrowup')) dy -= speed;
  if (keys.has('s') || keys.has('arrowdown')) dy += speed;
  if (keys.has('a') || keys.has('arrowleft')) dx -= speed;
  if (keys.has('d') || keys.has('arrowright')) dx += speed;

  if (dx !== 0 || dy !== 0) {
    moveEntity(player, dx, dy, world);
  }

  if (player.attackTime > 0) player.attackTime--;
  if (player.hurtTimer > 0) player.hurtTimer--;

  // Stamina regen
  if (player.staminaRecharge > 0) {
    player.staminaRecharge--;
  } else if (player.stamina < player.maxStamina) {
    player.stamina = Math.min(player.maxStamina, player.stamina + 0.1);
  }

  // Wheat growth tick (roughly every 600 frames ~ 10 seconds)
  if (Math.random() < 0.002) {
    for (let ty = 0; ty < world.height; ty++) {
      for (let tx = 0; tx < world.width; tx++) {
        if (getTile(world, tx, ty) === TileType.WHEAT) {
          const growth = getData(world, tx, ty);
          if (growth < 5) {
            setData(world, tx, ty, growth + 1);
          }
        }
      }
    }
  }
}

export function selectItem(player: Player, slot: number) {
  const tools: (ItemType | null)[] = [
    ItemType.SWORD, ItemType.AXE, ItemType.PICKAXE,
    ItemType.SHOVEL, ItemType.HOE, ItemType.SEEDS,
    null, null, null
  ];
  player.activeItem = tools[slot] ?? null;
}

export function getInventoryItems(player: Player): { type: ItemType; count: number; name: string }[] {
  const names: Record<number, string> = {
    0: 'Wood', 1: 'Stone', 2: 'DirT', 3: 'Sand', 4: 'Seeds',
    5: 'Wheat', 6: 'Sword', 7: 'Axe', 8: 'Pickaxe', 9: 'Shovel', 10: 'Hoe'
  };
  const items: { type: ItemType; count: number; name: string }[] = [];
  for (const [type, count] of player.inventory.entries()) {
    if (count > 0) {
      items.push({ type, count, name: names[type] ?? 'Unknown' });
    }
  }
  return items;
}

export interface CraftingRecipe {
  result: ItemType;
  resultCount: number;
  ingredients: Map<ItemType, number>;
  name: string;
}

export const RECIPES: CraftingRecipe[] = [
  { result: ItemType.SWORD, resultCount: 1, ingredients: new Map([[ItemType.WOOD, 2], [ItemType.STONE, 3]]), name: 'Sword' },
  { result: ItemType.AXE, resultCount: 1, ingredients: new Map([[ItemType.WOOD, 2], [ItemType.STONE, 2]]), name: 'Axe' },
  { result: ItemType.PICKAXE, resultCount: 1, ingredients: new Map([[ItemType.WOOD, 2], [ItemType.STONE, 3]]), name: 'Pickaxe' },
  { result: ItemType.SHOVEL, resultCount: 1, ingredients: new Map([[ItemType.WOOD, 2], [ItemType.STONE, 1]]), name: 'Shovel' },
  { result: ItemType.HOE, resultCount: 1, ingredients: new Map([[ItemType.WOOD, 2], [ItemType.STONE, 1]]), name: 'Hoe' },
  { result: ItemType.SEEDS, resultCount: 3, ingredients: new Map([[ItemType.WHEAT, 1]]), name: 'Seeds' },
];

export function canCraft(recipe: CraftingRecipe, player: Player): boolean {
  for (const [item, count] of recipe.ingredients.entries()) {
    if ((player.inventory.get(item) || 0) < count) return false;
  }
  return true;
}

export function craft(recipe: CraftingRecipe, player: Player): boolean {
  if (!canCraft(recipe, player)) return false;
  for (const [item, count] of recipe.ingredients.entries()) {
    player.inventory.set(item, player.inventory.get(item)! - count);
  }
  player.inventory.set(recipe.result, (player.inventory.get(recipe.result) || 0) + recipe.resultCount);
  return true;
  }
  
