import { User } from "./User";
import { UserContainer } from "./UserContainer";

export class UserList {
  private container: HTMLElement;
  private users: User[] = [];
  private userContainers: UserContainer[] = [];

  constructor(container: HTMLElement, users: User[] = []) {
    this.container = container;
    this.users = users;
    this.setupUserList();
  }

  public updateUsers(users: User[]): void {
    this.hideUserOnMap();
    this.users = users;
    this.clearUserContainers();
    this.setupUserList();
  }

  private clearUserContainers(): void {
    this.userContainers.forEach((container) => {
      const element = container.render();
      if (element && this.container.contains(element)) {
        this.container.removeChild(element);
      }
    });
    const usersContainer = document.querySelector(".users-container");
    if (usersContainer) {
      this.container.removeChild(usersContainer);
    }
    this.userContainers = [];
  }

  private setupUserList(): void {
    const listContainer = document.createElement("div");
    listContainer.className = "users-container";

    const userList = document.createElement("div");
    userList.className = "user-list";

    this.users.forEach((user) => {
      // N'afficher le cercle sur la carte que si l'utilisateur n'est pas offline
      if (user.status !== "offline") {
        this.displayUserOnMap(user);
      }
      const userContainer = new UserContainer(user);

      this.userContainers.push(userContainer);
      userList.appendChild(userContainer.render());
    });

    listContainer.appendChild(userList);
    this.container.appendChild(listContainer);
  }

  private addUserOnMap(user: User): void {
    const mapSvg = document.getElementById("map-svg") as HTMLObjectElement;
    const svgDoc = mapSvg?.contentDocument;
    const newPath = svgDoc?.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    newPath?.setAttribute("class", user.id!);
    newPath?.setAttribute(
      "style",
      `display:none;stroke:white;stroke-width:0.4;fill-rule:nonzero;fill:${user.color};fill-opacity:1;`,
    );
    newPath?.setAttribute("d", this.calculatePath(user));
    console.log(mapSvg);
    const svgElement = svgDoc?.querySelector("svg");
    svgElement?.appendChild(newPath!);
  }

  private calculatePath(user: User): string {
    const deltas = [
      [-0.890625, 3.023438],
      [-2.382813, 2.070312],
      [-3.125, 0.445313],
      [-2.867187, -1.3125],
      [-1.710938, -2.648438],
      [0, -3.15625],
      [1.710938, -2.65625],
      [2.867187, -1.3125],
      [3.125, 0.453125],
      [2.382813, 2.0625],
      [0.890625, 3.03125],
    ];

    let x = user.position?.x!;
    let y = user.position?.y!;
    let path = `M ${x} ${y}`;

    for (const [dx, dy] of deltas) {
      x += dx;
      y += dy;
      path += ` L ${x} ${y}`;
    }

    path += ` L ${user.position?.x} ${user.position?.y}`;

    return path;
  }

  private displayUserOnMap(user: User): void {
    this.addUserOnMap(user);
    const mapSvg = document.getElementById("map-svg") as HTMLObjectElement;
    const path = mapSvg.contentDocument
      ?.querySelector("svg")
      ?.querySelector(`path.${user.id}`);
    var pathStyle = path
      ?.getAttribute("style")
      ?.replace("display: none;", "display:initial;")
      .replace("display:none;", "display:initial;");
    path?.setAttribute("style", pathStyle!);
  }

  private hideUserOnMap(): void {
    for (const u of ["user1", "user2", "user3"]) {
      const mapSvg = document.getElementById("map-svg") as HTMLObjectElement;
      const path = mapSvg.contentDocument
        ?.querySelector("svg")
        ?.querySelector(`path.${u}`);
      var pathStyle = path
        ?.getAttribute("style")
        ?.replace("display: initial;", "display:none;")
        .replace("display:initial;", "display:none;");
      path?.setAttribute("style", pathStyle!);
    }
  }
}
