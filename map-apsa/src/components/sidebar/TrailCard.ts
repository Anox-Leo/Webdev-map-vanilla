export interface Trail {
  id: string;
  name: string;
  difficulty: 1 | 2 | 3; // 1: facile, 2: moyen, 3: difficile
  distance: number;
  type: string;
  image: string;
}

export class TrailCard {
  private trail: Trail;
  private isSelected: boolean = false;
  private element: HTMLElement | null = null;
  private clickHandler: ((trail: Trail) => void) | null = null;
  private defaultImage: string = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDgwIDgwIiBmaWxsPSJub25lIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9IiMxMTFjMjkiLz48cGF0aCBkPSJNNDAgMjBMMjkgNDVINTFMNDAgMjBaIiBmaWxsPSIjMTRjNzhiIi8+PHBhdGggZD0iTTI1IDUwQzI1IDQ3LjIzODYgMjcuMjM4NiA0NSAzMCA0NUgzN1Y2MEgyNVY1MFoiIGZpbGw9IiMzMzQxNTUiLz48cGF0aCBkPSJNNTUgNTBDNTUgNDcuMjM4NiA1Mi43NjE0IDQ1IDUwIDQ1SDQzVjYwSDU1VjUwWiIgZmlsbD0iIzMzNDE1NSIvPjwvc3ZnPg==';

  constructor(trail: Trail) {
    this.trail = trail;
  }

  public render(): HTMLElement {
    const card = document.createElement('div');
    card.className = 'trail-card';
    card.setAttribute('data-id', this.trail.id);
    
    // Obtenir le texte et la classe CSS pour la difficulté
    const difficultyInfo = this.getDifficultyInfo(this.trail.difficulty);

    // Nouvelle structure: Titre en haut, infos en bas avec space-between
    card.innerHTML = `
      <div class="trail-image">
        <img src="${this.trail.image}" alt="${this.trail.name}" onerror="this.onerror=null; this.src='${this.defaultImage}'">
      </div>
      <div class="trail-info">
        <!-- Titre en haut -->
        <h3 class="trail-name">${this.trail.name}</h3>
        
        <!-- Bloc d'informations en bas -->
        <div class="trail-details">
          <!-- Difficulté et distance groupées -->
          <div class="trail-metrics">
            <div class="trail-difficulty ${difficultyInfo.className}">
              ${difficultyInfo.text}
            </div>
            <div class="trail-distance">${this.trail.distance} km</div>
          </div>
          
          <!-- Type de parcours à droite -->
          <div class="trail-type">${this.trail.type}</div>
        </div>
      </div>
    `;

    // Ajout des écouteurs d'événements
    card.addEventListener('click', () => {
      if (this.clickHandler) {
        this.clickHandler(this.trail);
      }
    });

    this.element = card;
    return card;
  }

  private getDifficultyInfo(difficulty: 1 | 2 | 3): { text: string, className: string } {
    switch (difficulty) {
      case 1:
        return { text: 'Facile', className: 'difficulty-easy' };
      case 2:
        return { text: 'Modéré', className: 'difficulty-medium' };
      case 3:
        return { text: 'Difficile', className: 'difficulty-hard' };
      default:
        return { text: 'Inconnu', className: '' };
    }
  }

  public setClickHandler(handler: (trail: Trail) => void): void {
    this.clickHandler = handler;
  }

  public select(): void {
    if (!this.element) return;
    
    this.isSelected = true;
    this.element.classList.add('selected');
  }

  public deselect(): void {
    if (!this.element) return;
    
    this.isSelected = false;
    this.element.classList.remove('selected');
  }

  public isCardSelected(): boolean {
    return this.isSelected;
  }
} 