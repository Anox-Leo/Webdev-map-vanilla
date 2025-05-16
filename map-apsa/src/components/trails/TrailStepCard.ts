export class TrailStepCard {
    private photo: string;
    private description: string;
    private alt: string;

    constructor(photo: string, description: string, alt: string) {
        this.photo = photo;
        this.description = description;
        this.alt = alt;
    }

    public render(): HTMLElement {
        const card = document.createElement('div');
        card.className = 'trail-step-card';

        card.innerHTML = `
        <div class="trail-image">
            <img src="${this.photo}" alt="${this.alt}">
        </div>
        <div class="trail-info">
            <h1 class="trail-name">${this.description}</h1>
        </div>
        `;
        return card;
    }
}