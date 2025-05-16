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
    this.userContainers.forEach(container => {
      const element = container.render();
      if (element && this.container.contains(element)) {
        this.container.removeChild(element);
      }
    });
    const usersContainer = document.querySelector('.users-container');
    if (usersContainer) {
      this.container.removeChild(usersContainer);
    }
    this.userContainers = [];
  }

  private setupUserList(): void {
    const listContainer = document.createElement('div');
    listContainer.className = 'users-container';
    
    const userList = document.createElement('div');
    userList.className = 'user-list';
    
    this.users.forEach(user => {
      this.displayUserOnMap(user);
      const userContainer = new UserContainer(user);
      
      this.userContainers.push(userContainer);
      userList.appendChild(userContainer.render());
    });
    
    listContainer.appendChild(userList);
    this.container.appendChild(listContainer);
  }

  private displayUserOnMap(user: User): void {
      const mapSvg = document.getElementById('map-svg') as HTMLObjectElement;
      
      // // Add new <path> element at the end of the SVG
      // const svg = mapSvg.contentDocument?.querySelector('svg') as Html
      // const newPath = svg?.createElementNS('http://www.w3.org/2000/svg', 'path');
      // newPath.setAttribute('class', 'user3');
      // newPath.setAttribute('d', 'M 0 0 L 10 10');
      // newPath.setAttribute('style', `stroke:white;stroke-width:0.4;fill-rule:nonzero;fill:rgb(244,66,244);fill-opacity:1;`);

      const path = mapSvg.contentDocument?.querySelector('svg')?.querySelector(`path.${user.id}`);
      console.log(path);
      var pathStyle = path?.getAttribute('style')?.replace('display: none;', 'display:initial;').replace('display:none;', 'display:initial;');
      path?.setAttribute('style', pathStyle!);
  }

  private hideUserOnMap(): void {
      for (const u of ["user1", "user2"]) {
          const mapSvg = document.getElementById('map-svg') as HTMLObjectElement;
          const path = mapSvg.contentDocument?.querySelector('svg')?.querySelector(`path.${u}`);
          var pathStyle = path?.getAttribute('style')?.replace('display: initial;', 'display:none;').replace('display:initial;', 'display:none;');
          path?.setAttribute('style', pathStyle!);
      }
  } 
} 