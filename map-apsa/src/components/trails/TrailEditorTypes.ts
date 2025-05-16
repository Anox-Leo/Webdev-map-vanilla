export interface TrailPoint {
  id: string;
  x: number;
  y: number;
  order: number;
}

export interface SelectedSvgElement {
  id: string;
  type: string;
  element?: Element; // Facultatif pour la sérialisation
  order: number;
}

export interface EditableTrail {
  id: string;
  name: string;
  description: string;
  color: string;
  points?: TrailPoint[]; // Maintenu pour la compatibilité avec l'ancien code
  svgElements?: SelectedSvgElement[]; // Nouvelle approche basée sur la sélection d'éléments SVG
  isComplete: boolean;
  distance?: number; // Calculé à partir des points ou des éléments
  difficulty: TrailDifficulty;
  type: string; // Type du parcours (randonnée, VTT, etc.)
}

export enum TrailEditorMode {
  VIEW = 'view',   // Mode vue (parcours existant)
  CREATE = 'create' // Mode création
}

// Niveaux de difficulté des parcours (correspond à 1, 2, 3 dans TrailCard)
export enum TrailDifficulty {
  EASY = 1,      // Facile
  MEDIUM = 2,    // Modéré/Moyen
  HARD = 3       // Difficile
}

// Types de parcours
export enum TrailType {
  HIKING = 'Randonnée pédestre',
  SPORTY_HIKE = 'Randonnée sportive',
  EASY_WALK = 'Balade tranquille',
  TRAIL_RUNNING = 'Trail running',
  FAMILY_WALK = 'Promenade familiale',
  MOUNTAIN_BIKE = 'VTT',
  ROAD_BIKE = 'Vélo de route'
}

export interface TrailEditorOptions {
  color?: string;
  strokeWidth?: number;
  strokeDashArray?: string;
  fillOpacity?: number;
} 