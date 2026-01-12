const getDatabase = require('../lib/database');
const cookie = require('cookie');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-Client-Type, Content-Type, Cookie');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const db = await getDatabase();
        const path = req.url.split('?')[0];
        
        // Parse cookies
        const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
        const sessionToken = cookies.session_token;
        const isLoggedIn = sessionToken === 'anura123_authenticated';
        
        console.log('API Request:', { path, method: req.method, isLoggedIn });
        
        // Routes
        if (req.method === 'POST' && path === '/api/login') {
            return await handleLogin(req, res, db);
        }
        
        if (req.method === 'POST' && path === '/api/logout') {
            return handleLogout(req, res);
        }
        
        if (req.method === 'POST' && path === '/api/create') {
            if (!isLoggedIn) {
                return res.status(401).json({ error: 'Vui lòng đăng nhập trước' });
            }
            return await handleCreateSnippet(req, res, db);
        }
        
        if (req.method === 'GET' && path.startsWith('/api/check/')) {
            if (!isLoggedIn) {
                return res.status(401).json({ error: 'Vui lòng đăng nhập trước' });
            }
            const slug = path.split('/api/check/')[1];
            return await handleCheckSlug(req, res, db, slug);
        }
        
        if (req.method === 'GET' && path === '/api/snippets') {
            if (!isLoggedIn) {
                return res.status(401).json({ error: 'Vui lòng đăng nhập trước' });
            }
            return await handleGetSnippets(req, res, db);
        }
        
        if (req.method === 'GET' && path === '/api/check-auth') {
            if (isLoggedIn) {
                return res.json({ 
                    authenticated: true, 
                    username: 'anura123' 
                });
            }
            return res.json({ authenticated: false });
        }
        
        // Default 404
        res.status(404).json({ error: 'Not found' });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
};

// Login handler - SỬA LẠI PHẦN NÀY
async function handleLogin(req, res, db) {
    try {
        const body = await parseBody(req);
        const { username, password } = body;
        
        console.log('Login attempt for user:', username);
        
        // Simple authentication (không dùng bcrypt để tránh lỗi trên Vercel)
        if (username === 'anura123' && password === 'anura123') {
            // Set cookie
            res.setHeader('Set-Cookie', cookie.serialize('session_token', 'anura123_authenticated', {
                httpOnly: true,
                maxAge: 60 * 60 * 24 * 7, // 1 week
                path: '/',
                sameSite: 'lax',
                secure: true
            }));
            
            return res.json({ 
                success: true,
                username: username
            });
        } else {
            // Nếu muốn dùng bcrypt, comment phần trên và dùng phần dưới
            /*
            const isValid = await db.authenticate(username, password);
            if (isValid) {
                res.setHeader('Set-Cookie', cookie.serialize('session_token', 'anura123_authenticated', {
                    httpOnly: true,
                    maxAge: 60 * 60 * 24 * 7,
                    path: '/',
                    sameSite: 'lax',
                    secure: true
                }));
                
                return res.json({ 
                    success: true,
                    username: username
                });
            } else {
                res.status(401).json({ 
                    success: false,
                    error: 'Sai tên đăng nhập hoặc mật khẩu' 
                });
            }
            */
            
            // Fallback: luôn trả về lỗi nếu không phải anura123/anura123
            res.status(401).json({ 
                success: false,
                error: 'Sai tên đăng nhập hoặc mật khẩu' 
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}

// Logout handler
function handleLogout(req, res) {
    res.setHeader('Set-Cookie', cookie.serialize('session_token', '', {
        httpOnly: true,
        expires: new Date(0),
        path: '/',
        sameSite: 'lax',
        secure: true
    }));
    
    res.json({ success: true });
}

// Create snippet handler
async function handleCreateSnippet(req, res, db) {
    try {
        const body = await parseBody(req);
        const { slug, content_fake, content_real } = body;
        
        console.log('Creating snippet:', slug);
        
        if (!slug || !content_fake || !content_real) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Validate slug format
        if (!/^[a-z0-9-_]+$/i.test(slug)) {
            return res.status(400).json({ 
                error: 'Slug can only contain letters, numbers, hyphens and underscores' 
            });
        }
        
        const result = await db.createSnippet(slug, content_fake, content_real);
        
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }
        
        // Build URLs
        const host = req.headers.host || 'anura-kun.vercel.app';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const baseUrl = `${protocol}://${host}`;
        
        res.json({
            success: true,
            slug: slug,
            raw_url: `${baseUrl}/raw/${slug}`,
            real_url: `${baseUrl}/raw/${slug}?secret=${result.secretKey}`
        });
    } catch (error) {
        console.error('Create snippet error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Check slug handler
async function handleCheckSlug(req, res, db, slug) {
    if (!slug) {
        return res.status(400).json({ error: 'Slug is required' });
    }
    
    try {
        const available = await db.checkSlugAvailable(slug);
        res.json({ available });
    } catch (error) {
        console.error('Check slug error:', error);
        res.status(500).json({ error: 'Database error' });
    }
}

// Get snippets handler
async function handleGetSnippets(req, res, db) {
    try {
        const snippets = await db.getRecentSnippets(50);
        res.json(snippets);
    } catch (error) {
        console.error('Get snippets error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Helper to parse request body
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (error) {
                reject(error);
            }
        });
    });
}
