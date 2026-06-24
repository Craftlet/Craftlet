export enum TileType {
  GRASS = 0,
  WATER = 1,
  SAND = 2,
  TREE = 3,
  ROCK = 4,
  FLOWER = 5,
  DIRT = 6,
  FARMLAND = 7,
  WHEAT = 8,
}

export enum ItemType {
  WOOD = 0,
  STONE = 1,
  DIRT = 2,
  SAND = 3,
  SEEDS = 4,
  WHEAT = 5,
  SWORD = 6,
  AXE = 7,
  PICKAXE = 8,
  SHOVEL = 9,
  HOE = 10,
}

export interface Entity {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  dir: number;
  walkDist: number;
  hurtTimer: number;
  removed: boolean;
}

export interface Mob extends Entity {
  speed: number;
  attackTimer: number;
  type: 'zombie' | 'slime' | 'airwizard';
  knockback: number;
  level: number;
}

export interface Player extends Entity {
  stamina: number;
  maxStamina: number;
  staminaRecharge: number;
  attackTime: number;
  attackDir: number;
  inventory: Map<ItemType, number>;
  activeItem: ItemType | null;
  score: number;
  xp: number;
  level: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export const TILE_SIZE = 16;
export const SCALE = 3;
export const SCALED_TILE = TILE_SIZE * SCALE;

export const ITEM_NAMES: Record<ItemType, string> = {
  [ItemType.WOOD]: 'Wood',
  [ItemType.STONE]: 'Stone',
  [ItemType.DIRT]: 'DirT',
  [ItemType.SAND]: 'Sand',
  [ItemType.SEEDS]: 'Seeds',
  [ItemType.WHEAT]: 'Wheat',
  [ItemType.SWORD]: 'Sword',
  [ItemType.AXE]: 'Axe',
  [ItemType.PICKAXE]: 'Pickaxe',
  [ItemType.SHOVEL]: 'Shovel',
  [ItemType.HOE]: 'Hoe',
};

export const ITEM_COLORS: Record<ItemType, string> = {
  [ItemType.WOOD]: '#8B5E3C',
  [ItemType.STONE]: '#999',
  [ItemType.DIRT]: '#6B4226',
  [ItemType.SAND]: '#C2B280',
  [ItemType.SEEDS]: '#4A7C2E',
  [ItemType.WHEAT]: '#DAA520',
  [ItemType.SWORD]: '#C0C0C0',
  [ItemType.AXE]: '#8B5E3C',
  [ItemType.PICKAXE]: '#808080',
  [ItemType.SHOVEL]: '#6B4226',
  [ItemType.HOE]: '#6B4226',
};

export const TILE_COLORS: Record<TileType, string[]> = {
  [TileType.GRASS]: ['#3B8C2A', '#2E7A1E', '#4A9E37', '#358025'],
  [TileType.WATER]: ['#2060C0', '#1855B0', '#2868D0', '#1C5AB8'],
  [TileType.SAND]: ['#C8B86A', '#B8A85A', '#D0C070', '#C0B060'],
  [TileType.TREE]: ['#1A5C10', '#145008', '#227018', '#186010'],
  [TileType.ROCK]: ['#808080', '#707070', '#909090', '#787878'],
  [TileType.FLOWER]: ['#3B8C2A', '#2E7A1E', '#4A9E37', '#358025'],
  [TileType.DIRT]: ['#6B4226', '#5B3216', '#7B5236', '#634A20'],
  [TileType.FARMLAND]: ['#5B3A1A', '#4B2A0A', '#6B4A2A', '#533A14'],
  [TileType.WHEAT]: ['#DAA520', '#CA9510', '#EAB530', '#D2A018'],
};
