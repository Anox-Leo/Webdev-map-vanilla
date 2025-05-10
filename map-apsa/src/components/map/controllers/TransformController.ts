export class TransformController {
  // Paramètres de transformation de la carte
  private scale: number = 1.0;
  private posX: number = 0;
  private posY: number = 0;
  private minScale: number = 0.5;
  private maxScale: number = 5.0;
  private zoomStep: number = 0.1;
  private rotateX: number = 40; // Degré d'inclinaison de la carte
  private rotateZ: number = 0; // Rotation horizontale (boussole)
  
  // Élément de carte SVG
  private mapSvg: HTMLObjectElement;

  constructor(mapSvg: HTMLObjectElement) {
    this.mapSvg = mapSvg;
    this.updateMapTransform();
  }

  /**
   * Augmente l'échelle (zoom avant)
   */
  public zoomIn(): void {
    const newScale = Math.min(this.maxScale, this.scale * (1 + this.zoomStep));
    this.zoomTo(newScale);
  }

  /**
   * Diminue l'échelle (zoom arrière)
   */
  public zoomOut(): void {
    const newScale = Math.max(this.minScale, this.scale / (1 + this.zoomStep));
    this.zoomTo(newScale);
  }

  /**
   * Définit l'échelle à une valeur spécifique
   */
  public zoomTo(newScale: number): void {
    this.scale = newScale;
    this.updateMapTransform();
  }

  /**
   * Effectue un zoom à un point spécifique de la carte
   */
  public zoomAtPoint(newScale: number, clientX: number, clientY: number, container: HTMLElement): void {
    // Limiter l'échelle
    newScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
    
    // Obtenir la position de la carte
    const rect = container.getBoundingClientRect();
    
    // Position du point de zoom par rapport au centre de la carte
    const pointX = clientX - rect.left - rect.width / 2;
    const pointY = clientY - rect.top - rect.height / 2;
    
    // Calculer le décalage nécessaire pour que le point reste sous le curseur
    const scaleFactor = newScale / this.scale;
    const rawOffsetX = pointX - pointX * scaleFactor;
    const rawOffsetY = pointY - pointY * scaleFactor;
    
    // Ajuster le décalage vertical en fonction de l'inclinaison
    const inclinationFactor = Math.cos(this.rotateX * Math.PI / 180);
    
    // Convertir les coordonnées en tenant compte de la rotation
    // Utiliser -rotationRad pour être cohérent avec la rotation inversée de la carte
    const rotationRad = -this.rotateZ * Math.PI / 180;
    const offsetX = rawOffsetX * Math.cos(rotationRad) + rawOffsetY * Math.sin(rotationRad) * inclinationFactor;
    const offsetY = -rawOffsetX * Math.sin(rotationRad) + rawOffsetY * Math.cos(rotationRad) * inclinationFactor;
    
    // Mettre à jour l'échelle et la position
    this.scale = newScale;
    this.posX += offsetX;
    this.posY += offsetY;
    
    this.updateMapTransform();
  }

  /**
   * Réinitialise la vue aux valeurs par défaut
   */
  public resetView(): void {
    this.scale = 1.0;
    this.posX = 0;
    this.posY = 0;
    this.rotateZ = 0; // Réinitialiser aussi la rotation
    this.updateMapTransform();
  }

  /**
   * Réinitialise la rotation à 0 (North)
   */
  public resetRotation(): void {
    this.rotateZ = 0;
    this.updateMapTransform();
  }

  /**
   * Met à jour la position de la carte
   */
  public updatePosition(deltaX: number, deltaY: number): void {
    this.posX += deltaX;
    this.posY += deltaY;
    this.updateMapTransform();
  }

  /**
   * Met à jour l'angle de rotation
   */
  public updateRotation(rotateZ: number): void {
    this.rotateZ = rotateZ;
    this.updateMapTransform();
  }

  /**
   * Applique les transformations à l'élément SVG
   */
  public updateMapTransform(): void {
    if (!this.mapSvg) return;
    
    // Appliquer la transformation avec l'inclinaison 3D et la rotation
    // Inverser la rotation en utilisant -this.rotateZ pour que la carte tourne dans la direction opposée du handle
    this.mapSvg.style.transform = `rotateX(${this.rotateX}deg) rotateZ(${-this.rotateZ}deg) scale(${this.scale}) translate(${this.posX}px, ${this.posY}px)`;
  }

  // Getters pour les propriétés
  public getScale(): number {
    return this.scale;
  }

  public getRotateX(): number {
    return this.rotateX;
  }

  public getRotateZ(): number {
    return this.rotateZ;
  }

  public getZoomStep(): number {
    return this.zoomStep;
  }
} 