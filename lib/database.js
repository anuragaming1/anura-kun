const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const crypto = require('crypto');

class Database {
    constructor() {
        this.db = null;
        this.init();
    }

    async init() {
        this.db = await open({
            filename: ':memory:',
            driver: sqlite3.Database
        });

        // Tạo bảng snippets
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS snippets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slug TEXT UNIQUE,
                content_fake TEXT,
                content_real TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                views INTEGER DEFAULT 0,
                secret_key TEXT,
                user_id INTEGER DEFAULT 1
            )
        `);

        // Tạo bảng users (chỉ 1 user)
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                username TEXT UNIQUE,
                password_hash TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tạo user mặc định nếu chưa có
        await this.createDefaultUser();
    }

    async createDefaultUser() {
        const bcrypt = require('bcryptjs');
        const hashedPassword = bcrypt.hashSync('anura123', 10);
        
        try {
            await this.db.run(
                `INSERT OR IGNORE INTO users (id, username, password_hash) 
                 VALUES (1, 'anura123', ?)`,
                [hashedPassword]
            );
        } catch (error) {
            console.log('User already exists');
        }
    }

    // User methods
    async authenticate(username, password) {
        const bcrypt = require('bcryptjs');
        const user = await this.db.get(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        
        if (!user) return false;
        
        return bcrypt.compareSync(password, user.password_hash);
    }

    // Snippet methods
    async createSnippet(slug, content_fake, content_real) {
        const secretKey = crypto.randomBytes(32).toString('hex');
        
        try {
            await this.db.run(
                `INSERT INTO snippets (slug, content_fake, content_real, secret_key) 
                 VALUES (?, ?, ?, ?)`,
                [slug, content_fake, content_real, secretKey]
            );
            
            return {
                success: true,
                slug,
                secretKey
            };
        } catch (error) {
            return { success: false, error: 'Slug already exists' };
        }
    }

    async getSnippet(slug) {
        return await this.db.get(
            'SELECT * FROM snippets WHERE slug = ?',
            [slug]
        );
    }

    async incrementViews(slug) {
        await this.db.run(
            'UPDATE snippets SET views = views + 1 WHERE slug = ?',
            [slug]
        );
    }

    async checkSlugAvailable(slug) {
        const snippet = await this.getSnippet(slug);
        return !snippet;
    }

    async getRecentSnippets(limit = 20) {
        return await this.db.all(
            'SELECT slug, created_at, views FROM snippets ORDER BY created_at DESC LIMIT ?',
            [limit]
        );
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
