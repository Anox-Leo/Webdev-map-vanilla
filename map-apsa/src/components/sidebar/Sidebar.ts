import './Sidebar.css';

export class Sidebar {
  private container: HTMLElement;
  private template = `
    <div class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <h1>APSA Carte Interactive</h1>
      </div>
      
      <div class="sidebar-content" id="sidebar-content">
        <!-- Le contenu dynamique sera injecté ici -->
        <p>Sélectionnez une région sur la carte pour afficher plus d'informations.</p>
      </div>
      
      <div class="sidebar-footer">
        <button class="action-btn secondary" id="sidebar-reset">Réinitialiser</button>
        <button class="action-btn" id="sidebar-action">Explorer</button>
      </div>
    </div>
  `;
  private sidebarElement: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.setupEventListeners();
  }

  private render(): void {
    // On crée un élément div pour contenir le sidebar
    const sidebarWrapper = document.createElement('div');
    sidebarWrapper.innerHTML = this.template;
    
    // On ajoute notre élément au conteneur
    this.container.appendChild(sidebarWrapper.firstElementChild as HTMLElement);
    
    // On stocke une référence à notre élément sidebar
    this.sidebarElement = document.getElementById('sidebar');
  }

  private setupEventListeners(): void {
    const resetButton = document.getElementById('sidebar-reset');
    const actionButton = document.getElementById('sidebar-action');
    
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

    // Pour les appareils mobiles - gestion du menu
    const mediaQuery = window.matchMedia('(max-width: 480px)');
    this.handleResponsiveLayout(mediaQuery);
    mediaQuery.addEventListener('change', (e) => this.handleResponsiveLayout(e));
  }

  private handleResponsiveLayout(e: MediaQueryListEvent | MediaQueryList): void {
    if (e.matches) {
      // Créer un bouton pour ouvrir/fermer le menu sur mobile si nécessaire
      if (!document.getElementById('sidebar-toggle')) {
        const toggleButton = document.createElement('button');
        toggleButton.id = 'sidebar-toggle';
        toggleButton.className = 'sidebar-toggle-btn';
        toggleButton.innerHTML = '☰';
        
        toggleButton.addEventListener('click', () => {
          const sidebar = document.getElementById('sidebar');
          sidebar?.classList.toggle('open');
        });
        
        document.body.appendChild(toggleButton);
      }
    } else {
      // Supprimer le bouton si on est en mode desktop
      const toggleButton = document.getElementById('sidebar-toggle');
      if (toggleButton) {
        toggleButton.remove();
      }
    }
  }

  /**
   * Met à jour le contenu du panneau latéral
   */
  public updateContent(content: string): void {
    const contentContainer = document.getElementById('sidebar-content');
    if (contentContainer) {
      contentContainer.innerHTML = content;
    }
  }

  /**
   * Réinitialise le contenu
   */
  private resetContent(): void {
    this.updateContent('<p>Sélectionnez une région sur la carte pour afficher plus d\'informations.</p>');
  }

  /**
   * Exécute l'action principale
   */
  private performAction(): void {
    // Action principale à implémenter
  }
} 