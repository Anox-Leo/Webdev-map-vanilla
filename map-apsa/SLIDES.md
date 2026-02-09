# Guide de Présentation - Carte Interactive Collaborative APSA

> Ce document sert de guide pour la création des slides de présentation du projet.
> Durée totale : 10 minutes de présentation + 5 minutes de démo
>
> **Concepts CSCW intégrés** : Ce projet s'appuie sur les fondements théoriques du Computer-Supported Cooperative Work (CSCW) et des systèmes groupware.

---

## SLIDE 1 : Page de Titre

**Contenu :**

- Titre : "APSA - Carte Interactive Collaborative"
- Sous-titre : "Un système Groupware pour l'organisation d'activités sportives"
- Mention : "Approche CSCW - Collaboration Synchrone Distribuée"
- Noms des membres du groupe
- Date : Février 2026
- Logo APSA (disponible dans `/public/assets/images/apsa-logo.png`)

---

## SLIDE 2 : Sommaire

**Contenu :**

1. Présentation du projet et contexte CSCW
2. Types de collaboration (Matrice Espace-Temps)
3. Approche Multi-écrans et Awareness
4. Contrôles de l'application
5. Difficultés et solutions
6. Démo

---

## SLIDE 3 : Présentation du Projet (1/2)

**Titre :** Contexte et Objectifs CSCW

**Contenu :**

- **Définition CSCW** : Computer-Supported Cooperative Work
  - Discipline étudiant comment les systèmes informatiques peuvent supporter le travail collaboratif
- **Notre système Groupware** :
  - Application collaborative multi-utilisateurs
  - Support d'activités de groupe en temps réel
  - Coordination d'actions entre participants distants

- **Problématique** : Comment coordonner des activités sportives de groupe avec des utilisateurs géographiquement distribués ?

- **Solution APSA** : Un système groupware permettant :
  - La **conscience mutuelle** (awareness) de la présence des autres
  - La **coordination** des activités sportives
  - La **communication** implicite via les statuts

**Visuel suggéré :** Schéma CSCW avec les 3C (Communication, Coordination, Coopération)

---

## SLIDE 4 : Présentation du Projet (2/2)

**Titre :** Stack Technique & Modèle des 3C

**Contenu :**

**Le Modèle des 3C du Groupware :**

```
┌─────────────────────────────────────────────┐
│              COOPÉRATION                     │
│   (Activités partagées, parcours communs)   │
├─────────────────────────────────────────────┤
│            COORDINATION                      │
│  (Gestion des activités, invitations)       │
├─────────────────────────────────────────────┤
│           COMMUNICATION                      │
│    (WebSocket, statuts, notifications)      │
└─────────────────────────────────────────────┘
```

**Stack Technique :**
| Technologie | Utilisation | Rôle CSCW |
|-------------|-------------|-----------|
| TypeScript | Frontend | Interface groupware |
| WebSocket natif | Communication temps réel | Canal de coordination |
| LocalStorage | Persistance | Mémoire partagée locale |
| CSS3 | Styles et animations | Feedback visuel |

**Architecture :**

```
Frontend (Vite + TS) <--WebSocket--> Serveur WebSocket (Node.js)
                           │
                    Broadcast à tous
                    les utilisateurs
```

---

## SLIDE 5 : Types de Collaboration (1/2)

**Titre :** Positionnement dans la Matrice Espace-Temps

**Contenu - Matrice de Johansen (1988) :**

```
                    MÊME LIEU          LIEUX DIFFÉRENTS
                 ┌────────────────┬────────────────────────┐
   MÊME          │   Face-à-face  │   Synchrone Distribué  │
   TEMPS         │   (réunion)    │   ★ NOTRE SYSTÈME ★    │
                 ├────────────────┼────────────────────────┤
   TEMPS         │   Asynchrone   │   Asynchrone Distribué │
   DIFFÉRENT     │   Colocalisé   │   (email, forum)       │
                 └────────────────┴────────────────────────┘
```

**APSA = Collaboration Synchrone Distribuée :**

- Utilisateurs à des **lieux différents** (distribués géographiquement)
- Interactions en **temps réel** (synchrone via WebSocket)
- Activités **coordonnées** (création, inscription, démarrage)

