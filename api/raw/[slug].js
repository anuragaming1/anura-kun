const getDatabase = require('../../lib/database');

module.exports = async (req, res) => {
    const db = await getDatabase();
    
    // SỬA LẠI PHẦN NÀY: Lấy slug từ URL path thay vì query parameter
    const slug = req.query.slug || req.url.split('/').pop();
    
    if (!slug || slug === '[slug]') {
        return res.status(400).send('Missing slug parameter');
    }
    
    // Loại bỏ query string nếu có
    const cleanSlug = slug.split('?')[0];
    
    const snippet = await db.getSnippet(cleanSlug);
    
    if (!snippet) {
        return res.status(404).send('Snippet not found');
    }
    
    // Increment view count
    await db.incrementViews(cleanSlug);
    
    // Check if client should see real code
    const { secret } = req.query;
    const shouldShowRealCode = checkForRealCodeClient(req, secret, snippet.secret_key);
    
    // Set content type
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Add special header for real content
    if (shouldShowRealCode) {
        res.setHeader('X-Real-Content', 'true');
    }
    
    // Send appropriate content
    res.send(shouldShowRealCode ? snippet.content_real : snippet.content_fake);
};

function checkForRealCodeClient(req, secret, snippetSecret) {
    // Check secret key
    if (secret && secret === snippetSecret) {
        return true;
    }
    
    // Check headers for special clients
    const clientType = req.headers['x-client-type'] || '';
    const userAgent = req.headers['user-agent'] || '';
    
    // Roblox or KRNL client
    if (clientType.toLowerCase() === 'krnl' || 
        clientType.toLowerCase() === 'roblox' ||
        userAgent.toLowerCase().includes('roblox')) {
        return true;
    }
    
    // Check query parameter
    if (req.query.client === 'krnl' || req.query.client === 'roblox') {
        return true;
    }
    
    return false;
}
