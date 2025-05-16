import './Sidebar.css';
import '../trails/Trails.css';
import {TrailsList} from '../trails/TrailsList';
import {getTrails} from '../trails/TrailsData';
import {Trail} from '../trails/TrailCard';
import {trailDetails} from '../trails/TrailDetailsData';
import {TrailStepCard} from '../trails/TrailStepCard';
import { NotificationController } from '../map/controllers';
import { MarkerController } from '../markers/MarkerController';
import { MarkerType } from '../markers/MarkerTypes';

export class Sidebar {
  private container: HTMLElement;
  private sidebarTemplate = `
    <div class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <img src="./assets/images/apsa-logo.png" alt="APSA Logo" class="sidebar-logo" />
        <h1>APSA Carte Interactive</h1>
      </div>
      
      <div class="sidebar-content" id="sidebar-content">
      </div>
      
      <div class="sidebar-footer">
        <button class="action-btn secondary" id="sidebar-reset">Réinitialiser</button>
        <button class="action-btn" id="sidebar-action">Explorer</button>
      </div>
    </div>
  `;
  
  private toggleButtonTemplate = `
    <div class="toggle-button-container" id="toggle-button-container">
      <button class="sidebar-toggle" id="sidebar-toggle" title="Replier/Déplier le panneau"></button>
    </div>
  `;
  
  private sidebarElement: HTMLElement | null = null;
  private toggleButtonElement: HTMLElement | null = null;
  private isCollapsed: boolean = false;
  private trailsList: TrailsList | null = null;
  private notificationController!: NotificationController;
  private markerController!: MarkerController;

  // Éléments DOM
  private mapContainer: HTMLElement | null = null;
  private mapView: HTMLElement | null = null;
  private mapSvg: HTMLObjectElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.setupEventListeners();
    this.restoreCollapseState();
    this.loadTrails();
    this.trailsList?.setTrailSelectHandler((trail: Trail) => {
      this.handleTrailSelection(trail);
    });

    // Récupérer les références aux éléments du DOM
    this.mapContainer = document.getElementById('map-container');
    this.mapView = document.querySelector('.map-view') as HTMLElement;
    this.mapSvg = document.getElementById('map-svg') as HTMLObjectElement;

    // Vérifier que tous les éléments sont présents
    if (!this.mapContainer || !this.mapView || !this.mapSvg) {
      // Les éléments requis n'ont pas été trouvés
      return;
    }

