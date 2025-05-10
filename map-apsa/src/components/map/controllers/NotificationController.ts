export class NotificationController {
  // Élément conteneur
  private mapContainer: HTMLElement;
  
  constructor(mapContainer: HTMLElement) {
    this.mapContainer = mapContainer;
  }
  
  /**
   * Affiche une notification temporaire sur la carte
   */
  public showNotification(message: string, duration: number = 3000): void {
    // Créer un élément de notification s'il n'existe pas
    let notification = document.getElementById('map-notification');
    if (!notification && this.mapContainer) {
      notification = document.createElement('div');
      notification.id = 'map-notification';
      notification.className = 'map-notification';
      this.mapContainer.appendChild(notification);
    }
    
    if (notification) {
      // Définir le message
      notification.textContent = message;
      notification.classList.add('show');
      
      // Retirer après un délai
      setTimeout(() => {
        if (notification) {
          notification.classList.remove('show');
        }
      }, duration);
    }
  }
} 