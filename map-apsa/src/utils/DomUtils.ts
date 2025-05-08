/**
 * Utilitaires pour manipuler le DOM
 */
export class DomUtils {
  /**
   * Attend que le DOM soit complètement chargé
   * @param callback - Fonction à exécuter lorsque le DOM est chargé
   */
  static onDomReady(callback: () => void): void {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

  /**
   * Récupère un élément du DOM avec le type approprié
   * @param id - ID de l'élément à récupérer
   * @returns L'élément du DOM ou null s'il n'existe pas
   */
  static getElementById<T extends HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
  }
} 