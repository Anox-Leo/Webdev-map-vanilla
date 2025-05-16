export interface TrailDetail {
    id: string;
    photos: string[];
    descriptions: string[];
    alts: string[];
    longitude: float[];
    latitude: float[];
}

export const trailDetails: TrailDetail[] = [
    {
        id: 'trail-1',
        photos: [
            '/assets/images/trailOne/1.jpg',
            '/assets/images/trailOne/2.jpg',
            '/assets/images/trailOne/3.jpg',
            '/assets/images/trailOne/4.jpg',
        ],
        descriptions: [
            'Regarde le soleil pendant 1 minute sans fermer les yeux et essaye de marcher vers l\'Est sur 700 pas.',
            'Suit le chat de youcef jusqu\'au prochain indice.',
            'Cherche un sous-sol et rentre dedans.',
            'Fais une offrande au dieu sous l\'Erdre.',
        ],
        alts: [
            'Le soleil',
            'Le chat de Youcef',
            'Une entrée cachée dans le sol',
            'Un autel',
        ],
        longitude: [
            47.291291,
            47.289134,
            47.288115,
            47.288043,
        ],
        latitude: [
            -1.528708,
            -1.526921,
            -1.523046,
            -1.529581,
        ],
    },
    {
        id: 'trail-2',
        photos: [
            '/assets/images/trailTwo/1.jpg',
            '/assets/images/trailTwo/2.jpg',
            '/assets/images/trailTwo/3.jpg',
            '/assets/images/trailTwo/4.jpg',
        ],
        descriptions: [
            'La flemme de sortir un indice',
            'La flemme de sortir un indice',
            'La flemme de sortir un indice',
            'La flemme de sortir un indice',
        ],
        alts: [
            'premier alt',
            'deuxième alt',
            'troisième alt',
            'quatrième alt',
        ],
        longitude: [
            47.291291,
            47.289134,
            47.288115,
            47.288043,
        ],
        latitude: [
            -1.528708,
            -1.526921,
            -1.523046,
            -1.529581,
        ],
    },
];