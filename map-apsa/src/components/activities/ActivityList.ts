import { Activity } from "./ActivityTypes";
import { ActivityCard } from "./ActivityCard";

export class ActivityList {
  private container: HTMLElement;
  private activities: Activity[] = [];
  private currentUserId: string;
  private joinHandler: ((activity: Activity) => void) | null = null;
  private leaveHandler: ((activity: Activity) => void) | null = null;
  private manageHandler: ((activity: Activity) => void) | null = null;
  private createHandler: (() => void) | null = null;

  constructor(
    container: HTMLElement,
    activities: Activity[],
    currentUserId: string,
  ) {
    this.container = container;
    this.activities = activities;
    this.currentUserId = currentUserId;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = "";

    // Header avec bouton créer
    const header = document.createElement("div");
    header.className = "activities-header";
    header.innerHTML = `
      <h2 class="activities-title">🏃 Activités</h2>
      <button class="action-btn create-activity-btn" id="create-activity-btn">
        <span>+</span> Créer une activité
      </button>
    `;
    this.container.appendChild(header);

    const createBtn = header.querySelector("#create-activity-btn");
    if (createBtn && this.createHandler) {
      createBtn.addEventListener("click", () => this.createHandler!());
    }

    // Filtres
    const filters = document.createElement("div");
    filters.className = "activities-filters";
    filters.innerHTML = `
      <button class="filter-btn active" data-filter="all">Toutes</button>
      <button class="filter-btn" data-filter="open">Ouvertes</button>
      <button class="filter-btn" data-filter="my">Mes activités</button>
    `;
    this.container.appendChild(filters);

    // Setup filter listeners
    const filterBtns = filters.querySelectorAll(".filter-btn");
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        filterBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const filter = (e.target as HTMLElement).getAttribute("data-filter");
        this.applyFilter(filter || "all");
      });
    });

    // Liste des activités
    const listContainer = document.createElement("div");
    listContainer.className = "activities-list";
    listContainer.id = "activities-list";

    if (this.activities.length === 0) {
      listContainer.innerHTML = `
        <div class="activities-empty">
          <p>Aucune activité disponible pour le moment.</p>
          <p>Soyez le premier à en créer une !</p>
        </div>
      `;
    } else {
      this.activities.forEach((activity) => {
        const card = new ActivityCard(activity, this.currentUserId);
        if (this.joinHandler) card.setJoinHandler(this.joinHandler);
        if (this.leaveHandler) card.setLeaveHandler(this.leaveHandler);
        if (this.manageHandler) card.setManageHandler(this.manageHandler);
        listContainer.appendChild(card.render());
      });
    }

    this.container.appendChild(listContainer);
  }

  private applyFilter(filter: string): void {
    const listContainer = document.getElementById("activities-list");
    if (!listContainer) return;

    listContainer.innerHTML = "";

    let filteredActivities = this.activities;

    switch (filter) {
      case "open":
        filteredActivities = this.activities.filter((a) => a.status === "open");
        break;
      case "my":
        filteredActivities = this.activities.filter(
          (a) =>
            a.creatorId === this.currentUserId ||
            a.participants.some((p) => p.id === this.currentUserId),
        );
        break;
    }

    if (filteredActivities.length === 0) {
      listContainer.innerHTML = `
        <div class="activities-empty">
          <p>Aucune activité trouvée avec ce filtre.</p>
        </div>
      `;
    } else {
      filteredActivities.forEach((activity) => {
        const card = new ActivityCard(activity, this.currentUserId);
        if (this.joinHandler) card.setJoinHandler(this.joinHandler);
        if (this.leaveHandler) card.setLeaveHandler(this.leaveHandler);
        if (this.manageHandler) card.setManageHandler(this.manageHandler);
        listContainer.appendChild(card.render());
      });
    }
  }

  public updateActivities(activities: Activity[]): void {
    this.activities = activities;
    this.render();
  }

  public setJoinHandler(handler: (activity: Activity) => void): void {
    this.joinHandler = handler;
  }

  public setLeaveHandler(handler: (activity: Activity) => void): void {
    this.leaveHandler = handler;
  }

  public setManageHandler(handler: (activity: Activity) => void): void {
    this.manageHandler = handler;
  }

  public setCreateHandler(handler: () => void): void {
    this.createHandler = handler;
    // Re-render to attach the handler
    this.render();
  }
}