**Awareness (Conscience de groupe) :**

- **Awareness de présence** : Qui est connecté ? Où sont-ils ?
- **Awareness d'activité** : Que font les autres ? Quelles activités sont en cours ?
- **Awareness de disponibilité** : Statuts 🟢 🟡 🔴 ⚫

**Visuel suggéré :** Matrice avec notre position mise en évidence

---

## SLIDE 6 : Types de Collaboration (2/2)

**Titre :** Implémentation des Mécanismes Collaboratifs

**Contenu :**

**Couplage Synchrone (Tight Coupling) :**

- Toute action d'un utilisateur est immédiatement visible par les autres
- Pattern WYSIWIS (What You See Is What I See) pour la carte
- Cohérence forte : même vue pour tous les participants

**Protocole de communication :**

```
┌─────────┐    status_update     ┌─────────┐
│ Client A│ ────────────────────→│ Serveur │
└─────────┘                      └────┬────┘
                                      │ broadcast
     ┌────────────────────────────────┼────────────────────┐
     ↓                                ↓                    ↓
┌─────────┐                    ┌─────────┐          ┌─────────┐
│ Client B│                    │ Client C│          │ Client D│
└─────────┘                    └─────────┘          └─────────┘
```

**Types de messages synchrones :**
| Message | Déclencheur | Effet CSCW |
|---------|-------------|------------|
| `status_update` | Changement d'état | Awareness de disponibilité |
| `activity_create` | Nouvelle activité | Coordination |
| `activity_join` | Inscription | Coopération |
| `activity_leave` | Désinscription | Mise à jour collective |

**Code clé - Broadcast :**

```javascript
function broadcastToAll(message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}
```

---

## SLIDE 7 : Multiscreen Approach - Diagramme des 9 écrans

**Titre :** Approche Multi-écrans & Espaces de Travail Partagés

**Contenu :**

**Concept Groupware : Espace Partagé (Shared Workspace)**

- La carte = espace de travail commun visible par tous
- Chaque utilisateur a sa propre vue mais partage les données
- Couplage WYSIWIS (What You See Is What I See) relaxé

**Diagramme des écrans :**

| Écran                     | Type d'espace            | Interactions CSCW           |
| ------------------------- | ------------------------ | --------------------------- |
| **1. Carte principale**   | Espace partagé synchrone | Awareness de position       |
| **2. Liste Parcours**     | Espace privé             | Consultation individuelle   |
| **3. Détails Parcours**   | Espace privé             | Navigation personnelle      |
| **4. Liste Activités**    | Espace partagé           | Coordination de groupe      |
| **5. Création Activité**  | Espace privé → partagé   | Initiation de collaboration |
| **6. Détails Activité**   | Espace partagé           | Coopération active          |
| **7. Bulle Utilisateurs** | Awareness widget         | Conscience de présence      |
| **8. Éditeur Parcours**   | Espace privé             | Contribution individuelle   |
| **9. Paramètres**         | Espace privé             | Configuration personnelle   |

**Visuel suggéré :** Schéma avec zones privées/partagées identifiées

---

## SLIDE 8 : Multiscreen - Flux Utilisateur & Floor Control

**Titre :** Parcours Utilisateur et Contrôle de Concurrence

**Contenu :**

**Floor Control (Contrôle du "sol") dans APSA :**

- **Implicit floor** : Pas de verrou explicite sur les ressources
- Chaque utilisateur peut créer librement des activités
- Gestion optimiste des conflits (dernière écriture gagne)

**Flux de création d'activité collaborative :**

```
┌──────────────────┐
│ Connexion WS     │ ← Awareness : "Qui est là ?"
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Carte principale │ ← WYSIWIS : Même carte pour tous
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Onglet Activités │ ← Coordination : Voir les activités
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Créer activité   │ ← Initiative individuelle
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Inviter membres  │ ← Sélection parmi les "en ligne"
└────────┬─────────┘
         │
    BROADCAST à tous
         ↓
┌──────────────────┐
│ Notification     │ ← Awareness : Nouvelle activité !
│ aux autres       │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ Rejoindre        │ ← Coopération : Formation du groupe
└──────────────────┘
```

**Visuel suggéré :** Flowchart avec annotations CSCW

---

