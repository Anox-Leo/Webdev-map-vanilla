import './Sidebar.css';
import './Trails.css';
import { TrailsList } from './TrailsList';
import { getTrails } from './TrailsData';
import { Trail } from './TrailCard';

export class Sidebar {
  private container: HTMLElement;
  private sidebarTemplate = `
    <div class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <h1>APSA Carte Interactive</h1>
      </div>
      
      <div class="sidebar-content" id="sidebar-content">
        <!-- Le contenu sera injecté dynamiquement -->
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

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.setupEventListeners();
    this.restoreCollapseState();
    this.loadTrails();
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
    } else {
      this.sidebarElement.classList.remove('collapsed');
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
        this.toggleButtonElement.style.display = 'none';
      }
      
      if (!document.getElementById('sidebar-toggle-btn')) {
        const toggleButton = document.createElement('button');
        toggleButton.id = 'sidebar-toggle-btn';
        toggleButton.className = 'sidebar-toggle-btn';
        toggleButton.innerHTML = '☰';
        
        toggleButton.addEventListener('click', () => {
          const sidebar = document.getElementById('sidebar');
          sidebar?.classList.toggle('open');
        });
        
        document.body.appendChild(toggleButton);
      }
    } else {
      if (this.toggleButtonElement) {
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
    this.loadTrails(); // Recharge la liste des parcours
  }

  private performAction(): void {
    // Si un parcours est sélectionné, on pourrait effectuer une action spécifique
    const selectedTrail = this.trailsList?.getSelectedTrail();
    
    if (selectedTrail) {
      console.log("Action sur le parcours:", selectedTrail.name);
      // Ici, on pourrait par exemple zoomer sur le parcours sur la carte
    }
  }

  private async loadTrails(): Promise<void> {
    const contentContainer = document.getElementById('sidebar-content');
    if (!contentContainer) return;
    
    // Afficher un message de chargement
    contentContainer.innerHTML = '<div class="loading">Chargement des parcours...</div>';
    
    try {
      // Charger les parcours
      const trails = await getTrails();
      
      // Vider le conteneur
      contentContainer.innerHTML = '';
      
      // Créer et afficher la liste des parcours
      this.trailsList = new TrailsList(contentContainer, trails);
      
      // Configurer le gestionnaire de sélection des parcours
      this.trailsList.setTrailSelectHandler((trail: Trail) => {
        this.handleTrailSelection(trail);
      });
    } catch (error) {
      contentContainer.innerHTML = '<div class="error">Erreur lors du chargement des parcours.</div>';
    }
  }
  
  private handleTrailSelection(trail: Trail): void {
    console.log(`Parcours sélectionné: ${trail.name}`);
    // Ici, on pourrait mettre à jour la carte pour afficher le parcours sélectionné
  }
} 