import './style.css'
import './components/trails/TrailEditor.css'
import { Map } from './components/map/Map'
import { Sidebar } from './components/sidebar/Sidebar'
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
    // Initialisation du panneau latéral
    new Sidebar(mainContent)
    
    // Initialisation de la carte
    new Map(mainContent)
  } else {
    // Le conteneur principal n'a pas été trouvé
  }
}

// Attendre que le DOM soit chargé
DomUtils.onDomReady(initApp)
