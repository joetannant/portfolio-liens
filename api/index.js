import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, '../public')));

// Initialiser la base de données dans /tmp
const dbPath = path.join('/tmp', 'portfolio.db');

let db;
try {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  initializeDatabase();
} catch (error) {
  console.error('Erreur de base de données:', error);
}

function initializeDatabase() {
  try {
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
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
  }
}

// Routes API
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

// Gestion 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

export default app;

