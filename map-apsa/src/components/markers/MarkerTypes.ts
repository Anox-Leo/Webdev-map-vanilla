// Types de marqueurs disponibles
export enum MarkerType {
  DEFAULT = 'default',
  DANGER = 'danger'
}

// Interface pour les options du marqueur
export interface MarkerOptions {
  id: string;
  x: number;
  y: number;
  type: MarkerType;
  title: string;
  description: string;
  color?: string; // Classe de couleur optionnelle
}

// Interface pour représenter un marqueur sérialisé
export interface SerializedMarker {
  id: string;
  x: number;
  y: number;
  type: string;
  title: string;
  description: string;
  color: string;
} 