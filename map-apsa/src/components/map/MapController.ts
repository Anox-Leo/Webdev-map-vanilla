import { 
  TransformController, 
  DragController, 
  CompassController, 
  UIController, 
  NotificationController 
} from './controllers';
import { UserBubble } from '../users/UserBubble';

export class MapController {
  // Controllers spécialisés
  private transformController!: TransformController;
  private dragController!: DragController;
  private compassController!: CompassController;
  private uiController!: UIController;
  private notificationController!: NotificationController;

  // Éléments DOM
  private mapContainer: HTMLElement | null = null;
  private mapView: HTMLElement | null = null;
  private mapSvg: HTMLObjectElement | null = null;

  constructor() {
    // Attendre que le DOM soit complètement chargé
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  private initialize(): void {
    // Récupérer les références aux éléments du DOM
    this.mapContainer = document.getElementById('map-container');
    this.mapView = document.querySelector('.map-view') as HTMLElement;
    this.mapSvg = document.getElementById('map-svg') as HTMLObjectElement;

    // Vérifier que tous les éléments sont présents
    if (!this.mapContainer || !this.mapView || !this.mapSvg) {
      // Les éléments requis n'ont pas été trouvés
      return;
    }

    // Initialiser les contrôleurs spécialisés
    this.transformController = new TransformController(this.mapSvg);
    this.dragController = new DragController(
      this.mapView, 
      this.transformController
    );
    this.compassController = new CompassController(
      this.transformController
    );
    this.uiController = new UIController(
      this.mapView,
      this.transformController,
      this.compassController,
      this.dragController
    );
    this.notificationController = new NotificationController(this.mapContainer);
    new UserBubble();

    // Configurer les événements et initialiser la vue
    this.setupEventListeners();
    
    // Attendre que le SVG soit complètement chargé avant d'initialiser la boussole
    if (this.mapSvg) {
      this.mapSvg.addEventListener('load', () => {
        this.compassController.updateCompassHandle();
        this.compassController.updateDirectionIndicator();
        
        // Afficher l'aide initiale
        setTimeout(() => {
          this.showHelpTips();
        }, 1000);
      });
      
      // Initialiser aussi immédiatement au cas où le SVG est déjà chargé
      setTimeout(() => {
        this.compassController.updateCompassHandle();
        this.compassController.updateDirectionIndicator();
      }, 100);
    }
  }

  private setupEventListeners(): void {
    // Les contrôleurs spécialisés configurent leurs propres écouteurs d'événements
    this.uiController.setupEventListeners();
    this.dragController.setupEventListeners();
    this.compassController.setupEventListeners();
  }

  private showHelpTips(): void {
    // Vérifier si c'est la première visite
    const hasSeenTips = localStorage.getItem('map_has_seen_rotation_tips');
    if (hasSeenTips) return;
    
    // Enregistrer que l'utilisateur a vu les conseils
    localStorage.setItem('map_has_seen_rotation_tips', 'true');
    
    // Afficher les conseils avec un délai
    setTimeout(() => {
      this.notificationController.showNotification('Faites glisser la boussole pour pivoter la carte');
    }, 1000);
  }
} 