## SLIDE 9 : Contrôles de l'Application (1/2)

**Titre :** Mécanismes d'Awareness et Contrôles Système

**Contenu :**

**Awareness Widgets (Widgets de conscience) :**
| Widget | Information fournie | Mise à jour |
|--------|---------------------|-------------|
| **Indicateur statut** | Disponibilité utilisateur | Temps réel |
| **Liste connectés** | Présence sur la carte | Temps réel |
| **Badge activité** | Nombre de participants | À chaque join/leave |
| **Notification** | Nouvelles activités | Push immédiat |

**Contrôles de navigation :**
| Contrôle | Fonction | Pattern CSCW |
|----------|----------|--------------|
| **Onglets Sidebar** | Basculer Parcours ↔ Activités | Changement de contexte |
| **Toggle Sidebar** | Replier/Déplier panneau | Focus sur la carte |
| **Filtres Activités** | Toutes / Ouvertes / Mes activités | Réduction de surcharge |
| **Réinitialiser** | Retour à l'écran principal | Reset de l'espace de travail |

**Raccourcis et responsive :**

- `Escape` : Fermer la sidebar
- Adaptation automatique mobile/desktop

---

## SLIDE 10 : Contrôles de l'Application (2/2)

**Titre :** Gestion des États et Protocoles de Présence

**Contenu :**

**Protocole de Présence (Presence Protocol) :**

- Inspiré des protocoles de messagerie instantanée (XMPP/Jabber)
- Permet l'awareness de disponibilité en temps réel

**États Utilisateur (Presence States) :**

| État        | Icône | Signification                | Action automatique         |
| ----------- | ----- | ---------------------------- | -------------------------- |
| **Online**  | 🟢    | Actif et disponible          | À la connexion             |
| **Away**    | 🟡    | Connecté mais inactif        | Après 5min d'inactivité\*  |
| **Busy**    | 🔴    | En activité, ne pas déranger | En rejoignant une activité |
| **Offline** | ⚫    | Déconnecté                   | À la fermeture             |

\*Fonctionnalité prévue

**États Activité (Activity Lifecycle) :**

```
OPEN ──→ IN_PROGRESS ──→ COMPLETED
  │                          ↑
  └──→ CANCELLED ────────────┘
```

**Gestion des déconnexions (Failure Handling) :**

- Événement `beforeunload` : Notification proactive au serveur
- Événement `close` WebSocket : Détection côté serveur
- Broadcast du nouveau statut "offline" à tous

---

## SLIDE 11 : Écueils du Projet (1/2)

**Titre :** Défis CSCW Rencontrés

**Contenu :**

1. **Problème de Latence (Network Lag)**
   - _Défi CSCW_ : Maintenir l'illusion de synchronicité
   - _Problème_ : Latence lors de connexions multiples
   - _Solution_ : Pattern Singleton + délai de 100ms pour garantir l'ordre
   - _Compromis_ : Cohérence vs Disponibilité (théorème CAP)

2. **Persistance et État Partagé**
   - _Défi CSCW_ : Mémoire de groupe (Group Memory)
   - _Problème_ : Pas de base de données backend centralisée
   - _Solution_ : LocalStorage côté client
   - _Limitation_ : Données non partagées entre navigateurs différents

3. **Utilisateurs "Fantômes" (Stale Presence)**
   - _Défi CSCW_ : Awareness obsolète après déconnexion brutale
   - _Problème_ : Crash navigateur = utilisateur reste "en ligne"
   - _Solution envisagée_ : Heartbeat + timeout (non implémenté)
   - _Contournement_ : `beforeunload` gère les fermetures normales

---

## SLIDE 12 : Écueils du Projet (2/2)

**Titre :** Limitations et Évolutions vers un Groupware Complet

**Contenu :**

**Limitations actuelles vs Standards Groupware :**

| Fonctionnalité   | Attendu CSCW      | Notre implémentation  |
| ---------------- | ----------------- | --------------------- |
| Authentification | Identité vérifiée | ❌ Attribution auto   |
| Persistance      | Serveur central   | ❌ LocalStorage local |
| Notifications    | Push temps réel   | ❌ Polling implicite  |
| Communication    | Chat/Audio/Vidéo  | ❌ Statuts uniquement |
| Historique       | Log des actions   | ❌ Non implémenté     |

