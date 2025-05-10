import { TransformController } from './TransformController';
import { CompassController } from './CompassController';
import { DragController } from './DragController';

export class UIController {
  // Éléments DOM
  private mapView: HTMLElement;
  private zoomInBtn: HTMLButtonElement | null = null;
  private zoomOutBtn: HTMLButtonElement | null = null;
  private resetBtn: HTMLButtonElement | null = null;
  
  // Références aux autres contrôleurs
  private transformController: TransformController;
  private compassController: CompassController;
  private dragController: DragController;

  constructor(
    mapView: HTMLElement,
    transformController: TransformController,
    compassController: CompassController,
    dragController: DragController
  ) {
    this.mapView = mapView;
    this.transformController = transformController;
    this.compassController = compassController;
    this.dragController = dragController;
    
    // Récupérer les références DOM des contrôles
    this.zoomInBtn = document.getElementById('zoom-in') as HTMLButtonElement;
    this.zoomOutBtn = document.getElementById('zoom-out') as HTMLButtonElement;
    this.resetBtn = document.getElementById('reset') as HTMLButtonElement;
  }

  /**
   * Configure les écouteurs d'événements pour l'interface utilisateur
   */
  public setupEventListeners(): void {
    if (!this.mapView || !this.zoomInBtn || !this.zoomOutBtn || !this.resetBtn) return;

    // Zoom avant (bouton +)
    this.zoomInBtn.addEventListener('click', () => {
      this.transformController.zoomIn();
    });

    // Zoom arrière (bouton -)
    this.zoomOutBtn.addEventListener('click', () => {
      this.transformController.zoomOut();
    });

    // Réinitialiser la vue
    this.resetBtn.addEventListener('click', () => {
      this.transformController.resetView();
      this.compassController.updateCompassHandle();
      this.compassController.updateDirectionIndicator();
    });

    // Zoom avec la molette
    this.mapView.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      // Vérifier que la carte n'est pas en cours de rotation
      if (this.compassController.isRotatingActive()) return;
      
      // Obtenir le conteneur pour le zoom centré sur le curseur
      const container = this.mapView.closest('#map-container') as HTMLElement;
      if (!container) return;
      
      // Déterminer la direction du zoom
      const zoomStep = this.transformController.getZoomStep();
      if (e.deltaY < 0) {
        // Zoom avant
        this.transformController.zoomAtPoint(
          this.transformController.getScale() * (1 + zoomStep * 0.3),
          e.clientX,
          e.clientY,
          container
        );
      } else {
        // Zoom arrière
        this.transformController.zoomAtPoint(
          this.transformController.getScale() / (1 + zoomStep * 0.3),
          e.clientX,
          e.clientY,
          container
        );
      }
    }, { passive: false });

    // Double-clic pour zoom avant
    this.mapView.addEventListener('dblclick', (e) => {
      // Vérifier que l'élément n'est pas un contrôle
      if (this.isControlElement(e.target as HTMLElement)) return;
      
      // Ignorer si la carte est en cours de déplacement ou rotation
      if (this.dragController.isDraggingActive() || this.compassController.isRotatingActive()) return;
      
      // Obtenir le conteneur pour le zoom centré sur le curseur
      const container = this.mapView.closest('#map-container') as HTMLElement;
      if (!container) return;
      
      // Effectuer un zoom avant au point cliqué
      const zoomStep = this.transformController.getZoomStep();
      this.transformController.zoomAtPoint(
        this.transformController.getScale() * (1 + zoomStep),
        e.clientX,
        e.clientY,
        container
      );
    });
  }

  /**
   * Détermine si un élément est un contrôle de la carte
   */
  private isControlElement(element: HTMLElement): boolean {
    // Vérifier si l'élément est un contrôle ou descendant d'un contrôle
    return element.closest('.map-controls') !== null || element.closest('.compass-container') !== null;
  }
} 