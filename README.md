# Mon Portfolio de Liens et Créations

Un site web portfolio personnel pour gérer et afficher vos liens de médias sociaux, liens d'affiliation et créations Print-on-Demand (POD).

## Fonctionnalités

✨ **Interface Publique**
- Affichage élégant de vos catégories et liens
- Design responsive et moderne
- Navigation intuitive
- Animations fluides

🔧 **Interface d'Administration**
- Gestion complète des catégories
- Ajout, édition et suppression de liens
- Organisation par catégories
- Interface utilisateur facile à utiliser

💾 **Base de Données**
- SQLite pour le stockage des données
- Catégories par défaut pré-configurées
- Persistance des données

## Catégories Pré-configurées

1. **Médias Sociaux** 📱 - Vos profils sur les réseaux sociaux
2. **Affiliations** 🔗 - Vos liens d'affiliation
3. **Créations POD** 🎨 - Vos produits Print-on-Demand

## Installation et Démarrage

### Prérequis
- Node.js 22.13.0 ou supérieur
- pnpm 10.18.3 ou supérieur

### Installation

```bash
cd portfolio-liens
pnpm install
```

### Démarrage du Serveur

**Mode développement** (avec rechargement automatique)
```bash
pnpm dev
```

**Mode production**
```bash
pnpm start
```

Le serveur sera accessible à `http://localhost:3000`

## Utilisation

### Accès à l'Interface d'Administration

1. Cliquez sur le bouton **⚙️ Admin** en bas à droite de la page
2. Utilisez les onglets pour naviguer entre les sections

### Ajouter une Catégorie

1. Allez dans l'onglet **Catégories**
2. Remplissez le formulaire "Ajouter une nouvelle catégorie"
3. Cliquez sur **Ajouter la catégorie**

### Ajouter un Lien

1. Allez dans l'onglet **Liens**
2. Sélectionnez une catégorie
3. Remplissez les informations du lien
4. Cliquez sur **Ajouter le lien**

### Supprimer une Catégorie ou un Lien

1. Trouvez l'élément à supprimer dans la liste
2. Cliquez sur le bouton **Supprimer**
3. Confirmez la suppression

## Structure du Projet

```
portfolio-liens/
├── server.js                 # Serveur Express principal
├── package.json             # Dépendances du projet
├── .env                     # Variables d'environnement
├── portfolio.db             # Base de données SQLite
└── public/
    └── index.html           # Page HTML principale
```

## API REST

### Endpoints Disponibles

#### Catégories

- `GET /api/categories` - Récupérer toutes les catégories avec leurs liens
- `GET /api/categories/:id` - Récupérer une catégorie spécifique
- `POST /api/categories` - Créer une nouvelle catégorie
- `PUT /api/categories/:id` - Mettre à jour une catégorie
- `DELETE /api/categories/:id` - Supprimer une catégorie

#### Liens

- `POST /api/links` - Créer un nouveau lien
- `PUT /api/links/:id` - Mettre à jour un lien
- `DELETE /api/links/:id` - Supprimer un lien

## Variables d'Environnement

Modifiez le fichier `.env` pour configurer :

```env
PORT=3000                          # Port du serveur
NODE_ENV=development               # Environnement (development/production)
DATABASE_PATH=./portfolio.db        # Chemin de la base de données
```

## Technologie Utilisée

- **Backend** : Express.js
- **Base de Données** : SQLite3 avec better-sqlite3
- **Frontend** : HTML5, CSS3, JavaScript vanilla
- **Package Manager** : pnpm

## Personnalisation

### Modifier les Couleurs

Éditez les variables CSS dans `public/index.html` (section `<style>`):

```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Ajouter des Icônes Personnalisées

Utilisez des emojis ou des URLs d'images pour les icônes des catégories et des liens.

## Dépannage

### Le serveur ne démarre pas

Vérifiez que le port 3000 n'est pas déjà utilisé :
```bash
lsof -i :3000
```

### Les données ne sont pas sauvegardées

Assurez-vous que le fichier `portfolio.db` existe et que vous avez les permissions d'écriture dans le répertoire.

### Les styles ne s'appliquent pas

Videz le cache du navigateur (Ctrl+Shift+Delete) et rechargez la page.

## Licence

Ce projet est libre d'utilisation.

## Support

Pour toute question ou problème, veuillez vérifier les logs du serveur pour plus de détails.

