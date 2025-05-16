import { 
  TransformController, 
  DragController, 
  CompassController, 
  UIController, 
  NotificationController,
  MarkerController,
  MarkerType
} from './controllers';
import { UserBubble } from '../users/UserBubble';
import { TrailEditorController } from '../trails/TrailEditorController';

// Définition des modes d'affichage de la carte
export enum MapDisplayMode {
  GRABBING = 'grabbing', // Mode par défaut (zoom, déplacement, rotation)
  FLAT = 'flat',         // Mode plat avec éléments SVG cliquables
  TRAIL_CREATION = 'trail_creation' // Nouveau mode spécifique pour la création de parcours
}

// Définition des modes d'interaction en mode plat
export enum FlatInteractionMode {
  SELECT = 'select',     // Mode sélection (comportement par défaut)
  ADD_POINT = 'add_point' // Mode ajout de points
}

export class MapController {
  // Controllers spécialisés
  private transformController!: TransformController;
  private dragController!: DragController;
  private compassController!: CompassController;
  private uiController!: UIController;
  private notificationController!: NotificationController;
  private markerController!: MarkerController;
  private trailEditorController!: TrailEditorController;

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
    this.markerController = new MarkerController(this.mapSvg, this.notificationController);
    this.trailEditorController = new TrailEditorController(this.mapSvg, this.notificationController);
    
    // Initialiser les fonctionnalités utilisateur
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
        
        // Ajouter le bouton pour placer des points
        this.addPlacePointButton();
        
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
    
    // Ajouter un écouteur pour l'événement de placement de marqueur
    document.addEventListener('markerPlaced', () => {
      // Restaurer la navigation
      this.restoreNavigation();
    });
    
    // Ajouter un écouteur pour l'événement d'annulation de placement de marqueur
    document.addEventListener('markerPlacementCancelled', () => {
      // Restaurer la navigation
      this.restoreNavigation();
    });
    
    // Ajouter les écouteurs pour les événements de création de parcours
    document.addEventListener('trailCreationStarted', () => {
      // Activer le mode création de parcours
      this.setDisplayMode(MapDisplayMode.TRAIL_CREATION);
    });
    
    document.addEventListener('trailCreationFinished', () => {
      // Restaurer la navigation
      this.restoreNavigation();
    });
    
