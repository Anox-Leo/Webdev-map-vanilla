export class User {
    public id?: string;
    public name?: string;
    public color?: string;
    public position?: { x: number; y: number };
    public isCurrentUser: boolean = false;
}