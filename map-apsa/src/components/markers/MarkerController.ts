import './Markers.css';
import './MarkerTooltip.css';
import { NotificationController } from '../map/controllers/NotificationController';
import { MarkerType, MarkerOptions, SerializedMarker } from './MarkerTypes';

// Espace de noms pour les liens XLink dans SVG
const XLINK_NS = 'http://www.w3.org/1999/xlink';

export class MarkerController {
  // Groupe SVG pour les points ajoutés par l'utilisateur
  private userPointsGroup: SVGGElement | null = null;
  
  // Compteur pour les ID des points
  private pointCounter: number = 0;
  
  // Type de marqueur actuel
  private currentMarkerType: MarkerType = MarkerType.DEFAULT;
  
  // Référence à l'élément SVG
  private mapSvg: HTMLObjectElement;
  
  // Référence au contrôleur de notifications
  private notificationController: NotificationController;
  
  // Indique si le mode de placement de points est actif
  private pointPlacementMode: boolean = false;
  
  // État du formulaire pour les nouveaux marqueurs
  private newMarkerFormData: {
    title: string;
    description: string;
  } = {
    title: '',
    description: ''
  };
  
  // Chemins vers les icônes SVG
  private readonly INFO_MARKER_ICON = '/assets/icons/info-marker.svg';
  private readonly DANGER_MARKER_ICON = '/assets/icons/danger-marker.svg';
  
  // Tooltip actif
  private activeTooltip: HTMLElement | null = null;
  
  // Timer pour auto-fermeture
  private tooltipAutoCloseTimer: number | null = null;
  
  // Référence au conteneur de la carte
  private mapContainer: HTMLElement | null = null;
  
  // Callback pour la validation du formulaire
  private markerFormCallback: ((data: { title: string; description: string }) => void) | null = null;

  constructor(mapSvg: HTMLObjectElement, notificationController: NotificationController) {
    this.mapSvg = mapSvg;
    this.notificationController = notificationController;
    
    // Trouver le conteneur de la carte
    this.mapContainer = document.getElementById('map-container');
    
    // Initialiser le groupe de points une fois que le SVG est chargé
    if (this.mapSvg) {
      this.mapSvg.addEventListener('load', () => {
        this.initializeMarkerGroup();
      });
      
      // Si le SVG est déjà chargé
      setTimeout(() => {
        if (this.mapSvg.contentDocument && this.mapSvg.contentDocument.readyState === 'complete') {
          this.initializeMarkerGroup();
        }
      }, 100);
    }
    
    // Écouteur global de clic pour fermer les tooltips
    document.addEventListener('click', (e) => {
      // Vérifier si le clic est en dehors d'un marqueur et d'un tooltip
      const isMarker = (e.target as Element).closest('.location-marker');
      const isTooltip = (e.target as Element).closest('.marker-tooltip');
      const isMarkerForm = (e.target as Element).closest('.marker-form, .marker-options');
      
      // Ne pas fermer le tooltip si le clic est sur un marqueur, un tooltip, 
      // ou le formulaire d'ajout de marqueur
      if (!isMarker && !isTooltip && !isMarkerForm && this.activeTooltip) {
        this.hideTooltip();
      }
    });
  }
  
  /**
   * Initialise le groupe de marqueurs dans le SVG
   */
  private initializeMarkerGroup(): void {
    if (!this.mapSvg || !this.mapSvg.contentDocument) return;
    
    const svgRoot = this.mapSvg.contentDocument.querySelector('svg');
    if (svgRoot) {
      // Créer le groupe s'il n'existe pas déjà
      const existingGroup = this.mapSvg.contentDocument.getElementById('user-points-group');
      
      if (existingGroup) {
        // Utiliser un cast pour s'assurer du type
        this.userPointsGroup = existingGroup as unknown as SVGGElement;
      } else {
        // Créer un nouveau groupe SVG
        this.userPointsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.userPointsGroup.setAttribute('id', 'user-points-group');
        svgRoot.appendChild(this.userPointsGroup);
      }
      
      // Ajouter un écouteur de clic sur le groupe de points pour afficher les tooltips
      this.userPointsGroup.addEventListener('click', this.handleMarkerClick);
      
      // Ajouter un écouteur sur le document SVG pour fermer les tooltips lors d'un clic sur la carte
      svgRoot.addEventListener('click', (e) => {
        // Si le clic n'est pas sur un marqueur, fermer le tooltip
        const isMarker = (e.target as Element).closest('.location-marker');
        if (!isMarker && this.activeTooltip) {
          this.hideTooltip();
        }
      });
    }
  }
  
