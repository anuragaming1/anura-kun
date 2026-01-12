const getDatabase = require('../lib/database');

module.exports = async (req, res) => {
    try {
        const db = await getDatabase();
        
        // Lấy slug từ URL
        const urlPath = req.url;
        console.log('Raw URL requested:', urlPath);
        
        // Extract slug từ path /raw/[slug]
        let slug;
        if (urlPath.startsWith('/raw/')) {
            slug = urlPath.substring(5); // Bỏ "/raw/"
            
            // Loại bỏ query string nếu có
            const queryIndex = slug.indexOf('?');
            if (queryIndex !== -1) {
                slug = slug.substring(0, queryIndex);
            }
        }
        
        console.log('Extracted slug:', slug);
        
        if (!slug) {
            return res.status(400).send('Missing slug parameter');
        }
        
        // Debug: Hiển thị tất cả snippets
        const allSnippets = await db.getAllSnippets();
        console.log('All snippets in DB:', allSnippets.map(s => s.slug));
        
        const snippet = await db.getSnippet(slug);
        
        if (!snippet) {
            console.log(`Snippet "${slug}" not found in database`);
            return res.status(404).send(`Snippet "${slug}" not found`);
        }
        
        // Increment view count
        await db.incrementViews(slug);
        
        // Check if client should see real code
        const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
        const secret = urlParams.get('secret');
        const shouldShowRealCode = checkForRealCodeClient(req, secret, snippet.secret_key);
        
        console.log('Should show real code?', shouldShowRealCode);
        
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
        
        // Send appropriate content
        const content = shouldShowRealCode ? snippet.content_real : snippet.content_fake;
        console.log('Sending content length:', content.length);
        res.send(content);
        
    } catch (error) {
        console.error('Error in raw endpoint:', error);
        res.status(500).send('Internal server error');
    }
};

function checkForRealCodeClient(req, secret, snippetSecret) {
    // Check secret key
    if (secret && secret === snippetSecret) {
        return true;
    }
    
    // Check headers for special clients
    const clientType = req.headers['x-client-type'] || '';
    const userAgent = req.headers['user-agent'] || '';
    
    console.log('Client headers:', { clientType, userAgent });
    
    // Roblox or KRNL client
    if (clientType.toLowerCase() === 'krnl' || 
        clientType.toLowerCase() === 'roblox' ||
        (userAgent && userAgent.toLowerCase().includes('roblox'))) {
        return true;
    }
    
    // Check query parameter
    const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
    const clientParam = urlParams.get('client');
    if (clientParam === 'krnl' || clientParam === 'roblox') {
        return true;
    }
    
    return false;
}