**Évolutions prévues (vers un vrai système CSCW) :**

- ✨ **Replicated Database** : Synchronisation multi-clients avec CRDT
- ✨ **Authentication** : OAuth pour identité utilisateur
- ✨ **Rich Communication** : Chat temps réel, réactions
- ✨ **Activity History** : Journal des activités partagé
- ✨ **Offline-First** : Mode déconnecté avec reconciliation

**Leçons CSCW apprises :**

- La **cohérence éventuelle** est acceptable pour l'awareness
- L'**awareness visuel** (indicateurs) est crucial pour la coordination
- Le **feedback immédiat** améliore la perception de collaboration

---

## SLIDE 13 : Architecture Technique Récapitulative

**Titre :** Architecture Groupware - Vue d'ensemble

**Contenu - Schéma avec concepts CSCW :**

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vite + TS)                         │
│                    ═══════════════════                          │
│                    Couche PRÉSENTATION                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Map.ts    │  │ Sidebar.ts  │  │ UserBubble  │              │
│  │  (Shared    │  │  (Private   │  │  (Awareness │              │
│  │   Space)    │  │   Space)    │  │   Widget)   │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                     │
│         └────────────────┴────────────────┘                     │
│                          ↓                                      │
│              ┌───────────────────────┐                          │
│              │   WebSocketClient.ts  │ ← Session Management     │
│              │     (Singleton)       │ ← Event Distribution     │
│              │   [Coordination Layer]│                          │
│              └───────────┬───────────┘                          │
└──────────────────────────┼──────────────────────────────────────┘
                           │ WebSocket (Full-Duplex)
                           │ Messages JSON
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│                 BACKEND (Node.js)                                │
│                 ═════════════════                                │
│              WebSocketServer.js                                  │
│         ┌─────────────────────────────────┐                      │
│         │  - Connection Manager           │ ← Session Tracking   │
│         │  - Message Router               │ ← Event Dispatch     │
│         │  - Broadcast Engine             │ ← Group Awareness    │
│         │  - Presence Service             │ ← Status Management  │
│         └─────────────────────────────────┘                      │
└──────────────────────────────────────────────────────────────────┘
```

**Annotation** : Cette architecture suit le modèle client-serveur classique du groupware synchrone

---

## SLIDE 14 : Préparation Démo

**Titre :** Démonstration des Fonctionnalités CSCW

**Contenu - Scénario de démo (5 min) :**

1. **Minute 1 : Setup multi-utilisateurs**
   - Ouvrir 2 navigateurs (Chrome + Firefox)
   - Montrer l'**awareness de connexion** : apparition mutuelle
   - Point CSCW : "Voici la conscience de présence en action"

2. **Minute 2 : Awareness de disponibilité**
   - Montrer les indicateurs de statut 🟢
   - Ouvrir la liste des utilisateurs connectés
   - Point CSCW : "Pattern WYSIWIS - même vue pour tous"

3. **Minute 3 : Coordination - Création d'activité**
   - Onglet "Activités" → "Créer une activité"
   - Sélectionner type : Course, inviter l'autre utilisateur
   - Montrer le **broadcast** : apparition instantanée

4. **Minute 4 : Coopération - Rejoindre l'activité**
   - Sur le 2ème navigateur : cliquer "Rejoindre"
   - Montrer la mise à jour synchrone des participants
   - Point CSCW : "Coordination synchrone distribuée"

5. **Minute 5 : Gestion de la déconnexion**
   - Fermer un navigateur
   - Montrer le statut passant à ⚫ "Offline"
   - Point CSCW : "Awareness de départ"

**Phrases clés à dire pendant la démo :**

- "Notez que les deux vues sont synchronisées en temps réel"
- "C'est un exemple de collaboration synchrone distribuée"
- "L'awareness permet à chaque utilisateur de savoir qui est disponible"

---

## SLIDE 15 : Conclusion

**Titre :** Bilan CSCW et Perspectives

**Contenu :**

**Objectifs CSCW atteints :**

| Critère CSCW            | Implémentation                      | Statut |
| ----------------------- | ----------------------------------- | ------ |
| Awareness de présence   | Indicateurs statut, liste connectés | ✅     |
| Awareness d'activité    | Liste activités partagée            | ✅     |
| Coordination            | Création/inscription activités      | ✅     |
| Communication implicite | Statuts (online/busy/away/offline)  | ✅     |
| Synchronicité           | WebSocket temps réel                | ✅     |
| Espace partagé          | Carte commune                       | ✅     |

**Ce que ce projet démontre :**

- Un **système groupware synchrone distribué** fonctionnel
- L'importance de l'**awareness** dans les applications collaboratives
- Les défis de la **cohérence des données** en temps réel

**Positionnement final dans la matrice espace-temps :**

```
    APSA = Groupware Synchrone Distribué
    ════════════════════════════════════
    → Même temps (temps réel)
    → Lieux différents (distribué)
    → Awareness forte (conscience mutuelle)
