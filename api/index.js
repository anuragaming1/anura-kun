const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const getDatabase = require('../database');
const fs = require('fs');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files từ public
app.use(express.static('public'));

// ==================== ROUTES ====================

// Home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Raw snippet content
app.get('/raw/:slug', async (req, res) => {
    try {
        console.log('🔍 RAW REQUEST for slug:', req.params.slug);
        const db = await getDatabase();
        
        const snippet = await db.getSnippet(req.params.slug);
        
        if (snippet) {
            // Tăng views
            await db.incrementViews(req.params.slug);
            
            // Trả về fake content
            res.type('text/plain');
            res.send(snippet.content_fake);
        } else {
            // Debug: lấy tất cả snippets
            const allSnippets = await db.getAllSnippets();
            const slugs = allSnippets.map(s => s.slug);
            
            res.status(404).send(`Snippet "${req.params.slug}" not found. Available snippets: ${slugs.join(', ') || 'None'}`);
        }
    } catch (error) {
        console.error('❌ Error getting snippet:', error);
        res.status(500).send('Internal server error');
    }
});

// View snippet page
app.get('/:slug', async (req, res) => {
    try {
        const db = await getDatabase();
        const snippet = await db.getSnippet(req.params.slug);
        
        if (snippet) {
            // Tăng views
            await db.incrementViews(req.params.slug);
            
            res.json({
                success: true,
                slug: snippet.slug,
                content_fake: snippet.content_fake,
                content_real: snippet.content_real,
                created_at: snippet.created_at,
                views: snippet.views,
                secret_key: snippet.secret_key
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Snippet not found'
            });
        }
    } catch (error) {
        console.error('❌ Error getting snippet:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create snippet
app.post('/api/snippets', async (req, res) => {
    try {
        const { slug, content_fake, content_real } = req.body;
        const db = await getDatabase();
        
        const result = await db.createSnippet(slug, content_fake, content_real);
        
        if (result.success) {
            res.json({
                success: true,
                slug: result.slug,
                secretKey: result.secretKey
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('❌ Error creating snippet:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all snippets (for admin)
app.get('/api/snippets', async (req, res) => {
    try {
        const db = await getDatabase();
        const snippets = await db.getAllSnippets();
        res.json({ success: true, snippets });
    } catch (error) {
        console.error('❌ Error getting snippets:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete snippet
app.delete('/api/snippets/:slug', async (req, res) => {
    try {
        const { secret_key } = req.body;
        const db = await getDatabase();
        
        const snippet = await db.getSnippet(req.params.slug);
        
        if (!snippet) {
            return res.status(404).json({ error: 'Snippet not found' });
        }
        
        if (snippet.secret_key !== secret_key) {
            return res.status(403).json({ error: 'Invalid secret key' });
        }
        
        const deleted = await db.deleteSnippet(req.params.slug);
        
        if (deleted) {
            res.json({ success: true, message: 'Snippet deleted' });
        } else {
            res.status(500).json({ error: 'Failed to delete snippet' });
        }
    } catch (error) {
        console.error('❌ Error deleting snippet:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Authentication
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const db = await getDatabase();
        
        const authenticated = await db.authenticate(username, password);
        
        if (authenticated) {
            res.json({ success: true, message: 'Login successful' });
        } else {
            res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check
app.get('/api/health', async (req, res) => {
    try {
        const db = await getDatabase();
        const stats = db.getDatabaseStats();
        
        res.json({
            status: 'ok',
            database: {
                snippets: stats.total_snippets,
                users: stats.total_users
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Health check error:', error);
        res.status(500).json({ status: 'error', error: error.message });
    }
});

// Debug routes
app.get('/debug/snippets', async (req, res) => {
    try {
        const db = await getDatabase();
        const allSnippets = await db.getAllSnippets();
        
        res.json({
            count: allSnippets.length,
            snippets: allSnippets.map(s => ({
                slug: s.slug,
                created_at: s.created_at,
                fake_length: s.content_fake?.length || 0,
                real_length: s.content_real?.length || 0,
                views: s.views || 0
            }))
        });
    } catch (error) {
        console.error('❌ Debug error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/debug/db', async (req, res) => {
    try {
        const db = await getDatabase();
        const stats = db.getDatabaseStats();
        
        res.json({
            ...stats,
            memory_snippets_count: db.data.snippets.length,
            memory_users_count: db.data.users.length
        });
    } catch (error) {
        console.error('❌ Debug error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Export app cho Vercel
module.exports = app;
