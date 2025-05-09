export class MapController {
  // Paramètres de transformation de la carte
  private scale: number = 1.0;
  private posX: number = 0;
  private posY: number = 0;
  private minScale: number = 0.5;
  private maxScale: number = 5.0;
  private zoomStep: number = 0.1;
  private rotateX: number = 40; // Degré d'inclinaison de la carte
  
  // État du drag & drop
  private isDragging: boolean = false;
  private startPosX: number = 0;
  private startPosY: number = 0;
  
  // Éléments DOM
  private mapContainer: HTMLElement | null = null;
  private mapView: HTMLElement | null = null;
  private mapSvg: HTMLObjectElement | null = null;
  private zoomInBtn: HTMLButtonElement | null = null;
  private zoomOutBtn: HTMLButtonElement | null = null;
  private resetBtn: HTMLButtonElement | null = null;

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
    this.zoomInBtn = document.getElementById('zoom-in') as HTMLButtonElement;
    this.zoomOutBtn = document.getElementById('zoom-out') as HTMLButtonElement;
    this.resetBtn = document.getElementById('reset') as HTMLButtonElement;

    // Vérifier que tous les éléments sont présents
    if (!this.mapContainer || !this.mapView || !this.mapSvg || 
        !this.zoomInBtn || !this.zoomOutBtn || !this.resetBtn) {
      console.error('Certains éléments de la carte n\'ont pas été trouvés');
      return;
    }

    // Configurer les événements
    this.setupEventListeners();
    
    // Initialiser la vue
    this.updateMapTransform();
  }

  private setupEventListeners(): void {
    if (!this.mapView || !this.zoomInBtn || !this.zoomOutBtn || !this.resetBtn) return;

    // Zoom avant (bouton +)
    this.zoomInBtn.addEventListener('click', () => {
      this.zoomIn();
    });

    // Zoom arrière (bouton -)
    this.zoomOutBtn.addEventListener('click', () => {
      this.zoomOut();
    });

    // Réinitialiser la vue
    this.resetBtn.addEventListener('click', () => {
      this.resetView();
    });

    // Commencer le déplacement
    this.mapView.addEventListener('mousedown', (e) => {
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

    // Zoom avec la molette
    this.mapView.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      // Déterminer la direction du zoom
      if (e.deltaY < 0) {
        // Zoom avant
        this.zoomAtPoint(this.scale * (1 + this.zoomStep * 0.3), e.clientX, e.clientY);
      } else {
        // Zoom arrière
        this.zoomAtPoint(this.scale / (1 + this.zoomStep * 0.3), e.clientX, e.clientY);
      }
    }, { passive: false });

    // Double-clic pour zoom avant
    this.mapView.addEventListener('dblclick', (e) => {
      if (this.isControlElement(e.target as HTMLElement)) return;
      this.zoomAtPoint(this.scale * (1 + this.zoomStep), e.clientX, e.clientY);
    });
  }

  private isControlElement(element: HTMLElement): boolean {
    // Vérifier si l'élément est un contrôle ou descendant d'un contrôle
    return element.closest('.map-controls') !== null;
  }

  private startDrag(e: MouseEvent): void {
    if (!this.mapView) return;
    
    this.isDragging = true;
    this.startPosX = e.clientX - this.posX;
    this.startPosY = e.clientY - this.posY;
    
    // Ajouter une classe pour le style durant le drag
    this.mapView.classList.add('dragging');
    
    // Empêcher la sélection de texte
    e.preventDefault();
  }

  private moveDrag(e: MouseEvent): void {
    if (!this.isDragging) return;
    
    // Calculer la nouvelle position avec une sensibilité adaptée au zoom
    // Plus le zoom est élevé, plus le mouvement est lent
    const sensitivity = 1.0 / Math.sqrt(this.scale);
    
    // Calculer le déplacement en tenant compte de l'inclinaison
    // L'inclinaison modifie la perception du mouvement vertical
    const inclinationFactor = Math.cos(this.rotateX * Math.PI / 180);
    
    const deltaX = (e.clientX - this.startPosX - this.posX) * sensitivity;
    // Ajuster le déplacement vertical en fonction de l'inclinaison
    const deltaY = (e.clientY - this.startPosY - this.posY) * sensitivity * inclinationFactor;
    
    this.posX += deltaX;
    this.posY += deltaY;
    
    // Redéfinir le point de départ pour le prochain mouvement
    this.startPosX = e.clientX - this.posX;
    this.startPosY = e.clientY - this.posY;
    
    this.updateMapTransform();
  }

  private endDrag(): void {
    if (!this.mapView || !this.isDragging) return;
    
    this.isDragging = false;
    this.mapView.classList.remove('dragging');
  }

  private zoomIn(): void {
    const newScale = Math.min(this.maxScale, this.scale * (1 + this.zoomStep));
    this.zoomTo(newScale);
  }

  private zoomOut(): void {
    const newScale = Math.max(this.minScale, this.scale / (1 + this.zoomStep));
    this.zoomTo(newScale);
  }

  private zoomTo(newScale: number): void {
    this.scale = newScale;
    this.updateMapTransform();
  }

  private zoomAtPoint(newScale: number, clientX: number, clientY: number): void {
    if (!this.mapContainer || !this.mapSvg) return;
    
    // Limiter l'échelle
    newScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
    
    // Obtenir la position de la carte
    const rect = this.mapContainer.getBoundingClientRect();
    
    // Position du point de zoom par rapport au centre de la carte
    const pointX = clientX - rect.left - rect.width / 2;
    const pointY = clientY - rect.top - rect.height / 2;
    
    // Calculer le décalage nécessaire pour que le point reste sous le curseur
    const scaleFactor = newScale / this.scale;
    const offsetX = pointX - pointX * scaleFactor;
    const offsetY = pointY - pointY * scaleFactor;
    
    // Ajuster le décalage vertical en fonction de l'inclinaison
    const inclinationFactor = Math.cos(this.rotateX * Math.PI / 180);
    
    // Mettre à jour l'échelle et la position
    this.scale = newScale;
    this.posX += offsetX;
    this.posY += offsetY * inclinationFactor; // Ajuster en fonction de l'inclinaison
    
    this.updateMapTransform();
  }

  private resetView(): void {
    this.scale = 1.0;
    this.posX = 0;
    this.posY = 0;
    this.updateMapTransform();
  }

  private updateMapTransform(): void {
    if (!this.mapSvg) return;
    
    // Appliquer la transformation avec l'inclinaison 3D
    this.mapSvg.style.transform = `rotateX(${this.rotateX}deg) scale(${this.scale}) translate(${this.posX}px, ${this.posY}px)`;
  }
} 