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

// Définition des modes d'affichage de la carte
export enum MapDisplayMode {
  GRABBING = 'grabbing', // Mode par défaut (zoom, déplacement, rotation)
  FLAT = 'flat'          // Mode plat avec éléments SVG cliquables
}

// Définition des modes d'interaction en mode plat
export enum FlatInteractionMode {
  SELECT = 'select',    // Mode sélection (comportement par défaut)
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

  // Éléments DOM
  private mapContainer: HTMLElement | null = null;
  private mapView: HTMLElement | null = null;
  private mapSvg: HTMLObjectElement | null = null;
  
  // Mode d'affichage actuel
  private displayMode: MapDisplayMode = MapDisplayMode.GRABBING;
  
  // Mode d'interaction en mode plat
  private flatInteractionMode: FlatInteractionMode = FlatInteractionMode.SELECT;

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
    
    // Fonction utilitaire pour appliquer une couleur à un élément SVG
    const applyHoverEffect = (element: Element, active: boolean) => {
      // Si l'effet est activé
      if (active) {
        // Stocker les valeurs originales si ce n'est pas déjà fait
        if (!element.hasAttribute('data-original-fill')) {
          element.setAttribute('data-original-fill', element.getAttribute('fill') || '');
        }
        if (!element.hasAttribute('data-original-stroke')) {
          element.setAttribute('data-original-stroke', element.getAttribute('stroke') || '');
        }
        if (!element.hasAttribute('data-original-style')) {
          element.setAttribute('data-original-style', element.getAttribute('style') || '');
        }
        
        // Appliquer les couleurs de survol
        element.setAttribute('fill', 'rgba(100, 149, 237, 0.5)');
        element.setAttribute('stroke', '#3366CC');
        element.setAttribute('stroke-width', '2');
        
        // Mettre à jour le style inline si présent
        const currentStyle = element.getAttribute('style') || '';
        const newStyle = currentStyle
          .replace(/fill:[^;]+;?/g, '')
          .replace(/stroke:[^;]+;?/g, '')
          .replace(/stroke-width:[^;]+;?/g, '')
          + `fill:rgba(100, 149, 237, 0.5);stroke:#3366CC;stroke-width:2;`;
        
        element.setAttribute('style', newStyle);
      } else {
        // Restaurer les valeurs originales
        const originalFill = element.getAttribute('data-original-fill');
        const originalStroke = element.getAttribute('data-original-stroke');
        const originalStyle = element.getAttribute('data-original-style');
        
        // Restaurer les attributs originaux
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
        
        if (originalStyle) {
          element.setAttribute('style', originalStyle);
        } else {
          element.removeAttribute('style');
        }
        
        // Nettoyer les attributs de données
        element.removeAttribute('data-original-fill');
        element.removeAttribute('data-original-stroke');
        element.removeAttribute('data-original-style');
      }
    };
    
    // Trouver tous les éléments cliquables (par exemple, les chemins, rectangles, etc.)
    const svgElements = svgDocument.querySelectorAll('path, rect, circle, polygon, polyline');
    
