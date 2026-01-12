const crypto = require('crypto');
const { sql } = require('@vercel/postgres');
const fs = require('fs');
const path = require('path');

let dbInstance = null;

async function getDatabase() {
    if (dbInstance) {
        console.log('Returning existing database instance');
        return dbInstance;
    }

    console.log('Initializing new database instance (Postgres)');
    dbInstance = new Database();
    await dbInstance.initDb();
    console.log('Database initialized with Postgres');
    return dbInstance;
}

class Database {
    constructor() {
        console.log('Database class instantiated');
    }

    async initDb() {
        try {
            console.log('Creating tables if not exist...');

            // Table snippets
            await sql`CREATE TABLE IF NOT EXISTS snippets (
                id TEXT PRIMARY KEY,
                slug TEXT UNIQUE NOT NULL,
                content_fake TEXT NOT NULL,
                content_real TEXT NOT NULL,
                secret_key TEXT NOT NULL,
                views INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_accessed TIMESTAMP
            )`;

            // Table users
            await sql`CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`;

            // Insert default user nếu chưa có
            const { rows: existingUsers } = await sql`SELECT * FROM users WHERE username = 'anura123'`;
            if (existingUsers.length === 0) {
                const defaultHash = '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq3J4mYJwTx.6I4hQpFq2q3J5V8B7a'; // hash của "anura123"
                await sql`INSERT INTO users (username, password_hash) VALUES ('anura123', ${defaultHash})`;
                console.log('Default user created: anura123');
            }

            console.log('Database tables initialized successfully');
            await this.debugAllSnippets(); // Debug ban đầu
        } catch (error) {
            console.error('Critical error initializing database:', error.message);
            throw error;
        }
    }

    // ==================== USER METHODS ====================

    async authenticate(username, password) {
        console.log('Authenticating user:', username);

        const { rows } = await sql`SELECT password_hash FROM users WHERE username = ${username}`;
        const user = rows[0];

        if (!user) {
            console.log('User not found:', username);
            return false;
        }

        console.log('User found in database');

        // Simple auth như code gốc
        if (username === 'anura123' && password === 'anura123') {
            console.log('Simple authentication successful');
            return true;
        }

        // Nếu muốn dùng bcrypt (uncomment)
        /*
        const bcrypt = require('bcryptjs');
        const isValid = await bcrypt.compare(password, user.password_hash);
        console.log('Bcrypt authentication result:', isValid);
        return isValid;
        */

        return false;
    }

    async getUserByUsername(username) {
        const { rows } = await sql`SELECT * FROM users WHERE username = ${username}`;
        return rows[0] || null;
    }

    // ==================== SNIPPET METHODS ====================

    async createSnippet(slug, content_fake, content_real) {
        console.log('Creating new snippet...');
        console.log('Slug:', slug);
        console.log('Fake content length:', content_fake?.length || 0);
        console.log('Real content length:', content_real?.length || 0);

        if (!slug || !content_fake || !content_real) {
            console.log('Missing required fields');
            return { success: false, error: 'Missing required fields' };
        }

        // Check slug exist (case-sensitive)
        const { rows: existing } = await sql`SELECT slug FROM snippets WHERE slug = ${slug}`;
        if (existing.length > 0) {
            console.log('Slug already exists:', slug);
            return { success: false, error: 'Slug already exists' };
        }

        // Generate secret key
        const secretKey = crypto.randomBytes(32).toString('hex');

        // Create new snippet
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        try {
            await sql`INSERT INTO snippets (
                id, slug, content_fake, content_real, secret_key
            ) VALUES (
                ${id}, ${slug}, ${content_fake}, ${content_real}, ${secretKey}
            )`;

            console.log('Snippet created successfully!');
            console.log('New snippet details:', { id, slug, secret_key_length: secretKey.length });
            await this.debugAllSnippets();

            return { success: true, slug, secretKey };
        } catch (error) {
            console.error('Error saving snippet:', error.message);
            return { success: false, error: 'Database save failed' };
        }
    }

    async getSnippet(slug) {
        console.log('Searching for snippet:', `"${slug}"`);

        const { rows } = await sql`SELECT * FROM snippets WHERE slug = ${slug}`;
        let snippet = rows[0];

        if (snippet) {
            console.log('Snippet found!');
            await sql`UPDATE snippets SET last_accessed = CURRENT_TIMESTAMP WHERE slug = ${slug}`;
            return {
                ...snippet,
                content_fake: snippet.content_fake || '',
                content_real: snippet.content_real || ''
            };
        } else {
            console.log('Snippet not found');

            // Case-insensitive fallback
            const { rows: allRows } = await sql`SELECT slug FROM snippets`;
            const allSlugs = allRows.map(r => r.slug);
            const caseInsensitive = allSlugs.find(s => s.toLowerCase() === slug.toLowerCase());

            if (caseInsensitive) {
                console.log('Case-insensitive match found:', caseInsensitive);
            }

            console.log('Available slugs:', allSlugs.join(', '));
            return null;
        }
    }

