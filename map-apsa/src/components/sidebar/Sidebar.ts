import "./Sidebar.css";
import "../trails/Trails.css";
import "../activities/Activity.css";
import { TrailsList } from "../trails/TrailsList";
import { getTrails } from "../trails/TrailsData";
import { Trail } from "../trails/TrailCard";
import { trailDetails } from "../trails/TrailDetailsData";
import { TrailStepCard } from "../trails/TrailStepCard";
import { ActivityList } from "../activities/ActivityList";
import { ActivityCreator } from "../activities/ActivityCreator";
import { ActivityManager } from "../activities/ActivityManager";
import { Activity } from "../activities/ActivityTypes";
import { WebSocketClient } from "../../utils/WebSocketClient";
import { User } from "../users/User";

export class Sidebar {
  private container: HTMLElement;
  private sidebarTemplate = `
    <div class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <img src="./assets/images/apsa-logo.png" alt="APSA Logo" class="sidebar-logo" />
        <h1>APSA Carte Interactive</h1>
      </div>
      
      <div class="sidebar-tabs">
        <button class="sidebar-tab active" data-tab="trails">🗺️ Parcours</button>
        <button class="sidebar-tab" data-tab="activities">🏃 Activités</button>
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
  private activityList: ActivityList | null = null;
  private _pendingTrailEditorController: any | null = null;
  private selectedTrail: Trail | null = null;
  private currentTab: "trails" | "activities" = "trails";
  private webSocketClient: WebSocketClient;

  constructor(container: HTMLElement) {
    this.container = container;
    this.webSocketClient = WebSocketClient.getInstance();
    this.render();
    this.setupEventListeners();
    this.setupTabListeners();
    this.restoreCollapseState();
    this.loadTrails();

    // Écouter l'événement d'initialisation de la carte
    document.addEventListener("mapInitialized", (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.mapInstance) {
        this.connectToMapController(customEvent.detail.mapInstance);
      }
    });

    // Ajouter un écouteur pour la création de nouveaux parcours
    document.addEventListener("trailCreationFinished", ((e: Event) => {
      const customEvent = e as CustomEvent;
      console.log("Événement trailCreationFinished reçu:", customEvent.detail);

      // Recharger les parcours pour inclure le nouveau
      this.loadTrails();
    }) as EventListener);
  }

  private render(): void {
    const sidebarWrapper = document.createElement("div");
    sidebarWrapper.innerHTML = this.sidebarTemplate;

    this.container.appendChild(sidebarWrapper.firstElementChild as HTMLElement);
    this.sidebarElement = document.getElementById("sidebar");

    const toggleButtonWrapper = document.createElement("div");
    toggleButtonWrapper.innerHTML = this.toggleButtonTemplate;

    this.container.appendChild(
      toggleButtonWrapper.firstElementChild as HTMLElement,
    );
    this.toggleButtonElement = document.getElementById(
      "toggle-button-container",
    );
  }

  private setupEventListeners(): void {
    const resetButton = document.getElementById("sidebar-reset");
    const actionButton = document.getElementById("sidebar-action");
    const toggleButton = document.getElementById("sidebar-toggle");

    if (resetButton) {
      resetButton.addEventListener("click", () => {
        this.resetContent();
      });
    }

    if (actionButton) {
      actionButton.addEventListener("click", () => {
        this.performAction();
      });
    }

    if (toggleButton) {
      toggleButton.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleSidebar();
      });
    }

    const mediaQuery = window.matchMedia("(max-width: 480px)");
    this.handleResponsiveLayout(mediaQuery);
    mediaQuery.addEventListener("change", (e) =>
      this.handleResponsiveLayout(e),
    );

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !this.isCollapsed) {
        this.toggleSidebar();
      }
    });
  }

  private setupTabListeners(): void {
    const tabs = document.querySelectorAll(".sidebar-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabName = tab.getAttribute("data-tab") as "trails" | "activities";
        this.switchTab(tabName);
      });
    });
  }

  private switchTab(tab: "trails" | "activities"): void {
    this.currentTab = tab;

    // Mettre à jour les classes actives des onglets
    const tabs = document.querySelectorAll(".sidebar-tab");
    tabs.forEach((t) => {
      if (t.getAttribute("data-tab") === tab) {
        t.classList.add("active");
      } else {
        t.classList.remove("active");
      }
    });

    // Charger le contenu approprié
    if (tab === "trails") {
      this.loadTrails();
    } else {
      this.loadActivities();
    }
  }

  private async loadActivities(): Promise<void> {
    const contentContainer = document.getElementById("sidebar-content");
    if (!contentContainer) return;

    contentContainer.innerHTML =
      '<div class="loading">Chargement des activités...</div>';

    try {
      const activities = await this.webSocketClient.getActivities();
      const users = await this.webSocketClient.getUsers();
      const currentUser = this.webSocketClient.getCurrentUser();

      contentContainer.innerHTML = "";

      this.activityList = new ActivityList(
        contentContainer,
        activities,
        currentUser?.id || "",
      );

      this.activityList.setJoinHandler((activity: Activity) => {
        if (currentUser) {
          this.webSocketClient.joinActivity(activity.id, currentUser);
          this.loadActivities();
        }
      });

      this.activityList.setLeaveHandler((activity: Activity) => {
        if (currentUser) {
          this.webSocketClient.leaveActivity(activity.id, currentUser.id!);
          this.loadActivities();
        }
      });

      this.activityList.setManageHandler((activity: Activity) => {
        this.showActivityManager(activity);
      });

      this.activityList.setCreateHandler(() => {
        this.showActivityCreator();
      });

      // Écouter les mises à jour des activités
      this.webSocketClient.onActivitiesUpdate((updatedActivities) => {
        if (this.currentTab === "activities" && this.activityList) {
          this.activityList.updateActivities(updatedActivities);
        }
      });
    } catch (error) {
      contentContainer.innerHTML =
        '<div class="error">Erreur lors du chargement des activités.</div>';
    }
  }

  private showActivityManager(activity: Activity): void {
    const manager = new ActivityManager(
      activity,
      document.body,
      () => {
        this.loadActivities();
      },
      (updatedActivity: Activity) => {
        this.loadActivities();
      },
    );
    manager.render();
  }

  private async showActivityCreator(): Promise<void> {
    const contentContainer = document.getElementById("sidebar-content");
    if (!contentContainer) return;

    const users = await this.webSocketClient.getUsers();
    const currentUser = this.webSocketClient.getCurrentUser();

    if (!currentUser) {
      contentContainer.innerHTML =
        '<div class="error">Vous devez être connecté pour créer une activité.</div>';
      return;
    }

    contentContainer.innerHTML = "";

    const creator = new ActivityCreator(contentContainer, currentUser, users);

    creator.setCreateHandler((activity: Activity) => {
      this.webSocketClient.createActivity(activity);
      this.loadActivities();
    });

    creator.setCancelHandler(() => {
      this.loadActivities();
    });
  }

  private toggleSidebar(): void {
    if (!this.sidebarElement) return;

    this.isCollapsed = !this.isCollapsed;

    if (this.isCollapsed) {
      this.sidebarElement.classList.add("collapsed");
      this.sidebarElement.classList.remove("open");
    } else {
      this.sidebarElement.classList.remove("collapsed");

      const mediaQuery = window.matchMedia("(max-width: 480px)");
      if (mediaQuery.matches) {
        this.sidebarElement.classList.add("open");
      }
    }

    localStorage.setItem("sidebar_collapsed", this.isCollapsed.toString());
    window.dispatchEvent(new Event("resize"));
  }

  private restoreCollapseState(): void {
    const savedState = localStorage.getItem("sidebar_collapsed");

    if (savedState === "true") {
      this.isCollapsed = true;
      this.sidebarElement?.classList.add("collapsed");
    }
  }

  private handleResponsiveLayout(
    e: MediaQueryListEvent | MediaQueryList,
  ): void {
    if (e.matches) {
      if (this.toggleButtonElement) {
        this.toggleButtonElement.style.display = "block";
        this.toggleButtonElement.style.left = "0";
        this.toggleButtonElement.style.top = "50%";
        this.toggleButtonElement.style.position = "fixed";
      }

      const toggleButtonMobile = document.getElementById("sidebar-toggle-btn");
      if (toggleButtonMobile) {
        toggleButtonMobile.remove();
      }
    } else {
      if (this.toggleButtonElement) {
        this.toggleButtonElement.style.position = "";
        this.toggleButtonElement.style.left = "";
        this.toggleButtonElement.style.top = "";
        this.toggleButtonElement.style.display = "";
      }

      const toggleButton = document.getElementById("sidebar-toggle-btn");
      if (toggleButton) {
        toggleButton.remove();
      }
    }
  }

  public updateContent(content: string): void {
    const contentContainer = document.getElementById("sidebar-content");
    if (contentContainer) {
      contentContainer.innerHTML = content;
    }
  }

  private resetContent(): void {
    if (this.currentTab === "trails") {
      this.loadTrails();
    } else {
      this.loadActivities();
    }
  }

  private performAction(): void {
    const selectedTrail = this.trailsList?.getSelectedTrail();

    if (selectedTrail) {
      console.log("Action sur le parcours:", selectedTrail.name);
    }
  }

  private async loadTrails(): Promise<void> {
    const contentContainer = document.getElementById("sidebar-content");
    if (!contentContainer) return;

    contentContainer.innerHTML =
      '<div class="loading">Chargement des parcours...</div>';

    try {
      const trails = await getTrails();

      contentContainer.innerHTML = "";

      this.trailsList = new TrailsList(contentContainer, trails);

      // Si un contrôleur de parcours est en attente, le connecter maintenant
      if (this._pendingTrailEditorController) {
        this.trailsList.setTrailEditorController(
          this._pendingTrailEditorController,
        );
        this._pendingTrailEditorController = null;
      }

      this.trailsList.setTrailSelectHandler((trail: Trail) => {
        this.handleTrailSelection(trail);
      });
    } catch (error) {
      contentContainer.innerHTML =
        '<div class="error">Erreur lors du chargement des parcours.</div>';
    }
  }

  private showTrailDetails(trailId: string): void {
    const contentContainer = document.getElementById("sidebar-content");
    if (!contentContainer) return;

    const trailDetail = trailDetails.find((detail) => detail.id === trailId);
    if (!trailDetail) {
      contentContainer.innerHTML =
        '<div class="error">Détails non disponibles pour ce parcours.</div>';
      return;
    }

    let currentIndex = 0;

    const renderHint = (index: number) => {
      const card = new TrailStepCard(
        trailDetail.photos[index],
        trailDetail.descriptions[index],
        trailDetail.alts[index],
      );
      const detailsContainer = contentContainer.querySelector(".trail-details");
      if (detailsContainer) {
        detailsContainer.appendChild(card.render()); // Ajoute le nouvel indice
      }
    };

    contentContainer.innerHTML = `
    <div class="trail-details"></div>
    <button class="action-btn secondary" id="next-hint">Prochain indice</button>
    <button class="action-btn secondary" id="back-to-trails">Retour</button>
  `;

    renderHint(currentIndex);

    const nextHintButton = document.getElementById("next-hint");
    if (nextHintButton) {
      nextHintButton.addEventListener("click", () => {
        currentIndex++;
        renderHint(currentIndex);

        // Masque le bouton si tous les indices sont affichés
        if (currentIndex === trailDetail.photos.length - 1) {
          nextHintButton.style.display = "none";
        }
      });
    }

    const backButton = document.getElementById("back-to-trails");
    if (backButton) {
      backButton.addEventListener("click", () => {
        this.resetContent();
        this.hideTrailOnMap();
      });
    }
  }

  private handleTrailSelection(trail: Trail): void {
    console.log(`Parcours sélectionné: ${trail.name}`);
    this.showTrailDetails(trail.id);
    this.selectedTrail = trail;
  }

  private hideTrailOnMap(): void {
    const mapSvg = document.getElementById("map-svg") as HTMLObjectElement;
    const paths = mapSvg.contentDocument
      ?.querySelector("svg")
      ?.querySelectorAll("path." + this.selectedTrail?.id!);

    for (const path of paths!) {
      var pathStyle = path
        ?.getAttribute("style")
        ?.replace("rgb(66,133,244);", "rgb(255,255,255);");
      if (path?.getAttribute("class")?.includes("ch")) {
        pathStyle = path
          ?.getAttribute("style")
          ?.replace("stroke-opacity:1;", "stroke-opacity:0.4;")
          .replace("rgb(66,133,244);", "rgb(255,255,255);");
      }
      path?.setAttribute("style", pathStyle!);
    }
  }

  /**
   * Connecte cette sidebar au contrôleur de carte
   */
  private connectToMapController(mapInstance: any): void {
    if (!mapInstance || !mapInstance.getMapController) return;

    const mapController = mapInstance.getMapController();
    if (!mapController) return;

    const trailEditorController = mapController.getTrailEditorController();
    if (!trailEditorController) return;

    // Connecter le contrôleur d'édition de parcours à la liste des parcours
    if (this.trailsList) {
      this.trailsList.setTrailEditorController(trailEditorController);
    } else {
      // Si la liste n'est pas encore créée, on garde une référence au contrôleur
      // pour le connecter plus tard
      this._pendingTrailEditorController = trailEditorController;
    }
  }
}
