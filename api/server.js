import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import fs from 'fs';
import os from 'os';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Servir les fichiers statiques depuis le répertoire public
app.use(express.static(path.join(__dirname, '../public')));

// Initialiser la base de données
// Sur Vercel, utiliser le répertoire /tmp qui est accessible en écriture
const dbPath = process.env.NODE_ENV === 'production' 
  ? path.join('/tmp', 'portfolio.db')
  : path.join(process.cwd(), 'portfolio.db');

let db;
try {
  // Créer le répertoire /tmp s'il n'existe pas
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  initializeDatabase();
} catch (error) {
  console.error('Erreur de connexion à la base de données:', error);
  process.exit(1);
}

function initializeDatabase() {
  // Créer les tables si elles n'existent pas
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      icon TEXT,
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      order_index INTEGER DEFAULT 0,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );
  `);

  // Insérer des catégories par défaut si la table est vide
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (categoryCount.count === 0) {
    const defaultCategories = [
      { name: 'Médias Sociaux', description: 'Mes profils sur les réseaux sociaux', icon: '📱', order_index: 1 },
      { name: 'Affiliations', description: 'Mes liens d\'affiliation', icon: '🔗', order_index: 2 },
      { name: 'Créations POD', description: 'Mes produits Print-on-Demand', icon: '🎨', order_index: 3 }
    ];

    const insertCategory = db.prepare(`
      INSERT INTO categories (name, description, icon, order_index)
      VALUES (?, ?, ?, ?)
    `);

    defaultCategories.forEach(cat => {
      insertCategory.run(cat.name, cat.description, cat.icon, cat.order_index);
    });
  }
}

// Routes API

// Récupérer toutes les catégories avec leurs liens
app.get('/api/categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT * FROM categories ORDER BY order_index ASC
    `).all();

    const result = categories.map(cat => {
      const links = db.prepare(`
        SELECT * FROM links WHERE category_id = ? AND active = 1 ORDER BY order_index ASC
      `).all(cat.id);
      return { ...cat, links };
    });

    res.json(result);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer une catégorie spécifique
app.get('/api/categories/:id', (req, res) => {
  try {
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    const links = db.prepare(`
      SELECT * FROM links WHERE category_id = ? AND active = 1 ORDER BY order_index ASC
    `).all(category.id);

    res.json({ ...category, links });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer une nouvelle catégorie
app.post('/api/categories', (req, res) => {
  try {
    const { name, description, icon } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Le nom est requis' });
    }

    const maxOrder = db.prepare('SELECT MAX(order_index) as max FROM categories').get();
    const newOrder = (maxOrder.max || 0) + 1;

    const result = db.prepare(`
      INSERT INTO categories (name, description, icon, order_index)
      VALUES (?, ?, ?, ?)
    `).run(name, description || '', icon || '📁', newOrder);

    res.json({ id: result.lastInsertRowid, name, description, icon, order_index: newOrder });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour une catégorie
app.put('/api/categories/:id', (req, res) => {
  try {
    const { name, description, icon, order_index } = req.body;
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);

    if (!category) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    db.prepare(`
      UPDATE categories SET name = ?, description = ?, icon = ?, order_index = ? WHERE id = ?
    `).run(
      name || category.name,
      description !== undefined ? description : category.description,
      icon || category.icon,
      order_index !== undefined ? order_index : category.order_index,
      req.params.id
    );

    res.json({ id: req.params.id, name: name || category.name, description, icon, order_index });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer une catégorie
app.delete('/api/categories/:id', (req, res) => {
  try {
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    res.json({ message: 'Catégorie supprimée' });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un nouveau lien
app.post('/api/links', (req, res) => {
  try {
    const { category_id, title, url, description, image_url } = req.body;

    if (!category_id || !title || !url) {
      return res.status(400).json({ error: 'Les champs requis sont manquants' });
    }

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(category_id);
    if (!category) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    const maxOrder = db.prepare('SELECT MAX(order_index) as max FROM links WHERE category_id = ?').get(category_id);
    const newOrder = (maxOrder.max || 0) + 1;

    const result = db.prepare(`
      INSERT INTO links (category_id, title, url, description, image_url, order_index)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(category_id, title, url, description || '', image_url || '', newOrder);

    res.json({
      id: result.lastInsertRowid,
      category_id,
      title,
      url,
      description,
      image_url,
      order_index: newOrder,
      active: 1
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour un lien
app.put('/api/links/:id', (req, res) => {
  try {
    const { title, url, description, image_url, active, order_index } = req.body;
    const link = db.prepare('SELECT * FROM links WHERE id = ?').get(req.params.id);

    if (!link) {
      return res.status(404).json({ error: 'Lien non trouvé' });
    }

    db.prepare(`
      UPDATE links SET title = ?, url = ?, description = ?, image_url = ?, active = ?, order_index = ? WHERE id = ?
    `).run(
      title || link.title,
      url || link.url,
      description !== undefined ? description : link.description,
      image_url !== undefined ? image_url : link.image_url,
      active !== undefined ? active : link.active,
      order_index !== undefined ? order_index : link.order_index,
      req.params.id
    );

    res.json({ id: req.params.id, ...req.body });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un lien
app.delete('/api/links/:id', (req, res) => {
  try {
    const link = db.prepare('SELECT * FROM links WHERE id = ?').get(req.params.id);
    if (!link) {
      return res.status(404).json({ error: 'Lien non trouvé' });
    }

    db.prepare('DELETE FROM links WHERE id = ?').run(req.params.id);
    res.json({ message: 'Lien supprimé' });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Servir le fichier HTML principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Export pour Vercel
export default app;

// Démarrage du serveur en développement
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Serveur en cours d'exécution sur http://localhost:${PORT}`);
  });

  // Fermer la base de données à l'arrêt
  process.on('SIGINT', () => {
    db.close();
    process.exit(0);
  });
}

