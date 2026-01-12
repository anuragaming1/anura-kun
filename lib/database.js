const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

class Database {
    constructor() {
        this.db = null;
        this.init();
    }

    async init() {
        // In-memory database cho Vercel
        this.db = new sqlite3.Database(':memory:');
        
        await this.createTables();
        await this.createDefaultUser();
        
        console.log('Database initialized in memory');
    }

    async createTables() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Tạo bảng snippets
                this.db.run(`CREATE TABLE IF NOT EXISTS snippets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    slug TEXT UNIQUE,
                    content_fake TEXT,
                    content_real TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    views INTEGER DEFAULT 0,
                    secret_key TEXT
                )`, (err) => {
                    if (err) {
                        console.error('Error creating snippets table:', err);
                        reject(err);
                    }
                });

                // Tạo bảng users
                this.db.run(`CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY,
                    username TEXT UNIQUE,
                    password_hash TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`, (err) => {
                    if (err) {
                        console.error('Error creating users table:', err);
                        reject(err);
                    }
                    resolve();
                });
            });
        });
    }

    async createDefaultUser() {
        // Tạo user mặc định
        const bcrypt = require('bcryptjs');
        const hashedPassword = bcrypt.hashSync('anura123', 10);
        
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT OR IGNORE INTO users (id, username, password_hash) 
                 VALUES (1, 'anura123', ?)`,
                [hashedPassword],
                (err) => {
                    if (err) {
                        console.error('Error creating default user:', err);
                        reject(err);
                    } else {
                        console.log('Default user created successfully');
                        resolve();
                    }
                }
            );
        });
    }

    // User methods
    async authenticate(username, password) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE username = ?',
                [username],
                async (err, user) => {
                    if (err) {
                        console.error('Database error in authenticate:', err);
                        reject(err);
                        return;
                    }
                    
                    if (!user) {
                        console.log('User not found:', username);
                        resolve(false);
                        return;
                    }
                    
                    try {
                        const bcrypt = require('bcryptjs');
                        const isValid = bcrypt.compareSync(password, user.password_hash);
                        console.log('Authentication result:', { username, isValid });
                        resolve(isValid);
                    } catch (error) {
                        console.error('Bcrypt error:', error);
                        resolve(false);
                    }
                }
            );
        });
    }

    // Snippet methods
    async createSnippet(slug, content_fake, content_real) {
        const secretKey = crypto.randomBytes(32).toString('hex');
        
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO snippets (slug, content_fake, content_real, secret_key) 
                 VALUES (?, ?, ?, ?)`,
                [slug, content_fake, content_real, secretKey],
                function(err) {
                    if (err) {
                        console.error('❌ Database error creating snippet:', err.message);
                        if (err.code === 'SQLITE_CONSTRAINT') {
                            resolve({ success: false, error: 'Slug already exists' });
                        } else {
                            resolve({ success: false, error: 'Database error' });
                        }
                    } else {
                        console.log('✅ Snippet created:', {
                            slug: slug,
                            id: this.lastID,
                            fakeLength: content_fake.length,
                            realLength: content_real.length
                        });
                        resolve({
                            success: true,
                            slug,
                            secretKey
                        });
                    }
                }
            );
        });
    }

    async getSnippet(slug) {
        return new Promise((resolve, reject) => {
            console.log('🔍 Querying snippet:', slug);
            this.db.get(
                'SELECT * FROM snippets WHERE slug = ?',
                [slug],
                (err, row) => {
                    if (err) {
                        console.error('❌ Database error getting snippet:', err.message);
                        reject(err);
                    } else {
                        console.log('📊 Query result:', row ? 'Found' : 'Not found');
                        if (row) {
                            console.log('📝 Snippet data:', {
                                slug: row.slug,
                                fakeLength: row.content_fake?.length || 0,
                                realLength: row.content_real?.length || 0
                            });
                        }
                        resolve(row);
                    }
                }
            );
        });
    }

    async incrementViews(slug) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE snippets SET views = views + 1 WHERE slug = ?',
                [slug],
                (err) => {
                    if (err) {
                        console.error('Error incrementing views:', err);
                        reject(err);
                    } else {
                        resolve();
                    }
                }
            );
        });
    }

    async checkSlugAvailable(slug) {
        const snippet = await this.getSnippet(slug);
        return !snippet;
    }

    async getRecentSnippets(limit = 20) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT slug, created_at, views FROM snippets ORDER BY created_at DESC LIMIT ?',
                [limit],
                (err, rows) => {
                    if (err) {
                        console.error('Error getting snippets:', err);
                        reject(err);
                    } else {
                        resolve(rows || []);
                    }
                }
            );
        });
    }
    
    async getAllSnippets() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM snippets', (err, rows) => {
                if (err) {
                    console.error('Error getting all snippets:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    // Close database connection
    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

// Singleton pattern
let dbInstance = null;

module.exports = async function getDatabase() {
    if (!dbInstance) {
        dbInstance = new Database();
        await dbInstance.init();
    }
    return dbInstance;
};
