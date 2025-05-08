import './style.css'
import { Map } from './components/map/Map'
import { DomUtils } from './utils/DomUtils'

/**
 * Initialise l'application
 */
function initApp() {
  // Création du conteneur principal
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <div id="main-content"></div>
  `

  const mainContent = DomUtils.getElementById<HTMLDivElement>('main-content')
  
  if (mainContent) {
    // Initialisation de la carte uniquement
    new Map(mainContent)
  } else {
    console.error('Impossible de trouver le conteneur principal')
  }
}

// Attendre que le DOM soit chargé
DomUtils.onDomReady(initApp)
