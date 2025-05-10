import { Trail } from './TrailCard';

// Données d'exemple pour les parcours
export const mockTrails: Trail[] = [
  {
    id: 'trail-1',
    name: 'Sentier des Cascades',
    difficulty: 2,
    distance: 8.5,
    type: 'Randonnée pédestre',
    image: '/assets/images/trail-waterfall.jpg'
  },
  {
    id: 'trail-2',
    name: 'Circuit des Lacs',
    difficulty: 3,
    distance: 12.3,
    type: 'Randonnée sportive',
    image: '/assets/images/trail-lake.jpg'
  },
  {
    id: 'trail-3',
    name: 'Chemin des Vignes',
    difficulty: 1,
    distance: 5.2,
    type: 'Balade tranquille',
    image: '/assets/images/trail-vineyard.jpg'
  },
  {
    id: 'trail-4',
    name: 'Sentier des Crêtes',
    difficulty: 3,
    distance: 15.7,
    type: 'Trail running',
    image: '/assets/images/trail-mountain.jpg'
  },
  {
    id: 'trail-5',
    name: 'Boucle du Vieux Moulin',
    difficulty: 1,
    distance: 3.8,
    type: 'Promenade familiale',
    image: '/assets/images/trail-old-mill.jpg'
  }
];

// Fonction pour obtenir les parcours (pourrait être remplacée par un appel API)
export function getTrails(): Promise<Trail[]> {
  return new Promise((resolve) => {
    // Simulation d'un délai réseau
    setTimeout(() => {
      resolve(mockTrails);
    }, 300);
  });
} 