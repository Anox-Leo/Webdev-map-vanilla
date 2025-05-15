import { TransformController } from './TransformController';
import { MapDisplayMode } from '../MapController';

export class DragController {
  // État du drag & drop
  private isDragging: boolean = false;
  private startPosX: number = 0;
  private startPosY: number = 0;
  
  // Références
  private mapView: HTMLElement;
  private transformController: TransformController;
  
  // Mode d'affichage actuel
  private currentMode: MapDisplayMode = MapDisplayMode.GRABBING;

  constructor(mapView: HTMLElement, transformController: TransformController) {
    this.mapView = mapView;
    this.transformController = transformController;
  }

  /**
   * Configure les écouteurs d'événements pour le drag & drop
   */
  public setupEventListeners(): void {
    if (!this.mapView) return;

    // Commencer le déplacement
    this.mapView.addEventListener('mousedown', (e) => {
      // Si on est en mode plat, ne pas démarrer le déplacement
      if (this.currentMode === MapDisplayMode.FLAT) return;
      
      // Ignorer les clics sur les contrôles
      if (this.isControlElement(e.target as HTMLElement)) return;
      
      this.startDrag(e);
    });

    // Gérer le déplacement
    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.moveDrag(e);
      }
    });

    // Terminer le déplacement
    window.addEventListener('mouseup', () => {
      this.endDrag();
    });
    
    // S'assurer que le drag se termine même si la souris sort de la fenêtre
    window.addEventListener('mouseleave', () => {
      this.endDrag();
    });
  }

  /**
   * Met à jour le mode d'affichage actuel
   */
  public setDisplayMode(mode: MapDisplayMode): void {
    this.currentMode = mode;
    
    // Si le mode change et qu'un déplacement est en cours, le terminer
    if (this.isDragging) {
      this.endDrag();
    }
  }

  /**
   * Détermine si un élément est un contrôle de la carte
   */
  private isControlElement(element: HTMLElement): boolean {
    // Vérifier si l'élément est un contrôle ou descendant d'un contrôle
    return element.closest('.map-controls') !== null || 
           element.closest('.compass-container') !== null ||
           element.closest('.map-mode-selector') !== null;
  }

  /**
   * Démarre le déplacement de la carte
   */
  private startDrag(e: MouseEvent): void {
    if (!this.mapView || this.currentMode === MapDisplayMode.FLAT) return;
    
    this.isDragging = true;
    
    // Mémoriser la position de départ
    const transformValues = this.transformController;
    this.startPosX = e.clientX;
    this.startPosY = e.clientY;
    
    // Ajouter une classe pour le style durant le drag
    this.mapView.classList.add('dragging');
    
    // Empêcher la sélection de texte
    e.preventDefault();
  }

  /**
   * Gère le déplacement continu de la carte
   */
  private moveDrag(e: MouseEvent): void {
    if (!this.isDragging || this.currentMode === MapDisplayMode.FLAT) return;
    
    // Calculer la nouvelle position avec une sensibilité adaptée au zoom
    // Plus le zoom est élevé, plus le mouvement est lent
    const scale = this.transformController.getScale();
    const sensitivity = 1.0 / Math.sqrt(scale);
    
    // Calculer le déplacement en tenant compte de l'inclinaison
    // L'inclinaison modifie la perception du mouvement vertical
    const rotateX = this.transformController.getRotateX();
    const inclinationFactor = Math.cos(rotateX * Math.PI / 180);
    
    // Obtenir le déplacement brut
    const rawDeltaX = (e.clientX - this.startPosX) * sensitivity;
    const rawDeltaY = (e.clientY - this.startPosY) * sensitivity * inclinationFactor;
    
    // Convertir les coordonnées en tenant compte de la rotation
    // Transforme les déplacements pour qu'ils soient cohérents avec l'orientation de la carte
    const rotateZ = this.transformController.getRotateZ();
    const rotationRad = -rotateZ * Math.PI / 180;
    const deltaX = rawDeltaX * Math.cos(rotationRad) + rawDeltaY * Math.sin(rotationRad);
    const deltaY = -rawDeltaX * Math.sin(rotationRad) + rawDeltaY * Math.cos(rotationRad);
    
    // Mettre à jour la position via le transformController
    this.transformController.updatePosition(deltaX, deltaY);
    
    // Redéfinir le point de départ pour le prochain mouvement
    this.startPosX = e.clientX;
    this.startPosY = e.clientY;
  }

  /**
   * Termine le déplacement de la carte
   */
  private endDrag(): void {
    if (!this.mapView || !this.isDragging) return;
    
    this.isDragging = false;
    this.mapView.classList.remove('dragging');
  }
  
  /**
   * Vérifie si la carte est en cours de déplacement
   */
  public isDraggingActive(): boolean {
    return this.isDragging;
  }
} 