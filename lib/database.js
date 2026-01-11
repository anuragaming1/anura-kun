const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class Database {
    constructor() {
        this.db = null;
        this.dbPath = '/tmp/anura-kun.db'; // Sử dụng /tmp trên Vercel
        this.init();
    }

    async init() {
        // Đảm bảo thư mục tồn tại
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        this.db = await open({
            filename: this.dbPath,
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
        
        console.log('Database initialized at:', this.dbPath);
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
            console.log('Default user created or already exists');
        } catch (error) {
            console.log('Error creating default user:', error.message);
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
            
            console.log('Snippet created:', slug);
            return {
                success: true,
                slug,
                secretKey
            };
        } catch (error) {
            console.log('Error creating snippet:', error.message);
            return { success: false, error: 'Slug already exists' };
        }
    }

    async getSnippet(slug) {
        console.log('Getting snippet:', slug);
        const snippet = await this.db.get(
            'SELECT * FROM snippets WHERE slug = ?',
            [slug]
        );
        console.log('Snippet found:', !!snippet);
        return snippet;
    }

    async incrementViews(slug) {
        try {
            await this.db.run(
                'UPDATE snippets SET views = views + 1 WHERE slug = ?',
                [slug]
            );
        } catch (error) {
            console.log('Error incrementing views:', error.message);
        }
    }

    async checkSlugAvailable(slug) {
        const snippet = await this.getSnippet(slug);
        return !snippet;
    }

    async getRecentSnippets(limit
