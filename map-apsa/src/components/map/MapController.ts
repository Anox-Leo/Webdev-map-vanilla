import { 
  TransformController, 
  DragController, 
  CompassController, 
  UIController, 
  NotificationController 
} from './controllers';
import { UserBubble } from '../users/UserBubble';

// Définition des modes d'affichage de la carte
export enum MapDisplayMode {
  GRABBING = 'grabbing', // Mode par défaut (zoom, déplacement, rotation)
  FLAT = 'flat'          // Mode plat avec éléments SVG cliquables
}

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
  
  // Mode d'affichage actuel
  private displayMode: MapDisplayMode = MapDisplayMode.GRABBING;

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
        
        // Initialiser les écouteurs d'événements pour les éléments SVG
        this.setupSvgElementsEventListeners();
        
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
    
    // Ajouter le sélecteur de mode
    this.addModeSelector();
  }

  private setupEventListeners(): void {
    // Les contrôleurs spécialisés configurent leurs propres écouteurs d'événements
    this.uiController.setupEventListeners();
    this.dragController.setupEventListeners();
    this.compassController.setupEventListeners();
  }
  
  private setupSvgElementsEventListeners(): void {
    if (!this.mapSvg) return;
    
    // Accéder au document SVG une fois qu'il est chargé
    const svgDocument = (this.mapSvg as HTMLObjectElement).contentDocument;
    if (!svgDocument) return;
    
    // Variable pour stocker l'élément actuellement sélectionné
    let selectedElement: SVGElement | null = null;
    
    // Trouver tous les éléments cliquables (par exemple, les chemins, rectangles, etc.)
    const svgElements = svgDocument.querySelectorAll('path, rect, circle, polygon, polyline');
    
    // Ajouter un écouteur de clic à chaque élément
    svgElements.forEach((element) => {
      element.addEventListener('click', (e) => {
        // Ne traiter le clic que si on est en mode plat
        if (this.displayMode === MapDisplayMode.FLAT) {
          // Empêcher la propagation de l'événement
          e.stopPropagation();
          
          // Récupérer l'ID ou d'autres attributs de l'élément
          const elementId = element.id || 'sans-id';
          const elementType = element.tagName;
          
          // Afficher dans la console
          console.log(`Élément SVG cliqué: ${elementType}#${elementId}`, element);
          
          // Si un élément était déjà sélectionné, restaurer sa couleur d'origine
          if (selectedElement) {
            const originalFill = selectedElement.getAttribute('data-original-fill');
            const originalStroke = selectedElement.getAttribute('data-original-stroke');
            
            if (originalFill) {
              selectedElement.setAttribute('fill', originalFill);
            } else {
              selectedElement.removeAttribute('fill');
            }
            
            if (originalStroke) {
              selectedElement.setAttribute('stroke', originalStroke);
            } else {
              selectedElement.removeAttribute('stroke');
            }
            
            selectedElement.removeAttribute('data-original-fill');
            selectedElement.removeAttribute('data-original-stroke');
          }
          
          // Stocker les couleurs originales de l'élément cliqué
          element.setAttribute('data-original-fill', element.getAttribute('fill') || '');
          element.setAttribute('data-original-stroke', element.getAttribute('stroke') || '');
          
          // Changer la couleur de l'élément en rouge
          element.setAttribute('fill', 'rgba(255, 0, 0, 0.5)'); // Rouge semi-transparent
          element.setAttribute('stroke', '#FF0000'); // Contour rouge
          element.setAttribute('stroke-width', '2');
          
          // Mémoriser l'élément sélectionné
          selectedElement = element as SVGElement;
          
          // Afficher une notification pour indiquer l'élément cliqué
          this.notificationController.showNotification(`Élément cliqué: ${elementType}#${elementId}`);
        }
      });
      
      // Ajouter des styles de survol pour les éléments en mode plat
      element.addEventListener('mouseenter', () => {
        if (this.displayMode === MapDisplayMode.FLAT) {
          // Ne pas changer la couleur si l'élément est déjà sélectionné
          if (element !== selectedElement) {
            element.setAttribute('data-original-fill', element.getAttribute('fill') || '');
            element.setAttribute('data-original-stroke', element.getAttribute('stroke') || '');
            element.setAttribute('fill', 'rgba(100, 149, 237, 0.5)'); // Couleur de survol (bleu clair semi-transparent)
            element.setAttribute('stroke', '#3366CC');
            element.setAttribute('stroke-width', '2');
          }
        }
      });
      
      element.addEventListener('mouseleave', () => {
        if (this.displayMode === MapDisplayMode.FLAT) {
          // Ne pas restaurer la couleur si l'élément est sélectionné
          if (element !== selectedElement) {
            const originalFill = element.getAttribute('data-original-fill');
            const originalStroke = element.getAttribute('data-original-stroke');
            
            if (originalFill) {
              element.setAttribute('fill', originalFill);
            } else {
              element.removeAttribute('fill');
            }
            
            if (originalStroke) {
              element.setAttribute('stroke', originalStroke);
            } else {
              element.removeAttribute('stroke');
            }
            
            element.removeAttribute('data-original-fill');
            element.removeAttribute('data-original-stroke');
            element.removeAttribute('stroke-width');
          }
        }
      });
    });
    
    // Ajouter un écouteur de clic sur le fond de la carte pour désélectionner
    svgDocument.addEventListener('click', (e) => {
      if (this.displayMode === MapDisplayMode.FLAT && selectedElement) {
        // Vérifier si le clic est sur le fond et non sur un élément
        if ((e.target as Element).tagName.toLowerCase() === 'svg') {
          // Restaurer la couleur de l'élément sélectionné
          const originalFill = selectedElement.getAttribute('data-original-fill');
          const originalStroke = selectedElement.getAttribute('data-original-stroke');
          
          if (originalFill) {
            selectedElement.setAttribute('fill', originalFill);
          } else {
            selectedElement.removeAttribute('fill');
          }
          
          if (originalStroke) {
            selectedElement.setAttribute('stroke', originalStroke);
          } else {
            selectedElement.removeAttribute('stroke');
          }
          
          selectedElement.removeAttribute('data-original-fill');
          selectedElement.removeAttribute('data-original-stroke');
          selectedElement.removeAttribute('stroke-width');
          
          // Réinitialiser l'élément sélectionné
          selectedElement = null;
        }
      }
    });
  }
  
  private addModeSelector(): void {
    if (!this.mapContainer) return;
    
    // Créer le sélecteur de mode
    const modeSelector = document.createElement('div');
    modeSelector.className = 'map-mode-selector';
    modeSelector.innerHTML = `
      <div class="mode-title">Mode d'affichage:</div>
      <div class="mode-options">
        <button class="mode-btn active" data-mode="${MapDisplayMode.GRABBING}">Navigation</button>
        <button class="mode-btn" data-mode="${MapDisplayMode.FLAT}">Plat (interactif)</button>
      </div>
    `;
    
    // Ajouter le sélecteur au conteneur de la carte
    this.mapContainer.appendChild(modeSelector);
    
    // Configurer les écouteurs d'événements pour les boutons
    const modeButtons = modeSelector.querySelectorAll('.mode-btn');
    modeButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Récupérer le mode sélectionné
        const mode = button.getAttribute('data-mode') as MapDisplayMode;
        
        // Changer le mode actif
        this.setDisplayMode(mode);
        
        // Mettre à jour les classes des boutons
        modeButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
      });
    });
  }
  
  /**
   * Change le mode d'affichage de la carte
   */
  public setDisplayMode(mode: MapDisplayMode): void {
    this.displayMode = mode;
    
    // Mettre à jour l'affichage en fonction du mode
    if (this.mapContainer && this.mapSvg) {
      // Supprimer les classes existantes
      this.mapContainer.classList.remove('mode-grabbing', 'mode-flat');
      
      // Ajouter la classe correspondant au mode actuel
      this.mapContainer.classList.add(`mode-${mode}`);
      
      // Informer les contrôleurs du changement de mode
      this.dragController.setDisplayMode(mode);
      this.uiController.setDisplayMode(mode);
      this.compassController.setDisplayMode(mode);
      
      if (mode === MapDisplayMode.FLAT) {
        // En mode plat, réinitialiser l'inclinaison
        this.transformController.setFlatMode(true);
        // Afficher une notification pour indiquer le changement de mode
        this.notificationController.showNotification('Mode plat activé. Les éléments de la carte sont cliquables.');
      } else {
        // En mode grabbing, restaurer l'inclinaison par défaut
        this.transformController.setFlatMode(false);
        // Afficher une notification pour indiquer le changement de mode
        this.notificationController.showNotification('Mode navigation activé. Vous pouvez déplacer et pivoter la carte.');
      }
    }
  }
  
  /**
   * Retourne le mode d'affichage actuel
   */
  public getDisplayMode(): MapDisplayMode {
    return this.displayMode;
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