import './TrailEditor.css';
import { NotificationController } from '../map/controllers/NotificationController';
import { TrailEditorMode, TrailDifficulty, TrailType } from './TrailEditorTypes';

// Interface pour les éléments SVG sélectionnés
interface SelectedSvgElement {
  id: string;
  type: string;
  element: Element;
  order: number;
  // Attributs géométriques
  d?: string;           // Pour les chemins (path)
  points?: string;      // Pour les polygones/polylines
  cx?: string | number; // Pour les cercles (centre x)
  cy?: string | number; // Pour les cercles (centre y)
  r?: string | number;  // Pour les cercles (rayon)
  x?: string | number;  // Pour les rectangles (position x)
  y?: string | number;  // Pour les rectangles (position y)
  width?: string | number; // Pour les rectangles (largeur)
  height?: string | number; // Pour les rectangles (hauteur)
}

// Interface pour un parcours éditable
interface EditableTrail {
  id: string;
  name: string;
  description: string;
  color: string;
  svgElements: SelectedSvgElement[];
  isComplete: boolean;
  distance?: number;
  difficulty: TrailDifficulty;
  type: string;
}

export class TrailEditorController {
  // Référence à l'élément SVG
  private mapSvg: HTMLObjectElement;
  
  // Contrôleur de notifications
  private notificationController: NotificationController;
  
  // Mode d'édition actuel
  private editorMode: TrailEditorMode = TrailEditorMode.VIEW;
  
  // Parcours en cours d'édition
  private currentTrail: EditableTrail | null = null;
  
  // Référence au conteneur de l'éditeur
  private editorContainer: HTMLElement | null = null;

  constructor(mapSvg: HTMLObjectElement, notificationController: NotificationController) {
    this.mapSvg = mapSvg;
    this.notificationController = notificationController;
    
    // Créer le conteneur de l'éditeur de parcours
    this.createEditorUI();
    
    console.log('TrailEditorController initialisé, configuration de l\'écouteur d\'événements');
    
    // Configurer l'écouteur pour la sélection d'éléments SVG
    document.addEventListener('svgElementSelectedForTrail', ((e: Event) => {
      const customEvent = e as CustomEvent;
      console.log('Événement svgElementSelectedForTrail reçu:', customEvent.detail);
      this.handleSvgElementSelected(customEvent.detail.element);
    }) as EventListener);

    // Configurer l'écouteur pour les événements clavier
    document.addEventListener('keydown', this.handleKeyDown);
  }
  
  /**
   * Gère la sélection d'un élément SVG pour le parcours
   */
  private handleSvgElementSelected(elementData: { id: string, type: string, element: Element }): void {
    // Vérifier qu'on est bien en mode création et qu'il y a un parcours actif
    if (this.editorMode !== TrailEditorMode.CREATE || !this.currentTrail) {
      // Si aucun parcours n'est actif, en démarrer un
      this.startTrailCreation();
    }
    
    // Vérifier à nouveau que le parcours est créé
    if (!this.currentTrail) {
      console.error('Impossible de créer un parcours, annulation de la sélection');
      return;
    }
    
    console.log('Traitement de la sélection d\'élément SVG:', elementData.id, elementData.type);
    
    // L'élément lui-même indique déjà s'il est sélectionné via l'attribut data-selected-for-trail
    const isAlreadySelected = elementData.element.hasAttribute('data-selected-for-trail');
    console.log('Élément déjà sélectionné?', isAlreadySelected);
    
    if (isAlreadySelected) {
      // Si l'élément est déjà sélectionné, on le retire du parcours
      console.log('Suppression de l\'élément du parcours');
      
      // Trouver l'index de l'élément dans le tableau
      const existingIndex = this.currentTrail.svgElements.findIndex(
        elem => elem.id === elementData.id && elem.type === elementData.type
      );
      
      if (existingIndex !== -1) {
        // Supprimer l'élément du tableau
        this.currentTrail.svgElements.splice(existingIndex, 1);
        
        // Mettre à jour l'ordre des éléments restants
        this.currentTrail.svgElements.forEach((elem, idx) => {
          elem.order = idx;
        });
      }
      
      // Enlever l'effet visuel de sélection
      this.removeSelectionEffect(elementData.element);
      
      this.notificationController.showNotification(`Élément #${elementData.id} retiré du parcours`);
    } else {
      // Si l'élément n'est pas déjà sélectionné, l'ajouter au parcours
      console.log('Ajout de l\'élément au parcours');
      
      // Capturer tous les attributs géométriques nécessaires
      const svgElement: any = {
        id: elementData.id,
        type: elementData.type,
        order: this.currentTrail.svgElements.length
      };
      
      // Ajouter les attributs géométriques selon le type d'élément
      const element = elementData.element;
      
      // Attributs pour les chemins (path)
      if (element.hasAttribute('d')) {
        svgElement.d = element.getAttribute('d');
      }
      
      // Attributs pour les polygones/polylines
      if (element.hasAttribute('points')) {
        svgElement.points = element.getAttribute('points');
      }
      
      // Attributs pour les cercles
      if (element.hasAttribute('cx')) {
        svgElement.cx = element.getAttribute('cx');
        svgElement.cy = element.getAttribute('cy');
        svgElement.r = element.getAttribute('r');
      }
      
      // Attributs pour les rectangles
      if (element.hasAttribute('x')) {
        svgElement.x = element.getAttribute('x');
        svgElement.y = element.getAttribute('y');
        svgElement.width = element.getAttribute('width');
        svgElement.height = element.getAttribute('height');
      }
      
      this.currentTrail.svgElements.push(svgElement);
      
      // Appliquer l'effet visuel de sélection
      this.applySelectionEffect(elementData.element);
      
      // Notification pour le premier élément
      if (this.currentTrail.svgElements.length === 1) {
        this.notificationController.showNotification(
          'Premier élément sélectionné. Continuez à sélectionner des éléments pour créer votre parcours.'
        );
      } else {
        this.notificationController.showNotification(
          `Élément #${elementData.id} ajouté au parcours (total: ${this.currentTrail.svgElements.length})`
        );
      }
    }
    
    // Afficher l'état actuel du parcours dans la console pour le debug
    console.log('État actuel du parcours:', {
      id: this.currentTrail.id,
      nbElements: this.currentTrail.svgElements.length,
      elements: this.currentTrail.svgElements.map(e => ({
        ...e  // Utiliser spread pour éviter la duplication des clés
      }))
    });
    
    // Mettre à jour les compteurs dans l'interface
    this.updateEditorInfo();
  }
  