```

**Merci de votre attention !**
Questions ?

---

## NOTES POUR LE PRÉSENTATEUR

### Timing suggéré :

| Slides | Durée | Cumul | Focus CSCW                  |
| ------ | ----- | ----- | --------------------------- |
| 1-2    | 30s   | 0:30  | Introduction                |
| 3-4    | 1:30  | 2:00  | Modèle 3C, Groupware        |
| 5-6    | 2:00  | 4:00  | Matrice Johansen, Awareness |
| 7-8    | 1:30  | 5:30  | WYSIWIS, Floor Control      |
| 9-10   | 1:00  | 6:30  | Protocole de présence       |
| 11-12  | 1:30  | 8:00  | Défis CSCW                  |
| 13-15  | 2:00  | 10:00 | Architecture, Conclusion    |

### Vocabulaire CSCW à utiliser :

- **Awareness** = Conscience de groupe (qui est là, que font-ils)
- **WYSIWIS** = What You See Is What I See (vue partagée)
- **Groupware** = Logiciel de travail collaboratif
- **Synchrone distribué** = Temps réel, lieux différents
- **Floor control** = Gestion de qui peut agir
- **Presence protocol** = Protocole de statut (en ligne/absent/occupé)
- **Broadcast** = Diffusion à tous les participants
- **Modèle 3C** = Communication, Coordination, Coopération

### Points à mettre en avant :

1. **Positionnement théorique** : Utiliser la matrice espace-temps de Johansen
2. **Terminologie** : Employer le vocabulaire CSCW pour montrer la maîtrise
3. **Honnêteté** : Reconnaître les limitations (pas de BDD centralisée, pas de heartbeat)
4. **Démonstration** : La démo doit illustrer l'awareness et la synchronisation

### Fichiers à avoir ouverts pour la démo :

- 2 navigateurs (Chrome + Firefox par exemple)
- Terminal avec le serveur WebSocket lancé
- VS Code avec le projet ouvert (pour montrer le code si besoin)

### Commandes à préparer :

```bash
# Terminal 1 : Serveur WebSocket
node src/utils/WebSocketServer.js

# Terminal 2 : Frontend
npm run dev
```

---

## GLOSSAIRE CSCW (À connaître pour les questions)

| Terme                    | Définition                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------ |
| **CSCW**                 | Computer-Supported Cooperative Work - Discipline étudiant les systèmes collaboratifs |
| **Groupware**            | Logiciel conçu pour supporter le travail de groupe                                   |
| **Awareness**            | Conscience de l'activité et de la présence des autres membres du groupe              |
| **Synchrone**            | Interaction en temps réel, simultanée                                                |
| **Asynchrone**           | Interaction différée dans le temps                                                   |
| **Colocalisé**           | Au même endroit physique                                                             |
| **Distribué**            | À des endroits différents                                                            |
| **WYSIWIS**              | What You See Is What I See - Paradigme de partage de vue                             |
| **Floor Control**        | Mécanisme de gestion de l'accès aux ressources partagées                             |
| **Shared Workspace**     | Espace de travail commun visible par tous                                            |
| **Presence Protocol**    | Protocole gérant les états de disponibilité des utilisateurs                         |
| **Cohérence éventuelle** | Garantie que les données seront cohérentes à terme                                   |
| **Heartbeat**            | Message périodique pour vérifier la connexion                                        |
| **Broadcast**            | Envoi d'un message à tous les participants connectés                                 |
