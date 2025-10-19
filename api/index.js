import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, '../public')));

// Initialiser le client Turso
const db = createClient({
  url: 'libsql://portef1-joetannant.aws-us-east-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjA4OTM5ODAsImlkIjoiYmNlNmE3NjYtNDgxMy00NjcxLThlMzMtNTM3OGRmZTNkMDgzIiwicmlkIjoiNzNkZjQzYWQtYzEwYi00NjgwLTgzNDktNzliNmY1NmYwNDMwIn0.PMrCcdCnZzJFVN-ZYIPobUTac910Se9UK-YJlCyokwTXgFgSXfi7lUdLENHIkLq-ka-KyQeP9tFG0tOTDK_uAQ'
});

// Initialiser la base de données
async function initializeDatabase() {
  try {
    // Créer les tables si elles n'existent pas
    await db.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        icon TEXT,
        order_index INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
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

    // Vérifier si les catégories par défaut existent
    const result = await db.execute('SELECT COUNT(*) as count FROM categories');
    const categoryCount = result.rows[0]?.count || 0;

    if (categoryCount === 0) {
      const defaultCategories = [
        { name: 'Médias Sociaux', description: 'Mes profils sur les réseaux sociaux', icon: '📱', order_index: 1 },
        { name: 'Affiliations', description: 'Mes liens d\'affiliation', icon: '🔗', order_index: 2 },
        { name: 'Créations POD', description: 'Mes produits Print-on-Demand', icon: '🎨', order_index: 3 }
      ];

      for (const cat of defaultCategories) {
        await db.execute(
          'INSERT INTO categories (name, description, icon, order_index) VALUES (?, ?, ?, ?)',
          [cat.name, cat.description, cat.icon, cat.order_index]
        );
      }
    }

    console.log('Base de données initialisée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
  }
}

// Initialiser la base de données au démarrage
initializeDatabase();

// Routes API

// Récupérer toutes les catégories avec leurs liens
app.get('/api/categories', async (req, res) => {
  try {
    const categoriesResult = await db.execute('SELECT * FROM categories ORDER BY order_index ASC');
    const categories = categoriesResult.rows || [];

    const result = [];
    for (const cat of categories) {
      const linksResult = await db.execute(
        'SELECT * FROM links WHERE category_id = ? AND active = 1 ORDER BY order_index ASC',
        [cat.id]
      );
      const links = linksResult.rows || [];
      result.push({ ...cat, links });
    }

    res.json(result);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer une nouvelle catégorie
app.post('/api/categories', async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Le nom est requis' });
    }

    const maxResult = await db.execute('SELECT MAX(order_index) as max FROM categories');
    const maxOrder = maxResult.rows[0]?.max || 0;
    const newOrder = maxOrder + 1;

    const result = await db.execute(
      'INSERT INTO categories (name, description, icon, order_index) VALUES (?, ?, ?, ?)',
      [name, description || '', icon || '📁', newOrder]
    );

    res.json({ id: result.lastInsertRowid, name, description, icon, order_index: newOrder });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer une catégorie
app.delete('/api/categories/:id', async (req, res) => {
  try {
    const categoryResult = await db.execute('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!categoryResult.rows || categoryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    await db.execute('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Catégorie supprimée' });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un nouveau lien
app.post('/api/links', async (req, res) => {
  try {
    const { category_id, title, url, description, image_url } = req.body;

    if (!category_id || !title || !url) {
      return res.status(400).json({ error: 'Les champs requis sont manquants' });
    }

    const categoryResult = await db.execute('SELECT * FROM categories WHERE id = ?', [category_id]);
    if (!categoryResult.rows || categoryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    const maxResult = await db.execute('SELECT MAX(order_index) as max FROM links WHERE category_id = ?', [category_id]);
    const maxOrder = maxResult.rows[0]?.max || 0;
    const newOrder = maxOrder + 1;

    const result = await db.execute(
      'INSERT INTO links (category_id, title, url, description, image_url, order_index) VALUES (?, ?, ?, ?, ?, ?)',
      [category_id, title, url, description || '', image_url || '', newOrder]
    );

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

// Supprimer un lien
app.delete('/api/links/:id', async (req, res) => {
  try {
    const linkResult = await db.execute('SELECT * FROM links WHERE id = ?', [req.params.id]);
    if (!linkResult.rows || linkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lien non trouvé' });
    }

    await db.execute('DELETE FROM links WHERE id = ?', [req.params.id]);
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

