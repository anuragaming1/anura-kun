const { kv } = require('@vercel/kv');
const crypto = require('crypto');

let dbInstance = null;

async function getDatabase() {
    if (dbInstance) {
        console.log('Returning existing KV database instance');
        return dbInstance;
    }

    if (!process.env.KV_URL) {
        console.error('CRITICAL ERROR: KV_URL not set! Check Vercel Storage > KV connected.');
        throw new Error('Missing KV_URL - Database cannot initialize');
    }

    console.log('Initializing new KV database instance...');
    dbInstance = new Database();
    console.log('KV Database initialized successfully');
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
            original_slug: slug,
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

    async getSnippet(slug) {
        console.log('Searching for snippet:', `"${slug}"`);
        const lowerSlug = slug.toLowerCase();

        const data = await kv.get(this.getSnippetKey(lowerSlug));
        if (!data) {
            console.log('Snippet not found');
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

    async incrementViews(slug) {
        console.log('Incrementing views for:', slug);
        const lowerSlug = slug.toLowerCase();
        const data = await kv.get(this.getSnippetKey(lowerSlug));
        if (data) {
            const snippet = JSON.parse(data);
            snippet.views = (snippet.views || 0) + 1;
            snippet.last_accessed = new Date().toISOString();
            await kv.set(this.getSnippetKey(lowerSlug), JSON.stringify(snippet));
        }
    }

    async getAllSnippets() {
        const slugs = await kv.smembers(this.getAllSlugsKey()) || [];
        const snippets = [];
        for (const lowerSlug of slugs) {
            const data = await kv.get(this.getSnippetKey(lowerSlug));
            if (data) snippets.push(JSON.parse(data));
        }
        console.log('Returning ALL snippets, count:', snippets.length);
        snippets.forEach((s, i) => {
            console.log(`   [\( {i}] " \){s.original_slug || s.slug}" | fake:\( {s.content_fake?.length || 0} | real: \){s.content_real?.length || 0} | views:${s.views || 0}`);
        });
        return snippets;
    }

    async checkSlugAvailable(slug) {
        const lowerSlug = slug.toLowerCase();
        const exists = await kv.exists(this.getSnippetKey(lowerSlug));
        console.log('Check slug availability:', slug, '=>', exists ? 'NOT available' : 'AVAILABLE');
        return !exists;
    }

    async getRecentSnippets(limit = 20) {
        const allSnippets = await this.getAllSnippets();
        allSnippets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const recent = allSnippets.slice(0, limit);
        console.log('Returning recent snippets:', recent.length, 'items');
        return recent.map(s => ({
            slug: s.original_slug || s.slug,
            created_at: s.created_at,
            views: s.views,
            last_accessed: s.last_accessed
        }));
    }

    async deleteSnippet(slug) {
        const lowerSlug = slug.toLowerCase();
        const deleted = await kv.del(this.getSnippetKey(lowerSlug));
        if (deleted) {
            await kv.srem(this.getAllSlugsKey(), lowerSlug);
            console.log('Deleted snippet:', slug);
            return true;
        }
        console.log('Snippet not found for deletion:', slug);
        return false;
    }

    async searchSnippets(query) {
        const allSnippets = await this.getAllSnippets();
        const matches = allSnippets.filter(s => 
            s.original_slug.toLowerCase().includes(query.toLowerCase()) ||
            s.content_fake.toLowerCase().includes(query.toLowerCase()) ||
            s.content_real.toLowerCase().includes(query.toLowerCase())
        );
        console.log('Search results for "' + query + '":', matches.length, 'items');
        return matches.map(s => ({
            slug: s.original_slug || s.slug,
            created_at: s.created_at,
            views: s.views
        }));
    }

    async getDatabaseStats() {
        const allSnippets = await this.getAllSnippets();
        const recent = await this.getRecentSnippets();
        return {
            total_snippets: allSnippets.length,
            total_users: 1, // Vì auth simple
            snippets: recent,
            users: [{ username: 'anura123', created_at: new Date().toISOString() }]
        };
    }

    async backupDatabase() {
        console.log('KV backup not implemented - use Vercel dashboard for export if needed');
        return null;
    }

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
                console.log(`[\( {slugs.indexOf(lowerSlug)}] SLUG: " \){snippet.original_slug || lowerSlug}"`);
                console.log(`   ID: ${snippet.id}`);
                console.log(`   Created: ${snippet.created_at}`);
                console.log(`   Views: ${snippet.views || 0}`);
                console.log(`   Fake length: ${snippet.content_fake?.length || 0}`);
                console.log(`   Real length: ${snippet.content_real?.length || 0}`);
                console.log(`   Secret key: ${snippet.secret_key ? 'YES (' + snippet.secret_key.length + ' chars)' : 'NO'}`);
                console.log(`   Last accessed: ${snippet.last_accessed || 'Never'}`);
                console.log('   ---');
            }
        }
    }

    async authenticate(username, password) {
        console.log('Authenticating user:', username);
        if (username === 'anura123' && password === 'anura123') {
            console.log('Simple authentication successful');
            return true;
        }
        console.log('Authentication failed');
        return false;
    }
}

module.exports = getDatabase;