  /**
   * Gère les clics sur les marqueurs (affichage du tooltip)
   */
  private handleMarkerClick = (e: Event): void => {
    const marker = (e.target as Element).closest('.location-marker');
    if (marker) {
      // Arrêter la propagation pour que le document ne reçoive pas ce clic
      e.stopPropagation();
      
      // Récupérer les données du marqueur
      const title = marker.getAttribute('data-title') || 'Sans titre';
      const description = marker.getAttribute('data-description') || 'Sans description';
      const type = marker.classList.contains('danger') ? MarkerType.DANGER : MarkerType.DEFAULT;
      
      // Afficher le tooltip
      this.showTooltip(title, description, type);
    }
  };

  /**
   * Affiche le tooltip avec les informations du marqueur
   */
  private showTooltip(title: string, description: string, type: MarkerType): void {
    // Annuler le timer d'auto-fermeture s'il existe
    if (this.tooltipAutoCloseTimer !== null) {
      clearTimeout(this.tooltipAutoCloseTimer);
      this.tooltipAutoCloseTimer = null;
    }
    
    // Fermer le tooltip actif s'il y en a un
    if (this.activeTooltip) {
      // Si on clique sur un autre marqueur, fermer le tooltip actuel sans animation
      this.activeTooltip.remove();
      this.activeTooltip = null;
    }
    
    // Créer le tooltip
    this.activeTooltip = document.createElement('div');
    this.activeTooltip.className = `marker-tooltip ${type}`;
    this.activeTooltip.innerHTML = `
      <button class="marker-tooltip-close">&times;</button>
      <div class="marker-tooltip-title">${title}</div>
      <div class="marker-tooltip-description">${description}</div>
    `;
    
    // Ajouter le tooltip au corps du document
    document.body.appendChild(this.activeTooltip);
    
    // Ajouter un écouteur pour le bouton de fermeture
    const closeButton = this.activeTooltip.querySelector('.marker-tooltip-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.hideTooltip();
      });
    }
    
    // Afficher le tooltip immédiatement
    this.activeTooltip.classList.add('visible');
    
    // Auto-fermeture après 15 secondes
    this.tooltipAutoCloseTimer = window.setTimeout(() => {
      this.hideTooltip();
    }, 15000);
  }
  
  
  /**
   * Cache le tooltip actif
   */
  private hideTooltip(): void {
    if (this.activeTooltip) {
      // Annuler le timer d'auto-fermeture s'il existe
      if (this.tooltipAutoCloseTimer !== null) {
        clearTimeout(this.tooltipAutoCloseTimer);
        this.tooltipAutoCloseTimer = null;
      }
      
      // Ajouter une classe pour l'animation de sortie
      this.activeTooltip.classList.add('hiding');
      this.activeTooltip.classList.remove('visible');
      
      // Stocker une référence pour le timeout
      const tooltipToRemove = this.activeTooltip;
      this.activeTooltip = null;
      
      // Supprimer après l'animation
      setTimeout(() => {
        if (tooltipToRemove && tooltipToRemove.parentNode) {
          tooltipToRemove.parentNode.removeChild(tooltipToRemove);
        }
      }, 300);
    }
  }
  
  /**
   * Affiche un formulaire pour recueillir les informations du marqueur
   */
  public showMarkerForm(markerType: MarkerType, callback: (data: { title: string; description: string }) => void): void {
    // Réinitialiser les données du formulaire
    this.newMarkerFormData = { title: '', description: '' };
    this.markerFormCallback = callback;
    
    // Créer le formulaire dans le panneau des options
    const markerOptions = document.querySelector('.marker-options');
    if (!markerOptions) return;
    
    // Supprimer le formulaire existant s'il y en a un
    const existingForm = markerOptions.querySelector('.marker-form');
    if (existingForm) {
      markerOptions.removeChild(existingForm);
    }
    
    // Créer le formulaire
    const form = document.createElement('form');
    form.className = `marker-form ${markerType}`;
    form.innerHTML = `
      <div class="marker-form-field">
        <label for="marker-title">Titre</label>
        <input type="text" id="marker-title" placeholder="Titre du marqueur" required>
        <div class="marker-form-error" id="title-error" style="display: none;">Le titre est requis</div>
      </div>
      
      <div class="marker-form-field">
        <label for="marker-description">Description</label>
        <textarea id="marker-description" placeholder="Description du marqueur" required></textarea>
        <div class="marker-form-error" id="description-error" style="display: none;">La description est requise</div>
      </div>
      
      <div class="marker-form-actions">
        <button type="button" class="marker-form-cancel">Annuler</button>
        <button type="submit" class="marker-form-submit">Placer le marqueur</button>
      </div>
    `;
    
    // Ajouter le formulaire au panneau
    markerOptions.appendChild(form);
    
    // Ajouter les écouteurs d'événements
    form.addEventListener('submit', this.handleMarkerFormSubmit);
    
    // Ajouter un écouteur pour le bouton d'annulation
    const cancelButton = form.querySelector('.marker-form-cancel');
    if (cancelButton) {
      cancelButton.addEventListener('click', this.handleMarkerFormCancel);
    }
    
    // Ajouter un écouteur pour les clics en dehors du formulaire
    document.addEventListener('click', this.handleOutsideClick);
    
    // Focus sur le premier champ
    const titleInput = form.querySelector('#marker-title') as HTMLInputElement;
    if (titleInput) {
      titleInput.focus();
    }
  }
  
  /**
   * Gère la soumission du formulaire de marqueur
   */
  private handleMarkerFormSubmit = (e: Event): void => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const titleInput = form.querySelector('#marker-title') as HTMLInputElement;
    const descriptionInput = form.querySelector('#marker-description') as HTMLTextAreaElement;
    const titleError = form.querySelector('#title-error') as HTMLDivElement;
    const descriptionError = form.querySelector('#description-error') as HTMLDivElement;
    
    // Validation
    let isValid = true;
    
    if (!titleInput.value.trim()) {
      titleError.style.display = 'block';
      isValid = false;
    } else {
      titleError.style.display = 'none';
    }
    
    if (!descriptionInput.value.trim()) {
      descriptionError.style.display = 'block';
      isValid = false;
    } else {
      descriptionError.style.display = 'none';
    }
    
    if (isValid && this.markerFormCallback) {
      // Appeler le callback avec les données du formulaire
      this.markerFormCallback({
        title: titleInput.value.trim(),
        description: descriptionInput.value.trim()
      });
      
      // Masquer le formulaire
      const markerOptions = document.querySelector('.marker-options');
      if (markerOptions) {
        const existingForm = markerOptions.querySelector('.marker-form');
        if (existingForm) {
          markerOptions.removeChild(existingForm);
        }
      }
    }
  };
  
  /**
   * Gère l'annulation du formulaire de marqueur
   */
  private handleMarkerFormCancel = (e: Event): void => {
    e.preventDefault();
    
    // Fermer le panneau d'options
    const markerOptions = document.querySelector('.marker-options');
    if (markerOptions && markerOptions.classList.contains('visible')) {
      markerOptions.classList.remove('visible');
    }
    
    // Désactiver le mode placement
    this.pointPlacementMode = false;
    
    // Notifier la désactivation du mode
    this.notificationController.showNotification('Ajout de marqueur annulé.');
    
    // Désactiver les boutons actifs
    const activeButtons = document.querySelectorAll('.marker-option-btn.active');
    activeButtons.forEach(btn => btn.classList.remove('active'));
    
    // Supprimer l'écouteur de clic du SVG si présent
    if (this.mapSvg && this.mapSvg.contentDocument) {
      this.mapSvg.contentDocument.removeEventListener('click', this.handleSvgClickForPointPlacement);
    }
    
    // Supprimer l'écouteur d'événements pour les clics en dehors
    document.removeEventListener('click', this.handleOutsideClick);
    
    // Émettre un événement personnalisé pour signaler l'annulation
    document.dispatchEvent(new CustomEvent('markerPlacementCancelled'));
  };
  
  /**
   * Gère les clics en dehors du formulaire de marqueur
   */
  private handleOutsideClick = (e: MouseEvent): void => {
    const markerOptions = document.querySelector('.marker-options');
    const addCommentBtn = document.querySelector('.add-comment-btn');
    
    // Si le clic est en dehors du panneau d'options et du bouton d'ajout
    if (markerOptions && 
        !markerOptions.contains(e.target as Node) && 
        e.target !== addCommentBtn) {
      
      // Si un formulaire est ouvert, le fermer et annuler le placement
      const form = markerOptions.querySelector('.marker-form');
      if (form) {
        this.handleMarkerFormCancel(e);
      }
    }
  };
  
  /**
   * Définit le type actuel de marqueur
   */
  public setMarkerType(type: MarkerType): void {
    this.currentMarkerType = type;
  }
  
  /**
   * Active ou désactive le mode placement de points
   */
  public setPointPlacementMode(active: boolean): void {
    this.pointPlacementMode = active;
    
    // Ajouter ou supprimer l'écouteur d'événements SVG
    if (this.mapSvg && this.mapSvg.contentDocument) {
      if (active) {
        // Supprimer l'écouteur existant s'il y en a un
        this.mapSvg.contentDocument.removeEventListener('click', this.handleSvgClickForPointPlacement);
        
        // Promouvoir au préalable le formulaire pour saisir les informations du marqueur
        this.showMarkerForm(this.currentMarkerType, (data) => {
          // Une fois le formulaire soumis, activer l'écouteur pour placer le point
          this.newMarkerFormData = data;
          
          // Ajouter un nouvel écouteur
          this.mapSvg.contentDocument!.addEventListener('click', this.handleSvgClickForPointPlacement);
          
          // Notification
          this.notificationController.showNotification('Cliquez sur la carte pour placer le marqueur.');
        });
      } else {
        // Supprimer l'écouteur
        this.mapSvg.contentDocument.removeEventListener('click', this.handleSvgClickForPointPlacement);
        
        // Notification
        this.notificationController.showNotification('Mode placement de points désactivé.');
      }
    }
  }
  
  /**
   * Vérifie si le mode placement de points est actif
   */
  public isPointPlacementModeActive(): boolean {
    return this.pointPlacementMode;
  }
  
  /**
   * Gère les clics sur le SVG pour le placement de points
   */
  private handleSvgClickForPointPlacement = (event: MouseEvent): void => {
    // Arrêter la propagation de l'événement
    event.stopPropagation();
    
    // Vérifier que le groupe de points existe
    if (!this.userPointsGroup) {
      this.initializeMarkerGroup();
      if (!this.userPointsGroup) return;
    }
    
    // Obtenir le document SVG
    const svgDocument = this.mapSvg.contentDocument;
    if (!svgDocument) return;
    
    // Obtenir le root SVG
    const svgRoot = svgDocument.querySelector('svg') as SVGSVGElement;
    if (!svgRoot) return;
    
    // Créer un point SVG aux coordonnées du clic
    const svgPoint = svgRoot.createSVGPoint();
    const ctm = svgRoot.getScreenCTM();
    
    if (ctm) {
      // Convertir les coordonnées de l'écran en coordonnées SVG
      svgPoint.x = event.clientX;
      svgPoint.y = event.clientY;
      const transformedPoint = svgPoint.matrixTransform(ctm.inverse());
      
      // Incrémenter le compteur de points
      this.pointCounter++;
      
      // Créer le marqueur selon le type actuel
      const marker = this.createMarker({
        id: `user-point-${this.pointCounter}`,
        x: transformedPoint.x,
        y: transformedPoint.y,
        type: this.currentMarkerType,
        title: this.newMarkerFormData.title,
        description: this.newMarkerFormData.description
      });
      
      // Ajouter l'animation de "drop"
      const animateTransform = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
      animateTransform.setAttribute('attributeName', 'transform');
      animateTransform.setAttribute('type', 'translate');
      animateTransform.setAttribute('from', `${transformedPoint.x} ${transformedPoint.y - 30}`);
      animateTransform.setAttribute('to', `${transformedPoint.x} ${transformedPoint.y}`);
      animateTransform.setAttribute('dur', '0.4s');
      animateTransform.setAttribute('begin', 'indefinite');
      animateTransform.setAttribute('fill', 'freeze');
      animateTransform.setAttribute('calcMode', 'ease-out');
      marker.appendChild(animateTransform);
      
      // Ajouter le groupe au groupe parent
      this.userPointsGroup.appendChild(marker);
      
      // Démarrer l'animation après que l'élément soit ajouté au DOM
      setTimeout(() => {
        animateTransform.beginElement();
      }, 10);
      
      // Notification
      const typeLabel = this.currentMarkerType === MarkerType.DANGER ? 'de danger' : '';
      this.notificationController.showNotification(`Marqueur ${typeLabel} "${this.newMarkerFormData.title}" ajouté.`);
      
      // Supprimer l'écouteur après avoir placé le point
      svgDocument.removeEventListener('click', this.handleSvgClickForPointPlacement);
      
      // Supprimer l'écouteur pour les clics en dehors du formulaire
      document.removeEventListener('click', this.handleOutsideClick);
      
      // Désactiver le mode placement
      this.pointPlacementMode = false;
      
      // Réinitialiser les données du formulaire
      this.newMarkerFormData = { title: '', description: '' };
      
      // Fermer le panneau d'options
      const markerOptions = document.querySelector('.marker-options');
      if (markerOptions && markerOptions.classList.contains('visible')) {
        markerOptions.classList.remove('visible');
        
        // Désactiver les boutons actifs
        const activeButtons = document.querySelectorAll('.marker-option-btn.active');
        activeButtons.forEach(btn => btn.classList.remove('active'));
      }
      
      // S'assurer que les événements SVG sont correctement rétablis
      if (this.mapSvg && this.mapSvg.contentDocument) {
        this.mapSvg.contentDocument.querySelectorAll('*').forEach(el => {
          (el as HTMLElement).style.pointerEvents = '';
        });
        
        // Réinitialiser le pointeur du SVG
        this.mapSvg.style.pointerEvents = '';
      }
      
      // Émettre un événement personnalisé pour signaler que le point est placé
      // et que les contrôleurs doivent être réactivés
      document.dispatchEvent(new CustomEvent('markerPlaced', { 
        detail: { markerId: marker.id }
      }));
      
      // Supprimer la classe point-placement-mode du conteneur de carte
      if (this.mapContainer) {
        this.mapContainer.classList.remove('point-placement-mode');
      }
    }
  };
  
  /**
   * Crée un élément de marqueur SVG
   */
  private createMarker(options: MarkerOptions): SVGGElement {
    const { id, x, y, type, title, description, color } = options;
    
    // Créer un groupe pour l'icône de localisation
    const markerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    markerGroup.setAttribute('id', id);
    markerGroup.setAttribute('class', `location-marker ${type} ${color || ''}`);
    markerGroup.setAttribute('transform', `translate(${x}, ${y}) translateZ(1px)`);
    markerGroup.setAttribute('style', 'transform-style: preserve-3d;');
    
    // Stocker les informations du marqueur comme attributs de données
    markerGroup.setAttribute('data-title', title);
    markerGroup.setAttribute('data-description', description);
    
    // Créer l'ombre pour l'effet de surélévation
    const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    shadow.setAttribute('cx', '0');
    shadow.setAttribute('cy', '1');
    shadow.setAttribute('rx', '4');
    shadow.setAttribute('ry', '2');
    shadow.setAttribute('fill', 'rgba(0, 0, 0, 0.3)');
    shadow.setAttribute('filter', 'blur(1px)');
    
    // Ajouter l'ombre au groupe
    markerGroup.appendChild(shadow);
    
    // Créer un élément image pour l'icône SVG
    const markerIcon = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    markerIcon.setAttribute('width', '24');
    markerIcon.setAttribute('height', '24');
    markerIcon.setAttribute('x', '-12');
    markerIcon.setAttribute('y', '-24');
    
    // Choisir l'icône en fonction du type de marqueur
    const iconPath = type === MarkerType.DANGER 
      ? this.DANGER_MARKER_ICON 
      : this.INFO_MARKER_ICON;
    
    markerIcon.setAttributeNS(XLINK_NS, 'href', iconPath);
    
    // Ajouter l'icône au groupe
    markerGroup.appendChild(markerIcon);
    
    return markerGroup;
  }
  
  /**
   * Supprime tous les marqueurs
   */
  public clearAllMarkers(): void {
    if (this.userPointsGroup) {
      // Vider le groupe de points
      while (this.userPointsGroup.firstChild) {
        this.userPointsGroup.removeChild(this.userPointsGroup.firstChild);
      }
      
      // Réinitialiser le compteur
      this.pointCounter = 0;
      
      // Notification
      this.notificationController.showNotification('Tous les marqueurs ont été supprimés.');
    }
  }
  
  /**
   * Exporte les marqueurs au format JSON
   */
  public exportMarkers(): string {
    if (!this.userPointsGroup) return '[]';
    
    const markers: SerializedMarker[] = Array.from(this.userPointsGroup.querySelectorAll('.location-marker')).map(marker => {
      // Extraire les coordonnées depuis la transformation
      const transform = marker.getAttribute('transform') || '';
      const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
      const x = match ? parseFloat(match[1]) : 0;
      const y = match ? parseFloat(match[2]) : 0;
      
      // Déterminer le type
      const isDanger = marker.classList.contains('danger');
      
      // Récupérer le titre et la description
      const title = marker.getAttribute('data-title') || 'Sans titre';
      const description = marker.getAttribute('data-description') || 'Sans description';
      
      // Déterminer la couleur
      let color = 'red';
      if (marker.classList.contains('blue')) color = 'blue';
      if (marker.classList.contains('green')) color = 'green';
      if (marker.classList.contains('yellow')) color = 'yellow';
      if (marker.classList.contains('purple')) color = 'purple';
      
      return {
        id: marker.id,
        x,
        y,
        type: isDanger ? 'danger' : 'default',
        title,
        description,
        color
      };
    });
    
    return JSON.stringify(markers, null, 2);
  }
} 