// API endpoint để debug database (không deploy production)
const getDatabase = require('./database');

module.exports = async (req, res) => {
    // Chỉ cho phép truy cập local
    if (req.headers.host && !req.headers.host.includes('localhost')) {
        return res.status(403).send('Database debug API only available locally');
    }
    
    const db = await getDatabase();
    const action = req.query.action;
    
    switch (action) {
        case 'stats':
            const stats = db.getDatabaseStats();
            return res.json(stats);
            
        case 'all':
            const allSnippets = await db.getAllSnippets();
            return res.json({
                count: allSnippets.length,
                snippets: allSnippets
            });
            
        case 'get':
            const slug = req.query.slug;
            if (!slug) {
                return res.status(400).json({ error: 'Missing slug parameter' });
            }
            const snippet = await db.getSnippet(slug);
            return res.json({ snippet });
            
        case 'create':
            const { slug: createSlug, fake, real } = req.body;
            if (!createSlug || !fake || !real) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
            const result = await db.createSnippet(createSlug, fake, real);
            return res.json(result);
            
        case 'delete':
            const deleteSlug = req.query.slug;
            if (!deleteSlug) {
                return res.status(400).json({ error: 'Missing slug parameter' });
            }
            const deleted = await db.deleteSnippet(deleteSlug);
            return res.json({ success: deleted });
            
        case 'backup':
            const backupPath = await db.backupDatabase();
            return res.json({ backup_path: backupPath });
            
        case 'debug':
            db.debugAllSnippets();
            return res.json({ message: 'Check server logs for debug output' });
            
        default:
            return res.json({
                available_actions: ['stats', 'all', 'get', 'create', 'delete', 'backup', 'debug'],
                usage: 'Add ?action=stats to URL'
            });
    }
};