    this.notificationController = new NotificationController(this.mapContainer);
    this.markerController = new MarkerController(this.mapSvg, this.notificationController);

  }

  private render(): void {
    const sidebarWrapper = document.createElement('div');
    sidebarWrapper.innerHTML = this.sidebarTemplate;
    
    this.container.appendChild(sidebarWrapper.firstElementChild as HTMLElement);
    this.sidebarElement = document.getElementById('sidebar');
    
    const toggleButtonWrapper = document.createElement('div');
    toggleButtonWrapper.innerHTML = this.toggleButtonTemplate;
    
    this.container.appendChild(toggleButtonWrapper.firstElementChild as HTMLElement);
    this.toggleButtonElement = document.getElementById('toggle-button-container');
  }

  private setupEventListeners(): void {
    const resetButton = document.getElementById('sidebar-reset');
    const actionButton = document.getElementById('sidebar-action');
    const toggleButton = document.getElementById('sidebar-toggle');
    
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        this.resetContent();
      });
    }
    
    if (actionButton) {
      actionButton.addEventListener('click', () => {
        this.performAction();
      });
    }
    
    if (toggleButton) {
      toggleButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleSidebar();
      });
    }

    const mediaQuery = window.matchMedia('(max-width: 480px)');
    this.handleResponsiveLayout(mediaQuery);
    mediaQuery.addEventListener('change', (e) => this.handleResponsiveLayout(e));
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.isCollapsed) {
        this.toggleSidebar();
      }
    });
  }
  
  private toggleSidebar(): void {
    if (!this.sidebarElement) return;
    
    this.isCollapsed = !this.isCollapsed;
    
    if (this.isCollapsed) {
      this.sidebarElement.classList.add('collapsed');
      this.sidebarElement.classList.remove('open');
    } else {
      this.sidebarElement.classList.remove('collapsed');
      
      const mediaQuery = window.matchMedia('(max-width: 480px)');
      if (mediaQuery.matches) {
        this.sidebarElement.classList.add('open');
      }
    }
    
    localStorage.setItem('sidebar_collapsed', this.isCollapsed.toString());
    window.dispatchEvent(new Event('resize'));
  }
  
  private restoreCollapseState(): void {
    const savedState = localStorage.getItem('sidebar_collapsed');
    
    if (savedState === 'true') {
      this.isCollapsed = true;
      this.sidebarElement?.classList.add('collapsed');
    }
  }

  private handleResponsiveLayout(e: MediaQueryListEvent | MediaQueryList): void {
    if (e.matches) {
      if (this.toggleButtonElement) {
        this.toggleButtonElement.style.display = 'block';
        this.toggleButtonElement.style.left = '0';
        this.toggleButtonElement.style.top = '50%';
        this.toggleButtonElement.style.position = 'fixed';
      }
      
      const toggleButtonMobile = document.getElementById('sidebar-toggle-btn');
      if (toggleButtonMobile) {
        toggleButtonMobile.remove();
      }
    } else {
      if (this.toggleButtonElement) {
        this.toggleButtonElement.style.position = '';
        this.toggleButtonElement.style.left = '';
        this.toggleButtonElement.style.top = '';
        this.toggleButtonElement.style.display = '';
      }
      
      const toggleButton = document.getElementById('sidebar-toggle-btn');
      if (toggleButton) {
        toggleButton.remove();
      }
    }
  }

  public updateContent(content: string): void {
    const contentContainer = document.getElementById('sidebar-content');
    if (contentContainer) {
      contentContainer.innerHTML = content;
    }
  }

  private resetContent(): void {
    this.loadTrails();
  }

  private performAction(): void {
    const selectedTrail = this.trailsList?.getSelectedTrail();
    
    if (selectedTrail) {
      console.log("Action sur le parcours:", selectedTrail.name);
    }
  }

  private async loadTrails(): Promise<void> {
    const contentContainer = document.getElementById('sidebar-content');
    if (!contentContainer) return;
    
    contentContainer.innerHTML = '<div class="loading">Chargement des parcours...</div>';
    
    try {
      const trails = await getTrails();
      
      contentContainer.innerHTML = '';
      
      this.trailsList = new TrailsList(contentContainer, trails);
      
      this.trailsList.setTrailSelectHandler((trail: Trail) => {
        this.handleTrailSelection(trail);
      });
    } catch (error) {
      contentContainer.innerHTML = '<div class="error">Erreur lors du chargement des parcours.</div>';
    }
  }

  private showTrailDetails(trailId: string): void {
    const contentContainer = document.getElementById('sidebar-content');
    if (!contentContainer) return;

    const trailDetail = trailDetails.find(detail => detail.id === trailId);
    if (!trailDetail) {
      contentContainer.innerHTML = '<div class="error">Détails non disponibles pour ce parcours.</div>';
      return;
    }

    let currentIndex = 0;

    const renderHint = (index: number) => {
      const card = new TrailStepCard(
          trailDetail.photos[index],
          trailDetail.descriptions[index],
          trailDetail.alts[index]
      );
      const detailsContainer = contentContainer.querySelector('.trail-details');
      if (detailsContainer) {
        detailsContainer.appendChild(card.render()); // Ajoute le nouvel indice
      }

      const latitude = trailDetail.latitude[index];
      const longitude = trailDetail.longitude[index];
      console.log(this.markerController);
      if(this.markerController){
        this.markerController.createMarker({
          id: `user-point-${index}`,
          x: longitude,
          y: latitude,
          type: MarkerType.DEFAULT,
          title: `Indice ${index + 1}`,
          description: trailDetail.descriptions[index],
        });
      }
    };

    contentContainer.innerHTML = `
    <div class="trail-details"></div>
    <button class="action-btn secondary" id="next-hint">Prochain indice</button>
    <button class="action-btn secondary" id="back-to-trails">Retour</button>
  `;

    renderHint(currentIndex);

    const nextHintButton = document.getElementById('next-hint');
    if (nextHintButton) {
      nextHintButton.addEventListener('click', () => {
        currentIndex++;
        renderHint(currentIndex);

        // Masque le bouton si tous les indices sont affichés
        if (currentIndex === trailDetail.photos.length - 1) {
          nextHintButton.style.display = 'none';
        }
      });
    }

    const backButton = document.getElementById('back-to-trails');
    if (backButton) {
      backButton.addEventListener('click', () => {
        this.resetContent();
      });
    }
  }

  private handleTrailSelection(trail: Trail): void {
    console.log(`Parcours sélectionné: ${trail.name}`);
    this.showTrailDetails(trail.id);
  }
} 