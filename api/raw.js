const getDatabase = require('../lib/database');

module.exports = async (req, res) => {
    const db = await getDatabase();
    
    // Lấy slug từ URL
    const urlPath = req.url;
    const slugMatch = urlPath.match(/^\/raw\/([^\/\?]+)/);
    
    if (!slugMatch) {
        return res.status(400).send('Missing slug parameter');
    }
    
    const slug = slugMatch[1];
    const { secret } = req.query;
    
    console.log('Request URL:', req.url);
    console.log('Extracted slug:', slug);
    
    const snippet = await db.getSnippet(slug);
    
    if (!snippet) {
        console.log('Snippet not found:', slug);
        return res.status(404).send('Snippet not found');
    }
    
    // Increment view count
    await db.incrementViews(slug);
    
    // Check if client should see real code
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
