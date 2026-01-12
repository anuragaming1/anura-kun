const getDatabase = require('../lib/database');

module.exports = async (req, res) => {
    try {
        const db = await getDatabase();
        
        // Lấy slug từ URL
        const urlPath = req.url;
        console.log('📄 Raw URL requested:', urlPath);
        
        // Extract slug từ path /raw/[slug]
        let slug = '';
        if (urlPath.startsWith('/raw/')) {
            slug = urlPath.substring(5); // Bỏ "/raw/"
            
            // Loại bỏ query string nếu có
            const queryIndex = slug.indexOf('?');
            if (queryIndex !== -1) {
                slug = slug.substring(0, queryIndex);
            }
        }
        
        console.log('🔍 Extracted slug:', slug);
        
        if (!slug) {
            return res.status(400).send('Missing slug parameter');
        }
        
        // Lấy snippet từ database
        const snippet = await db.getSnippet(slug);
        
        if (!snippet) {
            console.log('❌ Snippet not found:', slug);
            const allSnippets = await db.getAllSnippets();
            console.log('📊 All snippets in DB:', allSnippets.map(s => s.slug));
            return res.status(404).send(`Snippet "${slug}" not found`);
        }
        
        console.log('✅ Snippet found:', slug);
        
        // Increment view count
        await db.incrementViews(slug);
        
        // Phân biệt client - 1 LINK DUY NHẤT
        const shouldShowRealCode = checkForRealCodeClient(req, snippet.secret_key);
        
        console.log('🎯 Should show real code?', shouldShowRealCode);
        
        // Set content type
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        // Add special header for real content
        if (shouldShowRealCode) {
            res.setHeader('X-Real-Content', 'true');
        }
        
        // Send appropriate content - 1 LINK DUY NHẤT
        const content = shouldShowRealCode ? snippet.content_real : snippet.content_fake;
        console.log('📤 Sending content, length:', content.length);
        res.send(content);
        
    } catch (error) {
        console.error('💥 Error in raw endpoint:', error);
        res.status(500).send('Internal server error');
    }
};

function checkForRealCodeClient(req, snippetSecret) {
    // Lấy query parameters
    const url = new URL(req.url, `http://${req.headers.host}`);
    const secret = url.searchParams.get('secret');
    const client = url.searchParams.get('client');
    
    // Check secret key
    if (secret && secret === snippetSecret) {
        return true;
    }
    
    // Check headers for special clients
    const clientType = req.headers['x-client-type'] || '';
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    
    // Roblox Client
    if (userAgent.includes('roblox')) {
        return true;
    }
    
    // KRNL Client
    if (clientType.toLowerCase() === 'krnl') {
        return true;
    }
    
    // Client parameter trong URL
    if (client === 'krnl' || client === 'roblox') {
        return true;
    }
    
    return false;
}
