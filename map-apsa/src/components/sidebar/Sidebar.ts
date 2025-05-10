import './Sidebar.css';

export class Sidebar {
  private container: HTMLElement;
  private sidebarTemplate = `
    <div class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <h1>APSA Carte Interactive</h1>
      </div>
      
      <div class="sidebar-content" id="sidebar-content">
        <p>Sélectionnez une région sur la carte pour afficher plus d'informations.</p>
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

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.setupEventListeners();
    this.restoreCollapseState();
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
    this.updateContent('<p>Sélectionnez une région sur la carte pour afficher plus d\'informations.</p>');
  }

  private performAction(): void {
    // Action principale à implémenter
  }
} 