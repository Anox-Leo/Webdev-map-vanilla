import { TransformController } from './TransformController';
import { MapDisplayMode } from '../MapController';

export class CompassController {
  // État de la boussole
  private isRotating: boolean = false;
  private compassCenter: { x: number, y: number } = { x: 0, y: 0 };
  private lastAngle: number = 0;
  
  // Éléments DOM
  private compassRotator: HTMLElement | null = null;
  private compassHandle: HTMLElement | null = null;
  private compassResetBtn: HTMLElement | null = null;
  private mapSvg: HTMLObjectElement | null = null;
  
  // Contrôleur de transformation
  private transformController: TransformController;
  
  // Mode d'affichage actuel
  private currentMode: MapDisplayMode = MapDisplayMode.GRABBING;
  
  // Indique si le contrôleur est activé
  private enabled: boolean = true;

  constructor(transformController: TransformController) {
    this.transformController = transformController;
    
    // Récupérer les références DOM
    this.compassRotator = document.getElementById('compass-rotator');
    this.compassHandle = document.querySelector('.compass-handle') as HTMLElement;
    this.compassResetBtn = document.getElementById('compass-reset');
    this.mapSvg = document.getElementById('map-svg') as HTMLObjectElement;
  }
  
  /**
   * Active ou désactive le contrôleur de boussole
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    // Si on désactive le contrôleur et qu'une rotation est en cours, la terminer
    if (!enabled && this.isRotating) {
      this.endRotation();
    }
    
    // Mettre à jour l'apparence visuelle de la boussole
    if (this.compassRotator) {
      if (!enabled) {
        this.compassRotator.classList.add('disabled');
      } else if (this.currentMode !== MapDisplayMode.FLAT) {
        this.compassRotator.classList.remove('disabled');
      }
    }
  }
  
  /**
   * Met à jour le mode d'affichage actuel
   */
  public setDisplayMode(mode: MapDisplayMode): void {
    this.currentMode = mode;
    
    // Si on passe en mode plat, désactiver visuellement la boussole
    if (this.compassRotator && this.compassHandle) {
      if (mode === MapDisplayMode.FLAT) {
        this.compassRotator.classList.add('disabled');
      } else if (this.enabled) {
        this.compassRotator.classList.remove('disabled');
      }
    }
    
    // Si on est en rotation active et qu'on passe en mode plat, terminer la rotation
    if (this.isRotating && mode === MapDisplayMode.FLAT) {
      this.endRotation();
    }
  }

  /**
   * Configure les écouteurs d'événements pour la boussole
   */
  public setupEventListeners(): void {
    // Événements de la boussole
    if (this.compassRotator) {
      // Démarrer la rotation
      this.compassRotator.addEventListener('mousedown', (e) => {
        // Ne pas permettre la rotation en mode plat ou si désactivé
        if (this.currentMode === MapDisplayMode.FLAT || !this.enabled) return;
        
        this.startRotation(e);
      });
      
      this.compassRotator.addEventListener('touchstart', (e) => {
        // Ne pas permettre la rotation en mode plat ou si désactivé
        if (this.currentMode === MapDisplayMode.FLAT || !this.enabled) return;
        
        if (e.touches.length === 1) {
          e.preventDefault();
          this.startRotation(e.touches[0]);
        }
      }, { passive: false });
      
      // Gérer la rotation
      window.addEventListener('mousemove', (e) => {
        if (this.isRotating && this.enabled) {
          this.moveRotation(e);
        }
      });
      
      window.addEventListener('touchmove', (e) => {
        if (this.isRotating && this.enabled && e.touches.length === 1) {
          e.preventDefault();
          this.moveRotation(e.touches[0]);
        }
      }, { passive: false });
      
      // Terminer la rotation
      window.addEventListener('mouseup', () => {
        this.endRotation();
      });
      
      window.addEventListener('touchend', () => {
        this.endRotation();
      });
    }
    
    // Réinitialiser la rotation
    if (this.compassResetBtn) {
      this.compassResetBtn.addEventListener('click', () => {
        if (this.enabled) {
          this.resetRotation();
        }
      });
    }
  }

  /**
   * Démarre la rotation de la boussole
   */
  private startRotation(e: MouseEvent | Touch): void {
    if (!this.compassRotator || !this.enabled || this.currentMode === MapDisplayMode.FLAT) return;
    
    this.isRotating = true;
    
    // Calculer le centre de la boussole
    const rect = this.compassRotator.getBoundingClientRect();
    this.compassCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    
    // Calculer l'angle initial
    this.lastAngle = this.calculateAngle(e.clientX, e.clientY);
    
    // Ajouter une classe pour indiquer que la rotation est en cours
    if (this.compassHandle) {
      this.compassHandle.classList.add('rotating');
    }
    
    // Désactiver les transitions pendant la rotation
    if (this.mapSvg) {
      this.mapSvg.classList.add('rotating');
    }
  }