  /**
   * Applique l'effet visuel de sélection à un élément
   */
  private applySelectionEffect(element: Element): void {
    if (!this.mapSvg.contentDocument) return;
    
    // Marquer l'élément comme sélectionné
    element.setAttribute('data-selected-for-trail', 'true');
    
    // Vérifier si le groupe de surbrillance existe
    const highlightGroup = this.mapSvg.contentDocument.getElementById('highlight-layer') as SVGGElement | null;
    if (!highlightGroup) {
      console.error("Le groupe de surbrillance n'existe pas");
      return;
    }
    
    // Créer un élément de surbrillance pour la sélection
    const elementId = element.id || element.tagName.toLowerCase() + '-' + Math.random().toString(36).substr(2, 9);
    const highlightId = `selected-${elementId}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Créer un nouvel élément du même type que l'élément source
    const selectionElement = document.createElementNS("http://www.w3.org/2000/svg", element.tagName);
    selectionElement.setAttribute('id', highlightId);
    selectionElement.setAttribute('class', 'selected-element');
    
    // Copier les attributs pertinents de l'élément source
    if (element.hasAttribute('d')) {
      selectionElement.setAttribute('d', element.getAttribute('d') || '');
    }
    if (element.hasAttribute('points')) {
      selectionElement.setAttribute('points', element.getAttribute('points') || '');
    }
    if (element.hasAttribute('cx')) {
      selectionElement.setAttribute('cx', element.getAttribute('cx') || '');
      selectionElement.setAttribute('cy', element.getAttribute('cy') || '');
      selectionElement.setAttribute('r', element.getAttribute('r') || '');
    }
    if (element.hasAttribute('x')) {
      selectionElement.setAttribute('x', element.getAttribute('x') || '');
      selectionElement.setAttribute('y', element.getAttribute('y') || '');
      selectionElement.setAttribute('width', element.getAttribute('width') || '');
      selectionElement.setAttribute('height', element.getAttribute('height') || '');
    }
    
    // Stocker une référence à l'élément source
    selectionElement.setAttribute('data-source-id', elementId);
    
    // Ajouter l'élément au groupe de surbrillance
    highlightGroup.appendChild(selectionElement);
    
    // Enregistrer l'ID de l'élément de sélection sur l'élément original
    element.setAttribute('data-selection-highlight-id', selectionElement.id);
    
    // Appliquer la couleur bleue fixe
    selectionElement.setAttribute('stroke', '#3366CC');
  }
  
  /**
   * Supprime l'effet visuel de sélection d'un élément
   */
  private removeSelectionEffect(element: Element): void {
    if (!this.mapSvg.contentDocument) return;
    
    // Vérifier si le groupe de surbrillance existe
    const highlightGroup = this.mapSvg.contentDocument.getElementById('highlight-layer') as SVGGElement | null;
    if (!highlightGroup) {
      console.error("Le groupe de surbrillance n'existe pas");
      return;
    }
    
    // Récupérer l'ID de l'élément de surbrillance associé
    const selectionHighlightId = element.getAttribute('data-selection-highlight-id');
    
    console.log(`DÉSÉLECTION ÉLÉMENT ${element.tagName}#${element.id || 'sans-id'} - highlight ID:`, selectionHighlightId);
    
    // Supprimer l'élément de surbrillance s'il existe
    if (selectionHighlightId) {
      const selectionElement = this.mapSvg.contentDocument.getElementById(selectionHighlightId);
      if (selectionElement) {
        highlightGroup.removeChild(selectionElement);
      }
    }
    
    // Retirer les attributs de sélection
    element.removeAttribute('data-selected-for-trail');
    element.removeAttribute('data-selection-highlight-id');
  }
  