    document.addEventListener('trailCreationCancelled', () => {
      // Restaurer la navigation
      this.restoreNavigation();
    });
  }

  private setupEventListeners(): void {
    // Les contrôleurs spécialisés configurent leurs propres écouteurs d'événements
    this.uiController.setupEventListeners();
    this.dragController.setupEventListeners();
    this.compassController.setupEventListeners();
    
    // Écouter les événements de redimensionnement de la fenêtre
    window.addEventListener('resize', () => {
      // Un événement de redimensionnement est déjà géré par le système
      // Aucune action spécifique supplémentaire n'est nécessaire ici
    });
    
    // Écouteur d'événement pour la création de parcours annulée
    document.addEventListener('trailCreationCancelled', () => {
      console.log('Événement trailCreationCancelled reçu, restauration de la navigation');
      
      // Réinitialiser l'interface pour revenir au mode navigation
      const navigationBtn = document.querySelector('.mode-btn.mode-navigation');
      const trailCreationBtn = document.querySelector('.mode-btn.mode-trail-creation');
      
      if (navigationBtn && trailCreationBtn) {
        navigationBtn.classList.add('active');
        trailCreationBtn.classList.remove('active');
      }
      
      // Restaurer la navigation
      this.restoreNavigation();
    });
  }
  
  private setupSvgElementsEventListeners(): void {
    if (!this.mapSvg) return;
    
    // Accéder au document SVG une fois qu'il est chargé
    const svgDocument = (this.mapSvg as HTMLObjectElement).contentDocument;
    if (!svgDocument) return;
    
    console.log('Initialisation des événements SVG - document chargé');
    
    // Créer un groupe pour contenir les éléments de surbrillance (highlight)
    const svgRoot = svgDocument.querySelector('svg');
    if (!svgRoot) return;
    
    // Vérifier si le groupe de surbrillance existe déjà
    let highlightGroup = svgDocument.getElementById('highlight-layer') as SVGGElement | null;
    if (!highlightGroup) {
      // Créer le groupe de surbrillance s'il n'existe pas
      highlightGroup = document.createElementNS("http://www.w3.org/2000/svg", "g") as SVGGElement;
      highlightGroup.setAttribute('id', 'highlight-layer');
      highlightGroup.setAttribute('class', 'highlight-layer');
      highlightGroup.setAttribute('pointer-events', 'none'); // Le groupe ne capture pas les événements
      
      // Insérer le groupe à la fin du SVG pour qu'il soit au-dessus des autres éléments
      svgRoot.appendChild(highlightGroup);
      
      // Ajouter du CSS au document SVG pour les styles de surbrillance
      const styleElement = document.createElementNS("http://www.w3.org/2000/svg", "style");
      styleElement.textContent = `
        .highlight-element {
          stroke: #3366CC;
          stroke-width: 3px;
          fill: none;
          filter: drop-shadow(0 0 3px rgba(51, 102, 204, 0.5));
          pointer-events: none;
          opacity: 0.7;
        }
        .selected-element {
          stroke: #FF5722;
          stroke-width: 3px;
          stroke-dasharray: 5,3;
          fill: none;
          pointer-events: none;
          opacity: 0.8;
        }
      `;
      svgRoot.appendChild(styleElement);
    }
    
    // S'assurer que highlightGroup n'est pas null à ce stade
    if (!highlightGroup) {
      console.error("Impossible de créer ou trouver le groupe de surbrillance");
      return;
    }
    
    // Fonction pour créer ou mettre à jour un élément de surbrillance
    const createHighlightElement = (sourceElement: Element, isSelected: boolean = false): Element => {
      const elementId = sourceElement.id || '';
      const highlightId = isSelected 
        ? `selected-${elementId || sourceElement.tagName.toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`
        : `highlight-${elementId || sourceElement.tagName.toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Créer un nouvel élément du même type que l'élément source
      const highlightElement = document.createElementNS("http://www.w3.org/2000/svg", sourceElement.tagName);
      highlightElement.setAttribute('id', highlightId);
      highlightElement.setAttribute('class', isSelected ? 'selected-element' : 'highlight-element');
      
      // Copier les attributs pertinents de l'élément source
      if (sourceElement.hasAttribute('d')) {
        highlightElement.setAttribute('d', sourceElement.getAttribute('d') || '');
      }
      if (sourceElement.hasAttribute('points')) {
        highlightElement.setAttribute('points', sourceElement.getAttribute('points') || '');
      }
      if (sourceElement.hasAttribute('cx')) {
        highlightElement.setAttribute('cx', sourceElement.getAttribute('cx') || '');
        highlightElement.setAttribute('cy', sourceElement.getAttribute('cy') || '');
        highlightElement.setAttribute('r', sourceElement.getAttribute('r') || '');
      }
      if (sourceElement.hasAttribute('x')) {
        highlightElement.setAttribute('x', sourceElement.getAttribute('x') || '');
        highlightElement.setAttribute('y', sourceElement.getAttribute('y') || '');
        highlightElement.setAttribute('width', sourceElement.getAttribute('width') || '');
        highlightElement.setAttribute('height', sourceElement.getAttribute('height') || '');
      }
      
      // Stocker une référence à l'élément source
      highlightElement.setAttribute('data-source-id', elementId);
      
      return highlightElement;
    };
    
    // Fonction pour appliquer l'effet de survol sur un élément
    const applyHoverEffect = (element: Element, isHovered: boolean): void => {
      // Identifier l'élément      
      if (isHovered) {
        // Vérifier si l'élément a déjà un effet de survol
        const existingHighlightId = element.getAttribute('data-hover-highlight-id');
        if (existingHighlightId) {
          // L'effet existe déjà, pas besoin de le recréer
          return;
        }
        
        // Créer un nouvel élément de surbrillance
        const highlightElement = createHighlightElement(element);
        
        // Ajouter l'élément au groupe de surbrillance
        highlightGroup!.appendChild(highlightElement);
        
        // Enregistrer l'ID de l'élément de surbrillance sur l'élément original
        element.setAttribute('data-hover-highlight-id', highlightElement.id);
      } else {
        // Récupérer l'ID de l'élément de surbrillance
        const highlightId = element.getAttribute('data-hover-highlight-id');
        if (highlightId) {
          // Supprimer l'élément de surbrillance
          const highlightElement = svgDocument.getElementById(highlightId);
          if (highlightElement && highlightGroup) {
            highlightGroup.removeChild(highlightElement);
          }
          
          // Supprimer l'attribut de l'élément original
          element.removeAttribute('data-hover-highlight-id');
        }
      }
    };
    
    // Fonction pour vérifier si un élément est une aire (avec fill-rule="evenodd")
    const isAreaElement = (element: Element): boolean => {
      // Vérifier si l'élément a l'attribut fill-rule="evenodd"
      const fillRule = element.getAttribute('fill-rule');
      if (fillRule === 'evenodd') {
        return true;
      }
      
      // Vérifier également dans le style inline
      const style = element.getAttribute('style') || '';
      return style.includes('fill-rule:evenodd') || style.includes('fill-rule: evenodd');
    };
    
    // Fonction pour vérifier si un élément est un composant principal à exclure
    const isMainComponent = (element: Element): boolean => {
      // Exclure le SVG lui-même
      if (element.tagName.toLowerCase() === 'svg') {
        return true;
      }
      
      // Exclure le groupe principal
      if (element.tagName.toLowerCase() === 'g' && !element.getAttribute('id')) {
        return true;
      }
      
      // Exclure les éléments par ID ou classe spécifiques
      const id = element.getAttribute('id') || '';
      const className = element.getAttribute('class') || '';
      
      if (id.includes('background') || id.includes('fond') || id.includes('container') || 
          id.includes('main') || id.includes('map') ||
          className.includes('background') || className.includes('container') || 
          className.includes('map-area') || className.includes('main')) {
        return true;
      }
      
      // Exclure les grands rectangles qui couvrent toute la carte (souvent utilisés comme fond)
      if (element.tagName.toLowerCase() === 'rect') {
        // Obtenir les dimensions du SVG pour comparer
        const svgElement = svgDocument.querySelector('svg');
        if (svgElement) {
          const svgWidth = parseFloat(svgElement.getAttribute('width') || '1000');
          const svgHeight = parseFloat(svgElement.getAttribute('height') || '1000');
          
          const width = parseFloat(element.getAttribute('width') || '0');
          const height = parseFloat(element.getAttribute('height') || '0');
          
          // Si le rectangle couvre plus de 80% de la surface du SVG, il s'agit probablement d'un fond
          const svgArea = svgWidth * svgHeight;
          const rectArea = width * height;
          
          if (rectArea > 0.8 * svgArea) {
            return true;
          }
          
          // Si le rectangle est positionné à (0,0) et qu'il est assez grand
          const x = parseFloat(element.getAttribute('x') || '0');
          const y = parseFloat(element.getAttribute('y') || '0');
          
          if (x === 0 && y === 0 && width > 0.5 * svgWidth && height > 0.5 * svgHeight) {
            return true;
          }
        }
      }
      
      return false;
    };
    
    // Trouver tous les éléments cliquables (par exemple, les chemins, rectangles, etc.)
    const svgElements = svgDocument.querySelectorAll('path, rect, circle, polygon, polyline');
    console.log('Nombre d\'éléments SVG trouvés:', svgElements.length);
    
    // Ajouter des écouteurs de survol pour les éléments en mode plat
    svgElements.forEach((element) => {
      // Ne pas rendre cliquable les aires (avec fill-rule="evenodd")
      if (isAreaElement(element)) {
        (element as unknown as HTMLElement).style.pointerEvents = 'none';
        return;
      }
      
      // Ne pas rendre cliquable les composants principaux
      if (isMainComponent(element)) {
        (element as unknown as HTMLElement).style.pointerEvents = 'none';
        return;
      }
      
      // Rendre l'élément cliquable
      (element as unknown as HTMLElement).style.pointerEvents = 'auto';
      
      element.addEventListener('mouseenter', (e) => {
        // Vérifier si l'événement provient bien de l'élément lui-même et non d'un parent
        if (e.target !== element) {
          return;
        }
        
        // Appliquer l'effet de survol UNIQUEMENT en mode création de parcours
        if (this.displayMode === MapDisplayMode.TRAIL_CREATION) {
          applyHoverEffect(element, true);
        }
      });
      
      element.addEventListener('mouseleave', (e) => {
        // Vérifier si l'événement provient bien de l'élément lui-même et non d'un parent
        if (e.target !== element) {
          return;
        }
        
        // Retirer l'effet de survol UNIQUEMENT en mode création de parcours
        if (this.displayMode === MapDisplayMode.TRAIL_CREATION) {
          applyHoverEffect(element, false);
        }
      });
      
      element.addEventListener('click', (e) => {
        // Vérifier si l'événement provient bien de l'élément lui-même et non d'un parent
        if (e.target !== element) {
          return;
        }
        
        // Traiter différemment selon le mode
        if (this.displayMode === MapDisplayMode.FLAT) {
          // En mode interaction plat, juste sélectionner l'élément
          e.stopPropagation();
          
          const elementId = element.id || 'sans-id';
          const elementType = element.tagName;
          
          this.notificationController.showNotification(`Élément ${elementType}#${elementId} sélectionné`);
        } 
        else if (this.displayMode === MapDisplayMode.TRAIL_CREATION) {
          // En mode création de parcours, gérer la sélection pour le parcours
          e.stopPropagation();
          
          const elementId = element.id || 'sans-id';
          const elementType = element.tagName;
          
          // Ne pas appliquer directement les effets visuels ici
          // Laisser le TrailEditorController gérer à la fois le modèle de données et l'affichage
          
          // Récupérer les données de l'élément pour le parcours
          const elementData = {
            id: elementId,
            type: elementType,
            element: element
          };
          
          // Émettre un événement pour le contrôleur de parcours
          // Le TrailEditorController décidera s'il faut ajouter ou supprimer l'élément
          document.dispatchEvent(new CustomEvent('svgElementSelectedForTrail', { 
            detail: { element: elementData }
          }));
        }
      });
    });
    
    // Ajouter un gestionnaire global pour annuler les événements de fond
    svgDocument.addEventListener('mouseenter', (e) => {
      // Si l'événement est sur le SVG lui-même ou un élément de fond, annuler tous les effets de survol
      if (e.target === svgDocument || isMainComponent(e.target as Element)) {
        // Supprimer tous les effets de survol existants
        const highlightElements = highlightGroup!.querySelectorAll('.highlight-element');
        highlightElements.forEach(highlight => {
          highlightGroup!.removeChild(highlight);
        });
      }
    });
  }
  
  /**
   * Ajoute le bouton de placement de points dans la barre d'outils
   */
  private addPlacePointButton(): void {
    // Créer la barre d'outils de commentaires en bas à droite
    const commentsToolbar = document.createElement('div');
    commentsToolbar.className = 'comments-toolbar';
    
    // Créer le bouton principal "Ajouter un commentaire"
    const addCommentBtn = document.createElement('button');
    addCommentBtn.className = 'add-comment-btn';
    addCommentBtn.title = 'Ajouter un commentaire';
    addCommentBtn.innerHTML = '<i class="fas fa-comment-alt"></i>';
    
    // Si FontAwesome n'est pas disponible, utiliser un emoji
    if (!document.querySelector('link[href*="font-awesome"]')) {
      addCommentBtn.innerHTML = '💬';
    }
    
    // Créer le panneau d'options de marqueurs (initialement caché)
    const markerOptions = document.createElement('div');
    markerOptions.className = 'marker-options';
    
    // Ajouter un titre au panneau
    const optionsTitle = document.createElement('div');
    optionsTitle.className = 'marker-options-title';
    optionsTitle.textContent = 'Ajouter un commentaire';
    markerOptions.appendChild(optionsTitle);
    
    // Créer le bouton pour les marqueurs d'information
    const infoMarkerBtn = document.createElement('button');
    infoMarkerBtn.className = 'marker-option-btn marker-option-info';
    infoMarkerBtn.title = 'Ajouter un point d\'information sur la carte';
    infoMarkerBtn.innerHTML = `
      <div class="marker-option-icon">
        <i class="fas fa-map-marker-alt"></i>
      </div>
      <div class="marker-option-label">
        Information
      </div>
    `;
    
    // Si FontAwesome n'est pas disponible
    if (!document.querySelector('link[href*="font-awesome"]')) {
      infoMarkerBtn.innerHTML = `
        <div class="marker-option-icon">
          📍
        </div>
        <div class="marker-option-label">
          Information
        </div>
      `;
    }
    
    // Créer le bouton pour les marqueurs de danger
    const dangerMarkerBtn = document.createElement('button');
    dangerMarkerBtn.className = 'marker-option-btn marker-option-danger';
    dangerMarkerBtn.title = 'Ajouter un point de danger sur la carte';
    dangerMarkerBtn.innerHTML = `
      <div class="marker-option-icon">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <div class="marker-option-label">
        Danger
      </div>
    `;
    
    // Si FontAwesome n'est pas disponible
    if (!document.querySelector('link[href*="font-awesome"]')) {
      dangerMarkerBtn.innerHTML = `
        <div class="marker-option-icon">
          ⚠️
        </div>
        <div class="marker-option-label">
          Danger
        </div>
      `;
    }
    
    // Ajouter les boutons au panneau d'options
    markerOptions.appendChild(infoMarkerBtn);
    markerOptions.appendChild(dangerMarkerBtn);
    
    // Ajouter un écouteur pour le bouton principal
    addCommentBtn.addEventListener('click', () => {
      markerOptions.classList.toggle('visible');
      
      // Si le panneau est fermé, désactiver le mode placement
      if (!markerOptions.classList.contains('visible')) {
        infoMarkerBtn.classList.remove('active');
        dangerMarkerBtn.classList.remove('active');
        this.setPointPlacementMode(false);
      }
    });
    
    // Ajouter les écouteurs pour les boutons d'options
    infoMarkerBtn.addEventListener('click', () => {
      // Basculer l'état actif
      const wasActive = infoMarkerBtn.classList.contains('active');
      
      // Désactiver tous les boutons
      infoMarkerBtn.classList.remove('active');
      dangerMarkerBtn.classList.remove('active');
      
      // Si le bouton n'était pas actif, l'activer
      if (!wasActive) {
        infoMarkerBtn.classList.add('active');
        this.markerController.setMarkerType(MarkerType.DEFAULT);
        this.setPointPlacementMode(true);
      } else {
        // Sinon, désactiver le mode placement
        this.setPointPlacementMode(false);
      }
    });
    
    dangerMarkerBtn.addEventListener('click', () => {
      // Basculer l'état actif
      const wasActive = dangerMarkerBtn.classList.contains('active');
      
      // Désactiver tous les boutons
      infoMarkerBtn.classList.remove('active');
      dangerMarkerBtn.classList.remove('active');
      
      // Si le bouton n'était pas actif, l'activer
      if (!wasActive) {
        dangerMarkerBtn.classList.add('active');
        this.markerController.setMarkerType(MarkerType.DANGER);
        this.setPointPlacementMode(true);
          } else {
        // Sinon, désactiver le mode placement
        this.setPointPlacementMode(false);
      }
    });
    
    // Ajouter les éléments au DOM
    commentsToolbar.appendChild(markerOptions);
    commentsToolbar.appendChild(addCommentBtn);
    
    // Ajouter la barre d'outils au conteneur de la carte
    if (this.mapContainer) {
      this.mapContainer.appendChild(commentsToolbar);
    }
    
    // Fermer le panneau en cliquant en dehors
    document.addEventListener('click', (e) => {
      if (markerOptions.classList.contains('visible') && 
          !markerOptions.contains(e.target as Node) && 
          e.target !== addCommentBtn) {
        markerOptions.classList.remove('visible');
      }
    });
  }
  
  private addModeSelector(): void {
    if (!this.mapContainer) return;
    
    // Créer le conteneur pour les boutons de mode
    const modeSwitcher = document.createElement('div');
    modeSwitcher.className = 'map-mode-switcher';
    
    // Créer le bouton pour le mode navigation
    const navigationBtn = document.createElement('button');
    navigationBtn.className = 'mode-btn mode-navigation active';
    navigationBtn.title = 'Mode navigation - Permet de déplacer, zoomer et pivoter la carte';
    navigationBtn.innerHTML = `
      <img src="/assets/icons/hand-cursor.svg" alt="Main" class="mode-icon" />
      <span>Navigation</span>
    `;
    
    // Créer le bouton pour le mode interaction
    const interactionBtn = document.createElement('button');
    interactionBtn.className = 'mode-btn mode-interaction';
    interactionBtn.title = 'Mode interaction - Permet d\'interagir avec les éléments de la carte';
    interactionBtn.innerHTML = `
      <img src="/assets/icons/pointer-cursor.svg" alt="Curseur" class="mode-icon" />
      <span>Interaction</span>
    `;
    
    // Créer le bouton pour le mode création de parcours
    const trailCreationBtn = document.createElement('button');
    trailCreationBtn.className = 'mode-btn mode-trail-creation';
    trailCreationBtn.title = 'Mode création de parcours - Permet de créer un parcours en sélectionnant des éléments';
    trailCreationBtn.innerHTML = `
      <img src="/assets/icons/trail-run.svg" alt="Parcours" class="mode-icon" />
      <span>Créer parcours</span>
    `;
    
    // Ajouter les boutons au conteneur
    modeSwitcher.appendChild(navigationBtn);
    modeSwitcher.appendChild(interactionBtn);
    modeSwitcher.appendChild(trailCreationBtn);
    
    // Ajouter le conteneur au conteneur de la carte
    this.mapContainer.appendChild(modeSwitcher);
    
    // Configurer les écouteurs d'événements
    navigationBtn.addEventListener('click', () => {
      if (!navigationBtn.classList.contains('active')) {
        // Fermer l'éditeur de parcours s'il est ouvert
        this.trailEditorController.setTrailEditorMode(false);
        
        // Activer le mode navigation
        navigationBtn.classList.add('active');
        interactionBtn.classList.remove('active');
        trailCreationBtn.classList.remove('active');
        this.setDisplayMode(MapDisplayMode.GRABBING);
      }
    });
    
    interactionBtn.addEventListener('click', () => {
      if (!interactionBtn.classList.contains('active')) {
        // Fermer l'éditeur de parcours s'il est ouvert
        this.trailEditorController.setTrailEditorMode(false);
        
        // Activer le mode interaction
        interactionBtn.classList.add('active');
        navigationBtn.classList.remove('active');
        trailCreationBtn.classList.remove('active');
        this.setDisplayMode(MapDisplayMode.FLAT);
      }
    });
    
    trailCreationBtn.addEventListener('click', () => {
      if (!trailCreationBtn.classList.contains('active')) {
        // Activer le mode création de parcours
        trailCreationBtn.classList.add('active');
        navigationBtn.classList.remove('active');
        interactionBtn.classList.remove('active');
        
        // Lancer la création d'un parcours
        this.trailEditorController.setTrailEditorMode(true);
      }
    });
  }
  
  /**
   * Active ou désactive le mode placement de points
   */
  private setPointPlacementMode(active: boolean): void {
    // Ajouter ou supprimer la classe du conteneur de la carte
    if (this.mapContainer) {
      if (active) {
        this.mapContainer.classList.add('point-placement-mode');
        
        // S'assurer que les événements SVG sont autorisés
        if (this.mapSvg) {
          this.mapSvg.style.pointerEvents = 'auto';
          
          // Désactiver les interactions avec tous les éléments SVG sauf le groupe racine
          // pour éviter les conflits entre événements
          if (this.mapSvg.contentDocument) {
            const svgElements = this.mapSvg.contentDocument.querySelectorAll('path, rect, circle, polygon, polyline');
            svgElements.forEach(el => {
              (el as HTMLElement).style.pointerEvents = 'none';
            });
            
            // Le document SVG lui-même doit accepter les clics
            const svgRoot = this.mapSvg.contentDocument.querySelector('svg');
            if (svgRoot) {
              (svgRoot as unknown as HTMLElement).style.pointerEvents = 'auto';
            }
          }
        }
        
        // Désactiver tous les autres modes d'interaction
        this.dragController.setEnabled(false);
        this.compassController.setEnabled(false);
        
        // Si on était en mode interaction, forcer temporairement le mode navigation
        // pour éviter les conflits entre les interactions SVG
        if (this.displayMode === MapDisplayMode.FLAT) {
          // Ne pas modifier l'état visuel des boutons, seulement le comportement interne
          this.displayMode = MapDisplayMode.GRABBING;
        }
      } else {
        this.mapContainer.classList.remove('point-placement-mode');
        
        // Fermer le panneau d'options
        const markerOptions = document.querySelector('.marker-options');
        if (markerOptions && markerOptions.classList.contains('visible')) {
          markerOptions.classList.remove('visible');
        }
        
        // Désactiver les boutons actifs
        const activeButtons = document.querySelectorAll('.marker-option-btn.active');
        activeButtons.forEach(btn => btn.classList.remove('active'));
        
        // Restaurer le mode d'interaction précédent
        this.restoreNavigation();
      }
    }
    
    // Déléguer le reste de la gestion au MarkerController
    this.markerController.setPointPlacementMode(active);
  }
  
  /**
   * Restaure la navigation après certaines actions
   */
  private restoreNavigation(): void {
    // Vérifier l'état des boutons mode pour déterminer quel mode doit être actif
    const navigationBtn = document.querySelector('.mode-btn.mode-navigation');
    const interactionBtn = document.querySelector('.mode-btn.mode-interaction');
    const trailCreationBtn = document.querySelector('.mode-btn.mode-trail-creation');
    
    // Désactiver le mode création de parcours
    this.trailEditorController.setTrailEditorMode(false);
    
    // Déterminer le mode à utiliser en fonction des boutons actifs
    let targetMode = MapDisplayMode.GRABBING;
    
    if (navigationBtn && interactionBtn && trailCreationBtn) {
      if (interactionBtn.classList.contains('active')) {
        targetMode = MapDisplayMode.FLAT;
      } else if (trailCreationBtn.classList.contains('active')) {
        targetMode = MapDisplayMode.GRABBING; // Revenir au mode navigation par défaut
        
        // Mettre à jour les classes des boutons
        navigationBtn.classList.add('active');
        trailCreationBtn.classList.remove('active');
      }
    }
    
    // Appliquer le mode approprié
    this.setDisplayMode(targetMode);
    
    // S'assurer que les classes sont retirées
    if (this.mapContainer) {
      this.mapContainer.classList.remove('point-placement-mode');
      this.mapContainer.classList.remove('trail-creation-mode');
    }
    
    // Notification pour confirmer la restauration
    if (targetMode === MapDisplayMode.GRABBING) {
      this.notificationController.showNotification('Mode navigation actif. Vous pouvez à nouveau déplacer et pivoter la carte.');
    } else {
      this.notificationController.showNotification('Mode interaction actif. Les éléments de la carte sont à nouveau cliquables.');
    }
  }
  
  /**
   * Change le mode d'interaction en mode plat
   */
  public setFlatInteractionMode(mode: FlatInteractionMode): void {    
    // Mettre à jour le curseur et l'interface en fonction du mode
    if (this.mapContainer) {
      // Supprimer les classes existantes
      this.mapContainer.classList.remove('interaction-select', 'interaction-add-point');
      
      // Ajouter la classe correspondant au mode actuel
      this.mapContainer.classList.add(`interaction-${mode}`);
      
      // Appliquer des comportements spécifiques selon le mode
      switch (mode) {
        case FlatInteractionMode.SELECT:
          this.notificationController.showNotification('Mode sélection activé. Cliquez sur les éléments pour les sélectionner.');
          break;
          
        case FlatInteractionMode.ADD_POINT:
          this.notificationController.showNotification('Mode ajout de points activé. Cliquez sur la carte pour ajouter des points.');
          break;
      }
    }
  }
  
  /**
   * Change le mode d'affichage de la carte
   */
  public setDisplayMode(mode: MapDisplayMode): void {
    console.log('Changement de mode d\'affichage:', this.displayMode, '->', mode);
    this.displayMode = mode;
    
    // Mettre à jour l'affichage en fonction du mode
    if (this.mapContainer && this.mapSvg) {
      // Supprimer les classes existantes
      this.mapContainer.classList.remove('mode-grabbing', 'mode-flat', 'mode-trail-creation');
      
      // Ajouter la classe correspondant au mode actuel
      this.mapContainer.classList.add(`mode-${mode}`);
      
      // Informer les contrôleurs du changement de mode
      this.dragController.setDisplayMode(mode);
      this.uiController.setDisplayMode(mode);
      this.compassController.setDisplayMode(mode);
      
      if (mode === MapDisplayMode.FLAT) {
        console.log('Configuration du mode FLAT');
        // En mode plat, réinitialiser l'inclinaison
        this.transformController.setFlatMode(true);
        
        // Activer les interactions avec le SVG
        this.mapSvg.style.pointerEvents = 'auto';
        
        // Si le document SVG est chargé, s'assurer que tous les éléments sont interactifs
        if (this.mapSvg.contentDocument) {
          const svgDocument = this.mapSvg.contentDocument;
          const svgElements = svgDocument.querySelectorAll('path, rect, circle, polygon, polyline');
          
          console.log('Mode FLAT: configuration de', svgElements.length, 'éléments SVG');
          
          // Fonction pour vérifier si un élément est une aire (avec fill-rule="evenodd")
          const isAreaElement = (element: Element): boolean => {
            // Vérifier si l'élément a l'attribut fill-rule="evenodd"
            const fillRule = element.getAttribute('fill-rule');
            if (fillRule === 'evenodd') {
              return true;
            }
            
            // Vérifier également dans le style inline
            const style = element.getAttribute('style') || '';
            return style.includes('fill-rule:evenodd') || style.includes('fill-rule: evenodd');
          };
          
          // Rendre tous les éléments SVG cliquables
          svgElements.forEach((element) => {
            // Ignorer les éléments qui représentent des aires (avec fill-rule="evenodd")
            if (isAreaElement(element)) {
              // Désactiver les interactions pour ces éléments
              (element as HTMLElement).style.pointerEvents = 'none';
              return;
            }
            
            // Rendre l'élément cliquable
            (element as HTMLElement).style.pointerEvents = 'auto';
          });
        }
        
        // Réinitialiser le mode d'interaction par défaut
        this.setFlatInteractionMode(FlatInteractionMode.SELECT);
        
        // Afficher une notification pour indiquer le changement de mode
        this.notificationController.showNotification('Mode interaction activé. Les éléments de la carte sont cliquables.');
      } 
      else if (mode === MapDisplayMode.TRAIL_CREATION) {
        console.log('Configuration du mode TRAIL_CREATION');
        // En mode création de parcours, mettre la carte à plat
        this.transformController.setFlatMode(true);
        
        // Activer les interactions avec le SVG
        this.mapSvg.style.pointerEvents = 'auto';
        
        // Si le document SVG est chargé, s'assurer que tous les éléments sont interactifs
        if (this.mapSvg.contentDocument) {
          const svgDocument = this.mapSvg.contentDocument;
          const svgElements = svgDocument.querySelectorAll('path, rect, circle, polygon, polyline');
          
          console.log('Mode TRAIL_CREATION: configuration de', svgElements.length, 'éléments SVG');
          
          // Fonction pour vérifier si un élément est une aire (avec fill-rule="evenodd")
          const isAreaElement = (element: Element): boolean => {
            // Vérifier si l'élément a l'attribut fill-rule="evenodd"
            const fillRule = element.getAttribute('fill-rule');
            if (fillRule === 'evenodd') {
              return true;
            }
            
            // Vérifier également dans le style inline
            const style = element.getAttribute('style') || '';
            return style.includes('fill-rule:evenodd') || style.includes('fill-rule: evenodd');
          };
          
          // Rendre tous les éléments SVG cliquables
          svgElements.forEach((element) => {
            // Ignorer les éléments qui représentent des aires (avec fill-rule="evenodd")
            if (isAreaElement(element)) {
              // Désactiver les interactions pour ces éléments
              (element as HTMLElement).style.pointerEvents = 'none';
              return;
            }
            
            // Assurer que l'élément est cliquable
            (element as HTMLElement).style.pointerEvents = 'auto';
            
            // Maintenir les effets de sélection pour les éléments déjà sélectionnés
            if (!element.hasAttribute('data-selected-for-trail')) {
              // Assurer que les propriétés de stroke sont normales
              if (element.hasAttribute('data-original-stroke')) {
                const originalStroke = element.getAttribute('data-original-stroke');
                if (originalStroke) {
                  element.setAttribute('stroke', originalStroke);
                } else {
                  element.removeAttribute('stroke');
                }
                element.removeAttribute('data-original-stroke');
              }
              
              if (element.hasAttribute('data-original-stroke-width')) {
                const originalStrokeWidth = element.getAttribute('data-original-stroke-width');
                if (originalStrokeWidth) {
                  element.setAttribute('stroke-width', originalStrokeWidth);
                } else {
                  element.removeAttribute('stroke-width');
                }
                element.removeAttribute('data-original-stroke-width');
              }
              
              // S'assurer que le fill est également restauré
              if (element.hasAttribute('data-original-fill')) {
                const originalFill = element.getAttribute('data-original-fill');
                if (originalFill) {
                  element.setAttribute('fill', originalFill);
      } else {
                  element.removeAttribute('fill');
                }
                element.removeAttribute('data-original-fill');
              }
            }
          });
        }
        
        // Désactiver les contrôleurs de déplacement
        this.dragController.setEnabled(false);
        this.compassController.setEnabled(false);
        
        // Afficher une notification pour indiquer le changement de mode
        this.notificationController.showNotification('Mode création de parcours activé. Sélectionnez des éléments sur la carte pour créer votre parcours.');
      }
      else {
        console.log('Configuration du mode GRABBING');
        // En mode grabbing, restaurer l'inclinaison par défaut
        this.transformController.setFlatMode(false);
        
        // Désactiver les interactions avec le SVG pour permettre le drag & drop
        this.mapSvg.style.pointerEvents = 'none';
        
        // Activer les contrôleurs de déplacement
        this.dragController.setEnabled(true);
        this.compassController.setEnabled(true);
        
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
  
  /**
   * Retourne le contrôleur d'édition de parcours
   */
  public getTrailEditorController(): TrailEditorController {
    return this.trailEditorController;
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