import { Trail, TrailCard } from './TrailCard';
import { TrailEditorController } from './TrailEditorController';

export class TrailsList {
  private container: HTMLElement;
  private trails: Trail[] = [];
  private cards: TrailCard[] = [];
  private selectedTrailId: string | null = null;
  private trailSelectHandler: ((trail: Trail) => void) | null = null;
  private trailEditorController: TrailEditorController | null = null;

  constructor(container: HTMLElement, trails: Trail[] = [], trailEditorController?: TrailEditorController) {
    this.container = container;
    this.trails = trails;
    this.trailEditorController = trailEditorController || null;
    this.setupTrailsList();
    
    // Écouter les événements pour mettre à jour la liste des parcours
    document.addEventListener('trailCreationFinished', (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.trail) {
        console.log('Nouveau parcours créé avec éléments SVG:', customEvent.detail.trail);
        // Assurons-nous que les éléments SVG sont correctement transmis
        const newTrail = {
          ...customEvent.detail.trail,
          // S'assurer que svgElements est inclus s'il existe
          svgElements: customEvent.detail.trail.svgElements || []
        };
        this.addTrail(newTrail);
      }
    });
  }

  private setupTrailsList(): void {
    const listContainer = document.createElement('div');
    listContainer.className = 'trails-container';
    
    const title = document.createElement('h2');
    title.className = 'trails-title';
    title.textContent = 'Parcours disponibles';
    listContainer.appendChild(title);
    
    const trailsList = document.createElement('div');
    trailsList.className = 'trails-list';
    
    this.trails.forEach(trail => {
      const card = new TrailCard(trail);
      card.setClickHandler((selectedTrail) => {
        this.handleTrailSelection(selectedTrail);
      });
      
      this.cards.push(card);
      trailsList.appendChild(card.render());
    });
    
    listContainer.appendChild(trailsList);
    this.container.appendChild(listContainer);
  }
  
  private handleTrailSelection(trail: Trail): void {
    if (this.selectedTrailId) {
      const previousCard = this.cards.find(card => 
        card.isCardSelected()
      );
      
      if (previousCard) {
        previousCard.deselect();
      }
    }
    
    const currentCard = this.cards.find(card => 
      card.render().getAttribute('data-id') === trail.id
    );
    
    if (currentCard) {
      currentCard.select();
      this.selectedTrailId = trail.id;
      
      // Mettre en surbrillance les éléments SVG du parcours
      if (this.trailEditorController) {
        // S'assurer que nous sommes en mode qui permet de voir les éléments SVG
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
          // Forcer le mode d'affichage plat qui permet de voir les éléments SVG
          mapContainer.classList.remove('mode-grabbing', 'mode-trail-creation');
          mapContainer.classList.add('mode-flat');
        }
        
        // Vérifier si le parcours a déjà des éléments SVG
        if (trail.svgElements && trail.svgElements.length > 0) {
          console.log('Utilisation des éléments SVG directement depuis le parcours:', trail);
          this.trailEditorController.highlightTrail(trail);
        } else {
          // Sinon, essayer de récupérer les données de localStorage
          const savedTrailsJson = localStorage.getItem('map_trails') || '[]';
          const savedTrails = JSON.parse(savedTrailsJson);
          
          // Trouver le parcours complet avec les références aux éléments SVG
          const completeTrail = savedTrails.find((savedTrail: any) => savedTrail.id === trail.id);
          
          if (completeTrail && completeTrail.svgElements && completeTrail.svgElements.length > 0) {
            console.log('Parcours complet trouvé dans localStorage, mise en surbrillance:', completeTrail);
            this.trailEditorController.highlightTrail(completeTrail);
          } else {
            console.warn(`Impossible de trouver les éléments SVG pour le parcours ${trail.id}`);
          }
        }
      }
      
      if (this.trailSelectHandler) {
        this.trailSelectHandler(trail);
      }
    }
  }
  
  public setTrails(trails: Trail[]): void {
    this.trails = trails;
    this.cards = [];
    this.selectedTrailId = null;
    
    this.container.innerHTML = '';
    this.setupTrailsList();
  }
  
  public getSelectedTrail(): Trail | null {
    if (!this.selectedTrailId) return null;
    
    return this.trails.find(trail => trail.id === this.selectedTrailId) || null;
  }
  
  public setTrailSelectHandler(handler: (trail: Trail) => void): void {
    this.trailSelectHandler = handler;
  }

  /**
   * Ajoute un nouveau parcours à la liste
   */
  public addTrail(trail: Trail): void {
    console.log('Ajout du parcours à la liste avec éléments SVG:', trail);
    
    // Vérifier si le parcours existe déjà
    const existingTrailIndex = this.trails.findIndex(t => t.id === trail.id);
    
    if (existingTrailIndex !== -1) {
      // Remplacer le parcours existant
      this.trails[existingTrailIndex] = trail;
    } else {
      // Ajouter le nouveau parcours
      this.trails.push(trail);
    }
    
    // Mettre à jour l'affichage
    this.container.innerHTML = '';
    this.cards = [];
    this.setupTrailsList();
    
    // Mettre à jour localStorage pour s'assurer que les éléments SVG sont conservés
    this.updateLocalStorage();
  }
  
  /**
   * Met à jour le localStorage avec les données actuelles des parcours
   */
  private updateLocalStorage(): void {
    // Récupérer les parcours existants de localStorage
    const savedTrailsJson = localStorage.getItem('map_trails') || '[]';
    const savedTrails = JSON.parse(savedTrailsJson);
    
    // Pour chaque parcours dans la liste actuelle, vérifier s'il existe dans localStorage
    this.trails.forEach(trail => {
      const existingIndex = savedTrails.findIndex((t: any) => t.id === trail.id);
      
      if (existingIndex !== -1) {
        // Si le parcours existe, mettre à jour ses propriétés tout en préservant svgElements
        const existing = savedTrails[existingIndex];
        savedTrails[existingIndex] = {
          ...trail,
          // Préserver les éléments SVG de l'existant si le nouveau n'en a pas
          svgElements: trail.svgElements || existing.svgElements
        };
      } else {
        // Sinon, ajouter le nouveau parcours
        savedTrails.push(trail);
      }
    });
    
    // Sauvegarder dans localStorage
    localStorage.setItem('map_trails', JSON.stringify(savedTrails));
  }
  
  /**
   * Définit le contrôleur d'édition de parcours
   */
  public setTrailEditorController(controller: TrailEditorController): void {
    this.trailEditorController = controller;
  }
} 