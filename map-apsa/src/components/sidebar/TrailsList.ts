import { Trail, TrailCard } from './TrailCard';

export class TrailsList {
  private container: HTMLElement;
  private trails: Trail[] = [];
  private cards: TrailCard[] = [];
  private selectedTrailId: string | null = null;
  private trailSelectHandler: ((trail: Trail) => void) | null = null;

  constructor(container: HTMLElement, trails: Trail[] = []) {
    this.container = container;
    this.trails = trails;
    this.setupTrailsList();
  }

  private setupTrailsList(): void {
    // Création du conteneur pour la liste des parcours
    const listContainer = document.createElement('div');
    listContainer.className = 'trails-container';
    
    // Ajout du titre
    const title = document.createElement('h2');
    title.className = 'trails-title';
    title.textContent = 'Parcours disponibles';
    listContainer.appendChild(title);
    
    // Création de la liste
    const trailsList = document.createElement('div');
    trailsList.className = 'trails-list';
    
    // Création des cartes de parcours
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
    // Désélectionner la carte actuellement sélectionnée
    if (this.selectedTrailId) {
      const previousCard = this.cards.find(card => 
        card.isCardSelected()
      );
      
      if (previousCard) {
        previousCard.deselect();
      }
    }
    
    // Sélectionner la nouvelle carte
    const currentCard = this.cards.find(card => 
      card.render().getAttribute('data-id') === trail.id
    );
    
    if (currentCard) {
      currentCard.select();
      this.selectedTrailId = trail.id;
      
      // Appeler le gestionnaire d'événements si défini
      if (this.trailSelectHandler) {
        this.trailSelectHandler(trail);
      }
    }
  }
  
  public setTrails(trails: Trail[]): void {
    this.trails = trails;
    this.cards = [];
    this.selectedTrailId = null;
    
    // Vider le conteneur et recréer la liste
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
} 