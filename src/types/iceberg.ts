export type NodeKind = 'intermediate' | 'material' | 'raw' | 'tool' | 'consumable' | 'time';

export type QualityTier = 'budget' | 'mid' | 'premium';

export interface Source {
  vendor: string;
  title: string;
  price: number;
  rating: number;
  reviews: number;
  qualityTier: QualityTier;
  shipping: string;
  searchQuery: string;
}

export interface ConfigOption {
  id: string;
  label: string;
  description: string;
}

export interface SimilarProduct {
  name: string;
  retailPrice: number;
  note: string;
}

/** Shape returned by the model / stored in the seed library. */
export interface SeedIngredient {
  name: string;
  emoji?: string;
  kind: NodeKind;
  qty: number;
  unit: string;
  unitCost: number;
  sources?: Source[];
  optional?: boolean;
  configId?: string | null;
  timeMinutes?: number;
  lore?: string;
  expandable?: boolean;
  terminal?: boolean;
  enabled?: boolean;
  children?: SeedIngredient[];
}

export interface Ingredient {
  id: string;
  name: string;
  emoji: string;
  kind: NodeKind;
  qty: number;
  unit: string;
  unitCost: number;
  sources: Source[];
  selectedSource: number;
  optional: boolean;
  configId: string | null;
  enabled: boolean;
  timeMinutes: number;
  lore: string;
  expandable: boolean;
  terminal: boolean;
  expanded: boolean;
  loading: boolean;
  loadingStartedAt: number;
  pending: boolean;
  children: Ingredient[];
  depth: number;
  parentName: string | null;
}

export interface SeedProduct {
  id: string;
  name: string;
  category: string;
  lore: string;
  retailPrice: number;
  assemblyMinutes: number;
  configurations?: ConfigOption[];
  similar?: SimilarProduct[];
  ingredients: SeedIngredient[];
}

export interface IcebergProduct {
  id: string;
  name: string;
  category: string;
  lore: string;
  retailPrice: number;
  assemblyMinutes: number;
  configurations: ConfigOption[];
  activeConfigs: string[];
  similar: SimilarProduct[];
  ingredients: Ingredient[];
  origin: 'seed' | 'ai';
}

export interface TallyItem {
  id: string;
  node: Ingredient;
  name: string;
  kind: NodeKind;
  qty: number;
  unit: string;
  cost: number;
}

export interface Tally {
  materialCost: number;
  toolCost: number;
  consumableCost: number;
  totalCost: number;
  retailPrice: number;
  deltaPct: number;
  timeMinutes: number;
  materials: TallyItem[];
  tools: TallyItem[];
  leafCount: number;
}
