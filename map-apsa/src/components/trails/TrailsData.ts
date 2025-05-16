import { Trail } from './TrailCard';

// Données d'exemple pour les parcours
export const mockTrails: Trail[] = [
  {
    id: 'trail-1',
    name: 'Découvrir la Chantrerie',
    difficulty: 3,
    distance: 8.5,
    type: 'Randonnée pédestre',
    image: '/assets/images/trail-waterfall.jpg'
  },
  {
    id: 'trail-2',
    name: "Le senstier des mines",
    difficulty: 1,
    distance: 1.2,
    type: 'Promenade',
    image: '/assets/images/trail-lake.jpg'
  },
];

// Fonction pour obtenir les parcours, en combinant les parcours prédéfinis et ceux stockés dans localStorage
export function getTrails(): Promise<Trail[]> {
  return new Promise((resolve) => {
    // Récupérer les parcours stockés dans localStorage
    const savedTrailsJson = localStorage.getItem('map_trails') || '[]';
    const savedTrails = JSON.parse(savedTrailsJson);
    
    // Convertir les parcours enregistrés au format Trail si nécessaire
    const trailsFromStorage: Trail[] = savedTrails.map((trail: any) => {
      // S'assurer que toutes les propriétés requises sont présentes
      return {
        id: trail.id,
        name: trail.name,
        difficulty: trail.difficulty || 1, // Valeur par défaut si manquant
        distance: typeof trail.distance === 'number' ? trail.distance : 1, // Conversion et valeur par défaut
        type: trail.type || 'Randonnée pédestre', // Valeur par défaut si manquant
        image: trail.image || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDgwIDgwIiBmaWxsPSJub25lIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9IiMxMTFjMjkiLz48cGF0aCBkPSJNNDAgMjBMMjkgNDVINTFMNDAgMjBaIiBmaWxsPSIjMTRjNzhiIi8+PHBhdGggZD0iTTI1IDUwQzI1IDQ3LjIzODYgMjcuMjM4NiA0NSAzMCA0NUgzN1Y2MEgyNVY1MFoiIGZpbGw9IiMzMzQxNTUiLz48cGF0aCBkPSJNNTUgNTBDNTUgNDcuMjM4NiA1Mi43NjE0IDQ1IDUwIDQ1SDQzVjYwSDU1VjUwWiIgZmlsbD0iIzMzNDE1NSIvPjwvc3ZnPg=='
      };
    });
    
    // Combiner les deux sources de parcours
    const allTrails = [...mockTrails, ...trailsFromStorage];
    
    // Simulation d'un délai réseau
    setTimeout(() => {
      resolve(allTrails);
    }, 300);
  });
} 