  /**
   * Démarre la création d'un nouveau parcours
   */
  private startTrailCreation = (): void => {
    console.log('Démarrage de la création d\'un nouveau parcours');
    
    // Créer un nouveau parcours
    this.currentTrail = {
      id: `trail-${Date.now()}`,
      name: '',
      description: '', // Champ maintenu pour la compatibilité, mais non utilisé dans l'interface
      color: '#3366CC', // Couleur fixe bleue par défaut
      svgElements: [],
      isComplete: false,
      difficulty: TrailDifficulty.EASY,
      type: TrailType.HIKING
    };
    
    // Passer en mode création
    this.editorMode = TrailEditorMode.CREATE;
    
    // Afficher l'éditeur
    if (this.editorContainer) {
      this.editorContainer.classList.add('visible');
    }
    
    // Ajouter la classe pour le mode de création de parcours au conteneur de la carte
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.classList.add('trail-creation-mode');
    } else {
      // Fallback sur document.body si le conteneur n'est pas trouvé
      document.body.classList.add('trail-creation-mode');
    }
    
    // Notification
    this.notificationController.showNotification('Sélectionnez des éléments sur la carte pour créer votre parcours.');
    
    console.log('Émission de l\'événement trailCreationStarted');
    // Émettre un événement personnalisé pour indiquer le début de la création d'un parcours
    document.dispatchEvent(new CustomEvent('trailCreationStarted'));
  };
  
  /**
   * Annule la création du parcours actuel
   */
  private cancelTrailCreation = (): void => {
    // Vérifier s'il y a un parcours en cours d'édition
    if (!this.currentTrail) return;
    
    // Demander confirmation si des éléments ont été sélectionnés
    if (this.currentTrail.svgElements.length > 0) {
      if (!confirm('Êtes-vous sûr de vouloir annuler la création de ce parcours ?')) {
        return;
      }
    }
    
    // Désélectionner visuellement tous les éléments SVG
    this.deselectAllSvgElements();
    
    // Réinitialiser l'état
    this.currentTrail = null;
    this.editorMode = TrailEditorMode.VIEW;
    
    // Fermer l'éditeur
    this.closeEditor();
    
    // Émettre un événement personnalisé pour indiquer l'annulation
    document.dispatchEvent(new CustomEvent('trailCreationCancelled'));
  };
  
  /**
   * Désélectionne tous les éléments SVG
   */
  private deselectAllSvgElements(): void {
    if (!this.mapSvg.contentDocument) return;
    
    // Parcourir tous les éléments sélectionnés et enlever l'effet visuel
    const selectedElements = this.mapSvg.contentDocument.querySelectorAll('[data-selected-for-trail="true"]');
    console.log(`DÉSÉLECTION DE ${selectedElements.length} ÉLÉMENTS SVG`);
    
    // Désélectionner chaque élément
    selectedElements.forEach(element => {
      this.removeSelectionEffect(element);
    });
  }
  
  /**
   * Ferme l'éditeur de parcours
   */
  private closeEditor = (): void => {
    // Fermer l'UI de l'éditeur
    if (this.editorContainer) {
      this.editorContainer.classList.remove('visible');
    }
    
    // Retirer la classe du mode de création
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.classList.remove('trail-creation-mode');
    } else {
      document.body.classList.remove('trail-creation-mode');
    }
    
    // Désélectionner tous les éléments SVG si nécessaire
    if (this.currentTrail && this.currentTrail.svgElements.length > 0 && !this.currentTrail.isComplete) {
      this.deselectAllSvgElements();
    }
    
    // Réinitialiser les champs du formulaire si l'éditeur est fermé sans sauvegarder
    if (this.editorContainer && !this.currentTrail?.isComplete) {
      const nameInput = this.editorContainer.querySelector('#trail-name') as HTMLInputElement;
      
      if (nameInput) nameInput.value = '';
      
      // Réinitialiser les compteurs
      const pointCounter = this.editorContainer.querySelector('.trail-editor-point-count');
      const distanceEl = this.editorContainer.querySelector('.trail-editor-distance');
      
      if (pointCounter) pointCounter.textContent = '0';
      if (distanceEl) distanceEl.textContent = '0 m';
    }

    // Réinitialiser le mode d'édition si on n'a pas terminé le parcours
    if (this.currentTrail && !this.currentTrail.isComplete) {
      this.currentTrail = null;
      this.editorMode = TrailEditorMode.VIEW;
      
      // Émettre un événement pour indiquer la fin du mode création
      document.dispatchEvent(new CustomEvent('trailCreationCancelled'));
      
      console.log('Mode de création de parcours désactivé');
    }
  };
  
  /**
   * Crée l'interface utilisateur de l'éditeur de parcours
   */
  private createEditorUI(): void {
    // Créer le conteneur pour l'éditeur
    this.editorContainer = document.createElement('div');
    this.editorContainer.className = 'trail-editor-container';
    
    // Construire l'interface de l'éditeur
    this.editorContainer.innerHTML = `
      <div class="trail-editor-header">
        <h3>Créer un nouveau parcours</h3>
        <button class="trail-editor-close">&times;</button>
      </div>
      <div class="trail-editor-body">
        <form class="trail-editor-form">
          <div class="trail-editor-field">
            <label for="trail-name">Nom du parcours</label>
            <input type="text" id="trail-name" placeholder="Nom du parcours" required>
            <div class="marker-form-error" id="trail-name-error" style="display: none;">Le nom est requis</div>
          </div>
          
          <div class="trail-editor-field">
            <label for="trail-difficulty">Difficulté</label>
            <select id="trail-difficulty" required>
              <option value="${TrailDifficulty.EASY}">Facile</option>
              <option value="${TrailDifficulty.MEDIUM}">Modéré</option>
              <option value="${TrailDifficulty.HARD}">Difficile</option>
            </select>
          </div>
          
          <div class="trail-editor-field">
            <label for="trail-type">Type de parcours</label>
            <select id="trail-type" required>
              <option value="${TrailType.HIKING}">Randonnée pédestre</option>
              <option value="${TrailType.SPORTY_HIKE}">Randonnée sportive</option>
              <option value="${TrailType.EASY_WALK}">Balade tranquille</option>
              <option value="${TrailType.TRAIL_RUNNING}">Trail running</option>
              <option value="${TrailType.FAMILY_WALK}">Promenade familiale</option>
              <option value="${TrailType.MOUNTAIN_BIKE}">VTT</option>
              <option value="${TrailType.ROAD_BIKE}">Vélo de route</option>
            </select>
          </div>
          
          <div class="trail-editor-info">
            <p>Éléments sélectionnés: <span class="trail-editor-point-count">0</span></p>
            <p>Distance estimée: <span class="trail-editor-distance">0 m</span></p>
          </div>
          
          <div class="trail-editor-instructions">
            <p>Sélectionnez des éléments sur la carte pour créer votre parcours.</p>
            <p>Un parcours doit contenir au moins 2 éléments.</p>
          </div>
        </form>
      </div>
      <div class="trail-editor-footer">
        <button class="trail-editor-btn cancel">Annuler</button>
        <button class="trail-editor-btn finish primary">Enregistrer</button>
      </div>
    `;
    
    // Trouver le conteneur de la carte
    const mapContainer = document.getElementById('map-container');
    
    // Ajouter au conteneur de la carte
    if (mapContainer) {
      mapContainer.appendChild(this.editorContainer);
    } else {
      // Fallback: ajouter au document si le conteneur de la carte n'est pas trouvé
      document.body.appendChild(this.editorContainer);
      console.warn("Le conteneur de la carte n'a pas été trouvé. L'éditeur de parcours sera ajouté au body.");
    }
    
    // Configurer les écouteurs d'événements
    const closeBtn = this.editorContainer.querySelector('.trail-editor-close');
    const cancelBtn = this.editorContainer.querySelector('.trail-editor-btn.cancel');
    const finishBtn = this.editorContainer.querySelector('.trail-editor-btn.finish');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', this.closeEditor);
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', this.cancelTrailCreation);
    }
    
    if (finishBtn) {
      finishBtn.addEventListener('click', this.finishTrail);
    }
  }
  
  /**
   * Met à jour les informations affichées dans l'éditeur
   */
  private updateEditorInfo(): void {
    if (!this.editorContainer || !this.currentTrail) return;
    
    const pointCountEl = this.editorContainer.querySelector('.trail-editor-point-count');
    const distanceEl = this.editorContainer.querySelector('.trail-editor-distance');
    
    if (pointCountEl) {
      pointCountEl.textContent = this.currentTrail.svgElements.length.toString();
    }
    
    if (distanceEl) {
      const distance = this.calculateTrailDistance();
      distanceEl.textContent = distance < 1000 
        ? `${Math.round(distance)} m` 
        : `${(distance / 1000).toFixed(2)} km`;
    }
  }
  
  /**
   * Calcule une distance approximative pour le parcours
   */
  private calculateTrailDistance(): number {
    if (!this.currentTrail) return 0;
    
    // Pour simplifier, on utilise le nombre d'éléments pour estimer la distance
    // Dans un cas réel, on calculerait la distance réelle basée sur les coordonnées géographiques
    const baseDistance = 100; // 100 mètres par élément
    return this.currentTrail.svgElements.length * baseDistance;
  }
  
  /**
   * Termine le parcours actuel
   */
  private finishTrail = (): void => {
    // Vérifier s'il y a un parcours en cours d'édition
    if (!this.currentTrail) return;
    
    // Vérifier que le parcours a au moins 2 éléments
    if (this.currentTrail.svgElements.length < 2) {
      alert('Un parcours doit avoir au moins 2 éléments SVG sélectionnés.');
      return;
    }
    
    // Récupérer les valeurs du formulaire
    if (this.editorContainer) {
      const nameInput = this.editorContainer.querySelector('#trail-name') as HTMLInputElement;
      const difficultySelect = this.editorContainer.querySelector('#trail-difficulty') as HTMLSelectElement;
      const typeSelect = this.editorContainer.querySelector('#trail-type') as HTMLSelectElement;
      const nameError = this.editorContainer.querySelector('#trail-name-error') as HTMLDivElement;
      
      // Validation
      let isValid = true;
      
      if (!nameInput || !nameInput.value.trim()) {
        if (nameError) nameError.style.display = 'block';
        isValid = false;
      } else if (nameError) {
        nameError.style.display = 'none';
      }
      
      if (!isValid) {
        return;
      }
      
      // Mettre à jour les propriétés du parcours
      this.currentTrail.name = nameInput.value.trim();
      // Garder la description vide
      this.currentTrail.description = '';
      
      // Mettre à jour la difficulté et le type
      if (difficultySelect) {
        // Convertir la valeur en nombre
        const difficultyValue = parseInt(difficultySelect.value, 10);
        this.currentTrail.difficulty = difficultyValue as TrailDifficulty;
      }
      
      if (typeSelect) {
        this.currentTrail.type = typeSelect.value as string;
      }
    }
    
    // Marquer le parcours comme complet
    this.currentTrail.isComplete = true;
    
    // Calculer une distance approximative (basée sur le nombre d'éléments)
    this.currentTrail.distance = this.calculateTrailDistance();
    
    // Sauvegarder le parcours
    this.saveTrail(this.currentTrail);
    
    // Désélectionner tous les éléments SVG
    this.deselectAllSvgElements();
    
    // Notification
    this.notificationController.showNotification(`Parcours "${this.currentTrail.name}" créé avec succès avec ${this.currentTrail.svgElements.length} éléments.`);
    
    // Image par défaut pour les parcours
    const defaultImage = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDgwIDgwIiBmaWxsPSJub25lIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9IiMxMTFjMjkiLz48cGF0aCBkPSJNNDAgMjBMMjkgNDVINTFMNDAgMjBaIiBmaWxsPSIjMTRjNzhiIi8+PHBhdGggZD0iTTI1IDUwQzI1IDQ3LjIzODYgMjcuMjM4NiA0NSAzMCA0NUgzN1Y2MEgyNVY1MFoiIGZpbGw9IiMzMzQxNTUiLz48cGF0aCBkPSJNNTUgNTBDNTUgNDcuMjM4NiA1Mi43NjE0IDQ1IDUwIDQ1SDQzVjYwSDU1VjUwWiIgZmlsbD0iIzMzNDE1NSIvPjwvc3ZnPg==';
    
    // Extraire les éléments SVG en les convertissant au format attendu
    const svgElements = this.currentTrail.svgElements.map(elem => {
      // Conserver tous les attributs géométriques
      const elementData: any = {
        id: elem.id,
        type: elem.type,
        order: elem.order
      };
      
      // Copier tous les attributs disponibles à partir de l'élément original
      if ('d' in elem) elementData.d = elem.d;
      if ('points' in elem) elementData.points = elem.points;
      if ('cx' in elem) {
        elementData.cx = elem.cx;
        elementData.cy = elem.cy;
        elementData.r = elem.r;
      }
      if ('x' in elem) {
        elementData.x = elem.x;
        elementData.y = elem.y;
        elementData.width = elem.width;
        elementData.height = elem.height;
      }
      
      return elementData;
    });
    
    console.log('Éléments SVG pour le parcours (avec attributs géométriques):', svgElements);
    
    // Réinitialiser l'état
    const trailData = {
      id: this.currentTrail.id,
      name: this.currentTrail.name,
      difficulty: this.currentTrail.difficulty as 1 | 2 | 3,
      distance: this.currentTrail.distance / 1000, // Convertir en km 
      type: this.currentTrail.type,
      image: defaultImage,
      svgElements: svgElements
    };
    
    this.currentTrail = null;
    this.editorMode = TrailEditorMode.VIEW;
    
    // Fermer l'éditeur
    this.closeEditor();
    
    // Émettre un événement personnalisé pour indiquer la fin de la création
    document.dispatchEvent(new CustomEvent('trailCreationFinished', { 
      detail: { trail: trailData } 
    }));
  };
  
  /**
   * Sauvegarde un parcours terminé
   */
  private saveTrail(trail: EditableTrail): void {
    // Récupérer les parcours existants
    const savedTrailsJson = localStorage.getItem('map_trails') || '[]';
    const savedTrails = JSON.parse(savedTrailsJson);
    
    // Préparer le parcours pour la sauvegarde avec tous les attributs géométriques
    const trailToSave = {
      ...trail,
      svgElements: trail.svgElements.map(elem => {
        // Créer un nouvel objet pour éviter de sauvegarder les références DOM
        const elementData: any = {
          id: elem.id,
          type: elem.type,
          order: elem.order
        };
        
        // Stocker les attributs géométriques si présents dans l'élément DOM original
        // ou si déjà disponibles dans l'objet
        if (elem.element) {
          // Élément DOM disponible, extraire des attributs
          const element = elem.element;
          
          if (element.hasAttribute('d')) {
            elementData.d = element.getAttribute('d');
          }
          
          if (element.hasAttribute('points')) {
            elementData.points = element.getAttribute('points');
          }
          
          if (element.hasAttribute('cx')) {
            elementData.cx = element.getAttribute('cx');
            elementData.cy = element.getAttribute('cy');
            elementData.r = element.getAttribute('r');
          }
          
          if (element.hasAttribute('x')) {
            elementData.x = element.getAttribute('x');
            elementData.y = element.getAttribute('y');
            elementData.width = element.getAttribute('width');
            elementData.height = element.getAttribute('height');
          }
        } else {
          // Pas d'élément DOM, vérifier les attributs déjà présents dans l'objet
          if ('d' in elem) elementData.d = elem.d;
          if ('points' in elem) elementData.points = elem.points;
          if ('cx' in elem) {
            elementData.cx = elem.cx;
            elementData.cy = elem.cy;
            elementData.r = elem.r;
          }
          if ('x' in elem) {
            elementData.x = elem.x;
            elementData.y = elem.y;
            elementData.width = elem.width;
            elementData.height = elem.height;
          }
        }
        
        return elementData;
      })
    };
    
    // Ajouter le nouveau parcours
    savedTrails.push(trailToSave);
    
    // Sauvegarder dans localStorage
    localStorage.setItem('map_trails', JSON.stringify(savedTrails));
    
    console.log('Parcours sauvegardé avec attributs géométriques:', trailToSave);
  }
  
  /**
   * Active ou désactive le mode d'édition de parcours
   */
  public setTrailEditorMode(active: boolean): void {
    if (active) {
      this.startTrailCreation();
    } else {
      // Si le mode d'édition est déjà désactivé, ne rien faire
      if (this.editorMode === TrailEditorMode.VIEW) {
        return;
      }
      
      // Fermer l'éditeur sans demander de confirmation (changement de mode)
      this.closeEditor();
      
      // Si un parcours est en cours d'édition, le canceller sans confirmation
      if (this.currentTrail && !this.currentTrail.isComplete) {
        // Désélectionner visuellement tous les éléments SVG
        this.deselectAllSvgElements();
        
        // Réinitialiser l'état
        this.currentTrail = null;
        this.editorMode = TrailEditorMode.VIEW;
        
        // Émettre un événement pour signaler l'annulation
        document.dispatchEvent(new CustomEvent('trailCreationCancelled'));
      }
    }
  }
  
  /**
   * Vérifie si le mode d'édition de parcours est actif
   */
  public isTrailEditorModeActive(): boolean {
    return this.editorMode === TrailEditorMode.CREATE;
  }

  /**
   * Gère les événements clavier
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    // Fermer l'éditeur lorsque la touche Escape est pressée et qu'on est en mode création
    if (e.key === 'Escape' && this.editorMode === TrailEditorMode.CREATE) {
      console.log('Touche Escape pressée en mode création, fermeture de l\'éditeur');
      this.setTrailEditorMode(false);
    }
  }

  /**
   * Met en surbrillance les éléments SVG associés à un parcours
   * @param trail Le parcours à mettre en surbrillance
   */
  public highlightTrail(trail: any): void {
    console.log('Mise en surbrillance du parcours:', trail.id);
    
    // S'assurer que le SVG est chargé avant de continuer
    if (!this.mapSvg) {
      console.error('Document SVG non disponible');
      return;
    }
    
    const tryHighlight = () => {
      // D'abord désélectionner tous les éléments précédents
      this.clearAllHighlights();
      
      if (!this.mapSvg.contentDocument) {
        console.error('Document SVG non disponible');
        return;
      }
      
      // Vérifier si les éléments SVG sont présents dans le parcours
      if (!trail.svgElements || !Array.isArray(trail.svgElements)) {
        console.warn('Aucun élément SVG trouvé dans le parcours');
        return;
      }
      
      console.log('Éléments SVG du parcours à mettre en surbrillance:', trail.svgElements);
      
      // Vérifier que nous sommes en mode navigation pour que les éléments soient visibles
      const mapContainer = document.getElementById('map-container');
      if (mapContainer && !mapContainer.classList.contains('mode-grabbing')) {
        // Forcer le mode plat pour voir les éléments SVG
        mapContainer.classList.remove('mode-grabbing', 'mode-trail-creation');
        mapContainer.classList.add('mode-flat');
      }
      
      // Vérifier si le groupe de surbrillance existe
      const svgDocument = this.mapSvg.contentDocument;
      let highlightGroup = svgDocument.getElementById('highlight-layer') as SVGGElement | null;
      
      // Si le groupe n'existe pas, le créer
      if (!highlightGroup) {
        const svgRoot = svgDocument.querySelector('svg');
        if (!svgRoot) {
          console.error('Élément SVG racine non trouvé');
          return;
        }
        
        highlightGroup = document.createElementNS("http://www.w3.org/2000/svg", "g") as SVGGElement;
        highlightGroup.setAttribute('id', 'highlight-layer');
        highlightGroup.setAttribute('class', 'highlight-layer');
        highlightGroup.setAttribute('pointer-events', 'none');
        
        // Ajouter un style si nécessaire
        const styleElement = document.createElementNS("http://www.w3.org/2000/svg", "style");
        styleElement.textContent = `
          .trail-highlight-element {
            stroke: #FF5722;
            stroke-width: 3px;
            fill: none;
            filter: drop-shadow(0 0 3px rgba(255, 87, 34, 0.5));
            pointer-events: none;
            opacity: 0.8;
            z-index: 1000;
          }
        `;
        
        svgRoot.appendChild(styleElement);
        svgRoot.appendChild(highlightGroup);
      }
      
      // Activer pointerEvents sur tous les éléments SVG pour qu'ils soient visibles
      this.mapSvg.style.pointerEvents = 'auto';
      
      let highlightCount = 0;
      
      // Parcourir tous les éléments du parcours et les mettre en surbrillance
      trail.svgElements.forEach((svgElement: any) => {
        const type = svgElement.type?.toLowerCase() || 'path';
        const id = svgElement.id;
        
        console.log(`Création de surbrillance pour l'élément ${type}#${id}`, svgElement);
        
        // Créer un élément SVG du type approprié
        const highlightElement = document.createElementNS("http://www.w3.org/2000/svg", type);
        const highlightId = `trail-highlight-${id}-${Math.random().toString(36).substr(2, 9)}`;
        
        highlightElement.setAttribute('id', highlightId);
        highlightElement.setAttribute('class', 'trail-highlight-element');
        highlightElement.setAttribute('data-trail-id', trail.id);
        
        // Deux approches pour définir les attributs géométriques:
        // 1. Utiliser directement les attributs stockés dans l'élément du parcours
        let attributesApplied = false;
        
        // Pour les chemins (path)
        if (svgElement.d) {
          highlightElement.setAttribute('d', svgElement.d);
          attributesApplied = true;
        }
        
        // Pour les polygones/polylines
        if (svgElement.points) {
          highlightElement.setAttribute('points', svgElement.points);
          attributesApplied = true;
        }
        
        // Pour les cercles
        if (svgElement.cx != null) {
          highlightElement.setAttribute('cx', svgElement.cx);
          highlightElement.setAttribute('cy', svgElement.cy);
          highlightElement.setAttribute('r', svgElement.r);
          attributesApplied = true;
        }
        
        // Pour les rectangles
        if (svgElement.x != null) {
          highlightElement.setAttribute('x', svgElement.x);
          highlightElement.setAttribute('y', svgElement.y);
          highlightElement.setAttribute('width', svgElement.width);
          highlightElement.setAttribute('height', svgElement.height);
          attributesApplied = true;
        }
        
        // 2. Fallback: Si aucun attribut n'a été appliqué, essayer de trouver l'élément dans le document SVG
        if (!attributesApplied) {
          const element = svgDocument.getElementById(id);
          if (!element) {
            console.warn(`Élément SVG avec ID "${id}" non trouvé et pas d'attributs géométriques disponibles`);
            return;
          }
          
          // Copier les attributs depuis l'élément trouvé
          if (element.hasAttribute('d')) {
            highlightElement.setAttribute('d', element.getAttribute('d') || '');
          }
          if (element.hasAttribute('points')) {
            highlightElement.setAttribute('points', element.getAttribute('points') || '');
          }
          if (element.hasAttribute('cx')) {
            highlightElement.setAttribute('cx', element.getAttribute('cx') || '');
            highlightElement.setAttribute('cy', element.getAttribute('cy') || '');
            highlightElement.setAttribute('r', element.getAttribute('r') || '');
          }
          if (element.hasAttribute('x')) {
            highlightElement.setAttribute('x', element.getAttribute('x') || '');
            highlightElement.setAttribute('y', element.getAttribute('y') || '');
            highlightElement.setAttribute('width', element.getAttribute('width') || '');
            highlightElement.setAttribute('height', element.getAttribute('height') || '');
          }
          
          // Si l'élément existe, enregistrer l'ID de surbrillance pour faciliter la suppression
          const existingHighlights = element.getAttribute('data-trail-highlights') || '';
          const newHighlights = existingHighlights ? `${existingHighlights},${highlightId}` : highlightId;
          element.setAttribute('data-trail-highlights', newHighlights);
        }
        
        // S'assurer que l'élément de surbrillance est visible
        highlightElement.style.display = 'block';
        highlightElement.style.visibility = 'visible';
        
        // Ajouter l'élément au groupe de surbrillance
        highlightGroup.appendChild(highlightElement);
        highlightCount++;
      });
      
      console.log(`${highlightCount} éléments mis en surbrillance pour le parcours ${trail.name}`);
      
      // Afficher une notification seulement si des éléments ont été mis en surbrillance
      if (highlightCount > 0) {
        this.notificationController.showNotification(`Parcours "${trail.name}" mis en évidence sur la carte (${highlightCount} éléments).`);
      } else {
        this.notificationController.showNotification(`Impossible de mettre en évidence le parcours "${trail.name}". Aucun élément trouvé.`);
      }
    };
    
    // Si le document SVG est déjà chargé, exécuter directement
    if (this.mapSvg.contentDocument && this.mapSvg.contentDocument.readyState === 'complete') {
      tryHighlight();
    } else {
      // Sinon, attendre que le document soit chargé
      const checkSvgLoaded = () => {
        if (this.mapSvg.contentDocument && this.mapSvg.contentDocument.readyState === 'complete') {
          tryHighlight();
        } else {
          // Réessayer dans 100ms
          setTimeout(checkSvgLoaded, 100);
        }
      };
      
      // Attendre 100ms avant de commencer à vérifier
      setTimeout(checkSvgLoaded, 100);
    }
  }
  
  /**
   * Supprime toutes les surbrillances des parcours
   */
  public clearAllHighlights(): void {
    if (!this.mapSvg || !this.mapSvg.contentDocument) return;
    
    const svgDocument = this.mapSvg.contentDocument;
    const highlightElements = svgDocument.querySelectorAll('.trail-highlight-element');
    
    console.log(`Suppression de ${highlightElements.length} éléments de surbrillance`);
    
    // Supprimer tous les éléments de surbrillance
    highlightElements.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    
    // Nettoyer les attributs de référence sur les éléments originaux
    const elementsWithHighlights = svgDocument.querySelectorAll('[data-trail-highlights]');
    elementsWithHighlights.forEach(element => {
      element.removeAttribute('data-trail-highlights');
    });
  }
}