    async incrementViews(slug) {
        await sql`UPDATE snippets SET views = views + 1, last_accessed = CURRENT_TIMESTAMP WHERE slug = ${slug}`;
        console.log('Incremented views for:', slug);
    }

    // Các method khác giữ nguyên logic, chuyển sang SQL
    async checkSlugAvailable(slug) {
        const { rows } = await sql`SELECT slug FROM snippets WHERE slug = ${slug}`;
        const exists = rows.length > 0;
        console.log('Check slug availability:', slug, '=>', exists ? 'NOT available' : 'AVAILABLE');
        return !exists;
    }

    async getRecentSnippets(limit = 20) {
        const { rows } = await sql`SELECT slug, created_at, views, last_accessed 
                                  FROM snippets 
                                  ORDER BY created_at DESC 
                                  LIMIT ${limit}`;
        console.log('Returning recent snippets:', rows.length, 'items');
        return rows;
    }

    async getAllSnippets() {
        const { rows } = await sql`SELECT * FROM snippets`;
        console.log('Returning ALL snippets, count:', rows.length);
        rows.forEach((s, i) => {
            console.log(`   [\( {i}] " \){s.slug}" | fake:\( {s.content_fake?.length || 0} | real: \){s.content_real?.length || 0} | views:${s.views || 0}`);
        });
        return rows;
    }

    async deleteSnippet(slug) {
        const { rowCount } = await sql`DELETE FROM snippets WHERE slug = ${slug}`;
        if (rowCount > 0) {
            console.log('Deleted snippet:', slug);
            return true;
        }
        console.log('Snippet not found for deletion:', slug);
        return false;
    }

    async searchSnippets(query) {
        const { rows } = await sql`SELECT slug, created_at, views 
                                  FROM snippets 
                                  WHERE slug ILIKE ${'%' + query + '%'}
                                  OR content_fake ILIKE ${'%' + query + '%'}
                                  OR content_real ILIKE ${'%' + query + '%'} `;
        console.log('Search results for "' + query + '":', rows.length, 'items');
        return rows;
    }

    // ==================== DEBUG METHODS ====================

    async debugAllSnippets() {
        console.log('DEBUG: ALL SNIPPETS IN DATABASE');
        const { rows } = await sql`SELECT * FROM snippets`;
        console.log('Total:', rows.length);

        if (rows.length === 0) {
            console.log('Database is empty!');
            return;
        }

        rows.forEach((snippet, index) => {
            console.log(`[\( {index}] SLUG: " \){snippet.slug}"`);
            console.log(`   ID: ${snippet.id}`);
            console.log(`   Created: ${snippet.created_at}`);
            console.log(`   Views: ${snippet.views || 0}`);
            console.log(`   Fake length: ${snippet.content_fake?.length || 0}`);
            console.log(`   Real length: ${snippet.content_real?.length || 0}`);
            console.log(`   Secret key: ${snippet.secret_key ? 'YES (' + snippet.secret_key.length + ' chars)' : 'NO'}`);
            console.log(`   Last accessed: ${snippet.last_accessed || 'Never'}`);
            console.log('   ---');
        });
    }

    async getDatabaseStats() {
        const { rows: snippetRows } = await sql`SELECT COUNT(*) as total_snippets FROM snippets`;
        const { rows: userRows } = await sql`SELECT COUNT(*) as total_users FROM users`;
        const recent = await this.getRecentSnippets();

        return {
            total_snippets: snippetRows[0].total_snippets,
            total_users: userRows[0].total_users,
            snippets: recent,
            users: (await sql`SELECT username, created_at FROM users`).rows
        };
    }

    // Backup: vẫn save JSON tạm (cho debug)
    async backupDatabase() {
        try {
            const { rows } = await sql`SELECT * FROM snippets`;
            const backupPath = `/tmp/anura_backup_${Date.now()}.json`;
            fs.writeFileSync(backupPath, JSON.stringify({ snippets: rows }, null, 2));
            console.log('Backup created:', backupPath);
            return backupPath;
        } catch (error) {
            console.error('Backup failed:', error.message);
            return null;
        }
    }
}

module.exports = getDatabase;