  /**
   * Gère le mouvement de rotation de la boussole
   */
  private moveRotation(e: MouseEvent | Touch): void {
    if (!this.isRotating || !this.enabled) return;
    
    // Calculer le nouvel angle
    const newAngle = this.calculateAngle(e.clientX, e.clientY);
    
    // Calculer la différence d'angle
    let angleDiff = newAngle - this.lastAngle;
    
    // Gérer le passage de 359 à 0 degrés et vice versa
    if (angleDiff > 180) angleDiff -= 360;
    if (angleDiff < -180) angleDiff += 360;
    
    // Mettre à jour l'angle de rotation de la carte
    const currentRotateZ = this.transformController.getRotateZ();
    let newRotateZ = (currentRotateZ + angleDiff) % 360;
    if (newRotateZ < 0) newRotateZ += 360;
    
    // Mettre à jour la rotation via le transformController
    this.transformController.updateRotation(newRotateZ);
    
    // Mettre à jour la position de la poignée
    this.updateCompassHandle();
    
    // Mettre à jour l'indication visuelle de la direction
    this.updateDirectionIndicator();
    
    // Mémoriser le dernier angle
    this.lastAngle = newAngle;
  }

  /**
   * Termine la rotation de la boussole
   */
  private endRotation(): void {
    this.isRotating = false;
    
    // Enlever la classe de rotation
    if (this.compassHandle) {
      this.compassHandle.classList.remove('rotating');
    }
    
    // Réactiver les transitions
    if (this.mapSvg) {
      this.mapSvg.classList.remove('rotating');
    }
  }

  /**
   * Calcule l'angle entre le centre de la boussole et une position
   */
  private calculateAngle(x: number, y: number): number {
    // Calculer l'angle entre le centre de la boussole et la position actuelle du curseur
    const deltaX = x - this.compassCenter.x;
    const deltaY = y - this.compassCenter.y;
    
    // Calculer l'angle en radians puis convertir en degrés
    let angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    
    // Convertir en système horaire (0 = haut, 90 = droite, etc.)
    angle = (angle + 90) % 360;
    if (angle < 0) angle += 360;
    
    return angle;
  }

  /**
   * Met à jour visuellement la position de la poignée de la boussole
   */
  public updateCompassHandle(): void {
    if (!this.compassRotator) return;
    
    // Obtenir l'angle de rotation actuel
    const rotateZ = this.transformController.getRotateZ();
    
    // Mettre à jour visuellement la position de la poignée et la rotation de la ligne
    const radius = this.compassRotator.clientWidth / 2 - 8; // Moitié de la largeur de la poignée
    const angle = rotateZ * Math.PI / 180;
    
    // Calculer les coordonnées
    const x = Math.sin(angle) * radius;
    const y = -Math.cos(angle) * radius;
    
    // Positionner la poignée
    if (this.compassHandle) {
      this.compassHandle.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      this.compassHandle.style.top = '50%';
      this.compassHandle.style.left = '50%';
    }
    
    // Gérer la focale directionnelle
    const compassLine = this.compassRotator.querySelector('.compass-line') as HTMLElement;
    if (compassLine) {
      // Positionner la focale au centre
      compassLine.style.position = 'absolute';
      compassLine.style.top = '50%';
      compassLine.style.left = '50%';
      
      // Utiliser le rayon complet de la boussole pour la longueur de la focale
      const fullRadius = this.compassRotator.clientWidth / 2;
      
      // Définir les propriétés de la focale
      compassLine.style.width = `${fullRadius}px`;
      compassLine.style.height = '20px'; // Hauteur plus grande pour créer un effet de cône
      
      // Appliquer un décalage pour aligner correctement
      let lineAngle = rotateZ - 90; // Correction avec -90 degrés
      
      // Garder l'angle entre 0 et 360 degrés
      lineAngle = lineAngle % 360;
      if (lineAngle < 0) lineAngle += 360;
      
      // Créer un effet de focale qui s'étend progressivement
      compassLine.style.background = 'linear-gradient(to right, rgba(70, 130, 220, 0.1), rgba(70, 130, 220, 0.6))';
      compassLine.style.clipPath = 'polygon(0 50%, 100% 0, 100% 100%)'; // Forme triangulaire
      compassLine.style.transform = `translateY(-50%) rotate(${lineAngle}deg)`;
      compassLine.style.transformOrigin = 'left center';
      compassLine.style.borderRadius = '0 5px 5px 0'; // Arrondir les bords droits
      
      // S'assurer que la focale est au-dessus des autres éléments
      compassLine.style.zIndex = '0';
    }
  }

  /**
   * Met à jour l'indication visuelle de la direction actuelle sur la boussole
   */
  public updateDirectionIndicator(): void {
    const directions = document.querySelectorAll('.compass-direction');
    if (!directions.length) return;
    
    // Obtenir l'angle de rotation actuel
    const angle = this.transformController.getRotateZ();
    
    // Supprimer toutes les classes actives
    directions.forEach(dir => dir.classList.remove('active'));
    
    // Ajouter la classe active à la direction appropriée (sens inversé)
    if (angle >= 315 || angle < 45) {
      // Nord
      document.querySelector('.compass-direction.north')?.classList.add('active');
    } else if (angle >= 45 && angle < 135) {
      // Est
      document.querySelector('.compass-direction.east')?.classList.add('active');
    } else if (angle >= 135 && angle < 225) {
      // Sud
      document.querySelector('.compass-direction.south')?.classList.add('active');
    } else {
      // Ouest
      document.querySelector('.compass-direction.west')?.classList.add('active');
    }
  }

  /**
   * Réinitialise la rotation à 0 (Nord)
   */
  public resetRotation(): void {
    this.transformController.resetRotation();
    this.updateCompassHandle();
    this.updateDirectionIndicator();
  }
  
  /**
   * Vérifie si la boussole est en cours de rotation
   */
  public isRotatingActive(): boolean {
    return this.isRotating;
  }
} 