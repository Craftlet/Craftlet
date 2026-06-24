import { TileType } from './types';

// Simple seeded random
class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return this.seed / 2147483647;
  }
}

// Simple Perlin-like noise
function generateNoise(width: number, height: number, seed: number, scale: number): number[][] {
  const rng = new SeededRandom(seed);
  const noise: number[][] = [];

  // Generate grid points
  const gridW = Math.ceil(width / scale) + 2;
  const gridH = Math.ceil(height / scale) + 2;
  const grid: number[][] = [];
  for (let y = 0; y < gridH; y++) {
    grid[y] = [];
    for (let x = 0; x < gridW; x++) {
      grid[y][x] = rng.next();
    }
  }

  // Interpolate
  for (let y = 0; y < height; y++) {
    noise[y] = [];
    for (let x = 0; x < width; x++) {
      const gx = x / scale;
      const gy = y / scale;
      const ix = Math.floor(gx);
      const iy = Math.floor(gy);
      const fx = gx - ix;
      const fy = gy - iy;

      const sfx = fx * fx * (3 - 2 * fx);
      const sfy = fy * fy * (3 - 2 * fy);

      const v00 = grid[iy]?.[ix] ?? 0;
      const v10 = grid[iy]?.[ix + 1] ?? 0;
      const v01 = grid[iy + 1]?.[ix] ?? 0;
      const v11 = grid[iy + 1]?.[ix + 1] ?? 0;

      const top = v00 + sfx * (v10 - v00);
      const bot = v01 + sfx * (v11 - v01);
      noise[y][x] = top + sfy * (bot - top);
    }
  }
  return noise;
}

export interface World {
  width: number;
  height: number;
  tiles: Uint8Array;
  data: Uint8Array;
  seed: number;
}

export function getTile(world: World, x: number, y: number): TileType {
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return TileType.WATER;
  return world.tiles[y * world.width + x];
}

export function setTile(world: World, x: number, y: number, tile: TileType) {
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return;
  world.tiles[y * world.width + x] = tile;
}

export function getData(world: World, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return 0;
  return world.data[y * world.width + x];
}

export function setData(world: World, x: number, y: number, val: number) {
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return;
  world.data[y * world.width + x] = val;
}

export function generateWorld(width: number, height: number, seed: number): World {
  const tiles = new Uint8Array(width * height);
  const data = new Uint8Array(width * height);

  const elevationNoise = generateNoise(width, height, seed, 8);
  const moistureNoise = generateNoise(width, height, seed + 1, 12);
  const detailNoise = generateNoise(width, height, seed + 2, 4);

  const rng = new SeededRandom(seed + 100);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const elev = elevationNoise[y][x];
      const moisture = moistureNoise[y][x];
      const detail = detailNoise[y][x];

      // Distance from center for island shape
      const cx = (x / width - 0.5) * 2;
      const cy = (y / height - 0.5) * 2;
      const distFromCenter = Math.sqrt(cx * cx + cy * cy);
      const islandFactor = Math.max(0, 1 - distFromCenter * 1.1);

      const e = elev * islandFactor + detail * 0.15;
      const m = moisture;

      let tile: TileType;

      if (e < 0.2) {
        tile = TileType.WATER;
      } else if (e < 0.28) {
        tile = TileType.SAND;
      } else if (e > 0.7 && m < 0.4) {
        tile = TileType.ROCK;
      } else {
        tile = TileType.GRASS;
        // Trees on grass with some probability
        if (e > 0.35 && m > 0.5 && detail > 0.55) {
          tile = TileType.TREE;
        }
        // Flowers
        if (tile === TileType.GRASS && m > 0.65 && detail > 0.7 && rng.next() > 0.6) {
          tile = TileType.FLOWER;
        }
      }

      tiles[y * width + x] = tile;
      data[y * width + x] = 0;
    }
  }

  // Ensure spawn area is clear (center of map)
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const t = getTile({ width, height, tiles, data, seed }, cx + dx, cy + dy);
      if (t === TileType.WATER || t === TileType.TREE || t === TileType.ROCK) {
        setTile({ width, height, tiles, data, seed }, cx + dx, cy + dy, TileType.GRASS);
      }
    }
  }

  return { width, height, tiles, data, seed };
}

export function isSolid(tile: TileType): boolean {
  return tile === TileType.WATER || tile === TileType.TREE || tile === TileType.ROCK;
}

export function mayPass(tile: TileType): boolean {
  return !isSolid(tile);
  }
  
