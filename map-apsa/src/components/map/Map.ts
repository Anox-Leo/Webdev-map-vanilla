import './Map.css';
import { MapController } from './MapController';

export class Map {
  private container: HTMLElement;
  private mapController: MapController;
  private template = `
    <div class="map-container" id="map-container">
      <div class="map-view">
        <object type="image/svg+xml" data="/assets/map.svg" class="map-svg" id="map-svg" aria-label="Carte de randonnée">
          Votre navigateur ne prend pas en charge les objets SVG
        </object>
      </div>
      
      <!-- Boussole circulaire -->
      <div class="compass-container">
        <div class="compass-circle">
          <div class="compass-directions">
            <span class="compass-direction north">N</span>
            <span class="compass-direction east">E</span>
            <span class="compass-direction south">S</span>
            <span class="compass-direction west">O</span>
          </div>
          <div class="compass-rotator" id="compass-rotator">
            <div class="compass-handle"></div>
            <div class="compass-line"></div>
          </div>
          <div class="compass-center" id="compass-reset"></div>
        </div>
      </div>
      
      <div class="map-controls">
        <div class="zoom-controls">
          <button id="zoom-in" class="control-btn" title="Zoom avant">+</button>
          <button id="zoom-out" class="control-btn" title="Zoom arrière">-</button>
        </div>
        <button id="reset" class="control-btn reset-btn" title="Réinitialiser la vue">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
          </svg>
        </button>
      </div>
    </div>
  `;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.mapController = new MapController();
  }

  private render(): void {
    // On crée un élément div pour contenir la carte
    const mapWrapper = document.createElement('div');
    mapWrapper.innerHTML = this.template;
    
    // On ajoute notre élément au conteneur
    this.container.appendChild(mapWrapper.firstElementChild as HTMLElement);
  }
} 