    // Ajouter des écouteurs de survol pour les éléments en mode plat
    svgElements.forEach((element) => {
      // Rendre l'élément cliquable
      (element as HTMLElement).style.pointerEvents = 'auto';
      
      element.addEventListener('mouseenter', () => {
        if (this.displayMode === MapDisplayMode.FLAT) {
          applyHoverEffect(element, true);
        }
      });
      
      element.addEventListener('mouseleave', () => {
        if (this.displayMode === MapDisplayMode.FLAT) {
          applyHoverEffect(element, false);
        }
      });
      
      element.addEventListener('click', (e) => {
        // Ne traiter le clic que si on est en mode plat
        if (this.displayMode === MapDisplayMode.FLAT) {
          // Empêcher la propagation de l'événement
          e.stopPropagation();
          
          // Récupérer l'ID ou d'autres attributs de l'élément
          const elementId = element.id || 'sans-id';
          const elementType = element.tagName;
          
          // Afficher une notification pour indiquer l'élément cliqué
          this.notificationController.showNotification(`Élément ${elementType}#${elementId} sélectionné`);
        }
      });
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
    
    // Ajouter les boutons au conteneur
    modeSwitcher.appendChild(navigationBtn);
    modeSwitcher.appendChild(interactionBtn);
    
    // Ajouter le conteneur au conteneur de la carte
    this.mapContainer.appendChild(modeSwitcher);
    
    // Configurer les écouteurs d'événements
    navigationBtn.addEventListener('click', () => {
      if (!navigationBtn.classList.contains('active')) {
        // Activer le mode navigation
        navigationBtn.classList.add('active');
        interactionBtn.classList.remove('active');
        this.setDisplayMode(MapDisplayMode.GRABBING);
      }
    });
    
    interactionBtn.addEventListener('click', () => {
      if (!interactionBtn.classList.contains('active')) {
        // Activer le mode interaction
        interactionBtn.classList.add('active');
        navigationBtn.classList.remove('active');
        this.setDisplayMode(MapDisplayMode.FLAT);
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
   * Restaure la navigation après le placement d'un marqueur
   */
  private restoreNavigation(): void {
    // Vérifier l'état des boutons mode pour déterminer quel mode doit être actif
    const navigationBtn = document.querySelector('.mode-btn.mode-navigation');
    const interactionBtn = document.querySelector('.mode-btn.mode-interaction');
    
    // Déterminer le mode à utiliser en fonction des boutons actifs
    let shouldUseNavigationMode = true;
    if (navigationBtn && interactionBtn) {
      shouldUseNavigationMode = navigationBtn.classList.contains('active');
    }
    
    // Appliquer le mode approprié
    if (shouldUseNavigationMode) {
      // Réactiver les contrôleurs de navigation
      this.dragController.setEnabled(true);
      this.compassController.setEnabled(true);
      
      // S'assurer que les événements SVG sont bien configurés pour le mode navigation
      if (this.mapSvg) {
        this.mapSvg.style.pointerEvents = 'none';
      }
      
      // Forcer une réinitialisation complète du mode navigation
      this.setDisplayMode(MapDisplayMode.GRABBING);
      
      // S'assurer que la classe point-placement-mode est retirée
      if (this.mapContainer) {
        this.mapContainer.classList.remove('point-placement-mode');
      }
      
      // Notification pour confirmer la restauration
      this.notificationController.showNotification('Mode navigation actif. Vous pouvez à nouveau déplacer et pivoter la carte.');
    } else {
      // Restaurer le mode interaction
      this.setDisplayMode(MapDisplayMode.FLAT);
      
      // Notification pour confirmer la restauration
      this.notificationController.showNotification('Mode interaction actif. Les éléments de la carte sont à nouveau cliquables.');
    }
  }
  
  /**
   * Change le mode d'interaction en mode plat
   */
  public setFlatInteractionMode(mode: FlatInteractionMode): void {
    this.flatInteractionMode = mode;
    
    // Mettre à jour le curseur et l'interface en fonction du mode
    if (this.mapContainer) {
      // Supprimer les classes existantes
      this.mapContainer.classList.remove('interaction-select', 'interaction-add-point');
      
      // Ajouter la classe correspondant au mode actuel
      this.mapContainer.classList.add(`interaction-${mode}`);
      
      // Afficher une notification pour indiquer le changement de mode
      if (mode === FlatInteractionMode.SELECT) {
        this.notificationController.showNotification('Mode sélection activé. Cliquez sur les éléments pour les sélectionner.');
      } else if (mode === FlatInteractionMode.ADD_POINT) {
        this.notificationController.showNotification('Mode ajout de points activé. Cliquez sur la carte pour ajouter des points.');
      }
    }
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
        
        // Activer les interactions avec le SVG
        this.mapSvg.style.pointerEvents = 'auto';
        
        // Si le document SVG est chargé, s'assurer que tous les éléments sont interactifs
        if (this.mapSvg.contentDocument) {
          const svgDocument = this.mapSvg.contentDocument;
          const svgElements = svgDocument.querySelectorAll('path, rect, circle, polygon, polyline');
          
          // Rendre tous les éléments SVG cliquables
          svgElements.forEach((element) => {
            (element as HTMLElement).style.pointerEvents = 'auto';
          });
        }
        
        // Réinitialiser le mode d'interaction par défaut
        this.setFlatInteractionMode(FlatInteractionMode.SELECT);
        
        // Afficher une notification pour indiquer le changement de mode
        this.notificationController.showNotification('Mode interaction activé. Les éléments de la carte sont cliquables.');
      } else {
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