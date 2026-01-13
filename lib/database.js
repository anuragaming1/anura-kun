const { kv } = require('@vercel/kv');
const crypto = require('crypto');

let dbInstance = null;

async function getDatabase() {
    if (dbInstance) {
        console.log('Returning existing KV database instance');
        return dbInstance;
    }

    if (!process.env.KV_URL) {
        console.error('CRITICAL ERROR: KV_URL not set! Check Vercel Storage > KV connected and env vars injected.');
        throw new Error('Missing KV_URL - Database cannot initialize');
    }

    console.log('Initializing new KV database instance...');
    dbInstance = new Database();
    console.log('KV Database initialized');
    await dbInstance.debugAllSnippets(); // Debug ban đầu
    return dbInstance;
}

class Database {
    constructor() {
        console.log('KV Database class instantiated');
    }

    // Helper keys
    getSnippetKey(slug) {
        return `snippet:${slug.toLowerCase()}`;
    }

    getAllSlugsKey() {
        return 'all_slugs';
    }

    // ==================== CREATE SNIPPET ====================
    async createSnippet(slug, content_fake, content_real) {
        console.log('Creating new snippet...');
        console.log('Slug:', slug);
        console.log('Fake content length:', content_fake?.length || 0);
        console.log('Real content length:', content_real?.length || 0);

        if (!slug || !content_fake || !content_real) {
            console.log('Missing required fields');
            return { success: false, error: 'Missing required fields' };
        }

        const lowerSlug = slug.toLowerCase();
        const exists = await kv.exists(this.getSnippetKey(lowerSlug));
        if (exists) {
            console.log('Slug already exists:', slug);
            return { success: false, error: 'Slug already exists' };
        }

        const secretKey = crypto.randomBytes(32).toString('hex');
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);

        const snippet = {
            id,
            slug: lowerSlug,
            original_slug: slug, // Giữ case gốc để display
            content_fake,
            content_real,
            secret_key: secretKey,
            views: 0,
            created_at: new Date().toISOString(),
            last_accessed: null
        };

        await kv.set(this.getSnippetKey(lowerSlug), JSON.stringify(snippet));
        await kv.sadd(this.getAllSlugsKey(), lowerSlug);

        console.log('Snippet created successfully in KV!');
        console.log('New snippet details:', { id, slug, secret_key_length: secretKey.length });
        await this.debugAllSnippets();

        return { success: true, slug, secretKey };
    }

    // ==================== GET SNIPPET ====================
    async getSnippet(slug) {
        console.log('Searching for snippet:', `"${slug}"`);
        const lowerSlug = slug.toLowerCase();

        const data = await kv.get(this.getSnippetKey(lowerSlug));
        if (!data) {
            console.log('Snippet not found');

            // List available cho debug
            const allSlugs = await kv.smembers(this.getAllSlugsKey()) || [];
            console.log('Available slugs:', allSlugs.join(', ') || 'none');

            return null;
        }

        const snippet = JSON.parse(data);
        console.log('Snippet found!');
        snippet.last_accessed = new Date().toISOString();
        snippet.views = (snippet.views || 0) + 1;
        await kv.set(this.getSnippetKey(lowerSlug), JSON.stringify(snippet));

        return {
            ...snippet,
            content_fake: snippet.content_fake || '',
            content_real: snippet.content_real || ''
        };
    }

    // ==================== OTHER METHODS ====================
    async incrementViews(slug) {
        const snippet = await this.getSnippet(slug);
        if (snippet) {
            await kv.set(this.getSnippetKey(slug.toLowerCase()), JSON.stringify(snippet));
            console.log('Incremented views for:', slug);
        }
    }

    async getAllSnippets() {
        const slugs = await kv.smembers(this.getAllSlugsKey()) || [];
        console.log('Returning ALL slugs, count:', slugs.length);
        return slugs.map(s => {
            // Return original case nếu có, hoặc lower
            return s; // raw.js dùng để list available
        });
    }

    async deleteSnippet(slug) {
        const lowerSlug = slug.toLowerCase();
        const deleted = await kv.del(this.getSnippetKey(lowerSlug));
        if (deleted) {
            await kv.srem(this.getAllSlugsKey(), lowerSlug);
            console.log('Deleted snippet:', slug);
            return true;
        }
        return false;
    }

    // ==================== DEBUG ====================
    async debugAllSnippets() {
        console.log('DEBUG: ALL SNIPPETS IN KV DATABASE');
        const slugs = await kv.smembers(this.getAllSlugsKey()) || [];
        console.log('Total:', slugs.length);

        if (slugs.length === 0) {
            console.log('KV Database is empty!');
            return;
        }

        for (const lowerSlug of slugs) {
            const data = await kv.get(this.getSnippetKey(lowerSlug));
            if (data) {
                const snippet = JSON.parse(data);
                console.log(`SLUG: "${snippet.original_slug || lowerSlug}"`);
                console.log(`   ID: ${snippet.id}`);
                console.log(`   Created: ${snippet.created_at}`);
                console.log(`   Views: ${snippet.views || 0}`);
                console.log(`   Fake length: ${snippet.content_fake?.length || 0}`);
                console.log(`   Real length: ${snippet.content_real?.length || 0}`);
                console.log(`   Secret key: YES (${snippet.secret_key.length} chars)`);
                console.log(`   Last accessed: ${snippet.last_accessed || 'Never'}`);
                console.log('   ---');
            }
        }
    }

    // Auth đơn giản giữ nguyên như gốc (anura123/anura123)
    async authenticate(username, password) {
        console.log('Authenticating user:', username);
        if (username === 'anura123' && password === 'anura123') {
            console.log('Authentication successful');
            return true;
        }
        console.log('Authentication failed');
        return false;
    }
}

module.exports = getDatabase;
