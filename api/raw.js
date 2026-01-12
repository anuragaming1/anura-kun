const getDatabase = require('../lib/database');

module.exports = async (req, res) => {
    console.log('🔄 RAW ENDPOINT CALLED =================================');
    console.log('📤 Request URL:', req.url);
    console.log('📤 Full URL:', `http://${req.headers.host}${req.url}`);
    console.log('📤 Method:', req.method);
    console.log('📤 Headers:', {
        'user-agent': req.headers['user-agent'],
        'x-client-type': req.headers['x-client-type']
    });
    
    try {
        const db = await getDatabase();
        
        // Lấy slug từ URL - CÁCH ĐƠN GIẢN NHẤT
        let slug = '';
        const urlParts = req.url.split('/');
        
        // Tìm phần "raw" trong URL và lấy phần tiếp theo
        for (let i = 0; i < urlParts.length; i++) {
            if (urlParts[i] === 'raw' && i + 1 < urlParts.length) {
                slug = urlParts[i + 1];
                break;
            }
        }
        
        // Nếu slug có query parameters, loại bỏ chúng
        if (slug.includes('?')) {
            slug = slug.split('?')[0];
        }
        
        console.log('🎯 Extracted SLUG:', slug);
        console.log('🎯 Slug length:', slug.length);
        
        if (!slug || slug === '' || slug === '[slug]') {
            console.log('❌ ERROR: No slug found in URL');
            return res.status(400).send('Missing slug parameter. URL should be: /raw/your-slug-name');
        }
        
        // Debug: Hiển thị tất cả snippets trong database
        const allSnippets = await db.getAllSnippets();
        console.log('📊 ALL SNIPPETS IN DATABASE:');
        console.log('📊 Total snippets:', allSnippets.length);
        allSnippets.forEach((s, i) => {
            console.log(`📊 [${i}] Slug: "${s.slug}"`, 
                `| Fake: ${s.content_fake?.length || 0} chars`,
                `| Real: ${s.content_real?.length || 0} chars`);
        });
        
        // Tìm snippet theo slug (case-sensitive)
        const snippet = allSnippets.find(s => s.slug === slug);
        
        if (!snippet) {
            console.log('❌ ERROR: Snippet not found in database');
            console.log('❌ Looking for slug:', `"${slug}"`);
            console.log('❌ Available slugs:', allSnippets.map(s => `"${s.slug}"`).join(', '));
            
            // Thử tìm không phân biệt hoa thường
            const caseInsensitive = allSnippets.find(s => 
                s.slug.toLowerCase() === slug.toLowerCase()
            );
            
            if (caseInsensitive) {
                console.log('ℹ️  Found case-insensitive match:', caseInsensitive.slug);
                console.log('ℹ️  Original request slug:', slug);
                console.log('ℹ️  Database slug:', caseInsensitive.slug);
            }
            
            return res.status(404).send(`Snippet "${slug}" not found. Available snippets: ${allSnippets.map(s => s.slug).join(', ')}`);
        }
        
        console.log('✅ SUCCESS: Snippet found!');
        console.log('✅ Snippet details:', {
            slug: snippet.slug,
            fake_length: snippet.content_fake?.length || 0,
            real_length: snippet.content_real?.length || 0,
            created_at: snippet.created_at,
            views: snippet.views || 0
        });
        
        // Tăng lượt xem
        await db.incrementViews(slug);
        
        // Phân biệt client
        const shouldShowRealCode = checkForRealCodeClient(req, snippet.secret_key);
        
        console.log('🎭 Should show REAL code?', shouldShowRealCode);
        console.log('🎭 Client type detection:', {
            userAgent: req.headers['user-agent'] || 'none',
            xClientType: req.headers['x-client-type'] || 'none',
            queryParams: new URL(req.url, `http://${req.headers.host}`).searchParams.toString()
        });
        
        // Chọn content để hiển thị
        const content = shouldShowRealCode ? snippet.content_real : snippet.content_fake;
        
        console.log('📤 Sending content:', {
            type: shouldShowRealCode ? 'REAL' : 'FAKE',
            length: content.length,
            first_100_chars: content.substring(0, 100) + '...'
        });
        
        // Set headers
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        if (shouldShowRealCode) {
            res.setHeader('X-Real-Content', 'true');
        }
        
        // Gửi content
        console.log('✅ Sending response, content length:', content.length);
        res.send(content);
        console.log('✅ Response sent successfully!');
        console.log('====================================================');
        
    } catch (error) {
        console.error('💥 CRITICAL ERROR in raw endpoint:');
        console.error('💥 Error message:', error.message);
        console.error('💥 Error stack:', error.stack);
        console.error('💥 Request details:', {
            url: req.url,
            method: req.method,
            headers: req.headers
        });
        console.log('====================================================');
        
        res.status(500).send(`Internal server error: ${error.message}\n\nPlease check Vercel logs for details.`);
    }
};

function checkForRealCodeClient(req, snippetSecret) {
    // Parse URL để lấy query parameters
    const url = new URL(req.url, `http://${req.headers.host}`);
    const secret = url.searchParams.get('secret');
    const client = url.searchParams.get('client');
    
    console.log('🔍 Checking client type:');
    console.log('🔍 Query secret:', secret ? 'YES (length: ' + secret.length + ')' : 'NO');
    console.log('🔍 Query client:', client || 'none');
    console.log('🔍 Snippet secret length:', snippetSecret?.length || 0);
    
    // 1. Kiểm tra secret key
    if (secret && snippetSecret && secret === snippetSecret) {
        console.log('🔍 Match: Secret key matches!');
        return true;
    }
    
    // 2. Kiểm tra headers
    const clientType = (req.headers['x-client-type'] || '').toLowerCase();
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    
    console.log('🔍 Headers check:', {
        'x-client-type': clientType,
        'user-agent': userAgent.substring(0, 100)
    });
    
    // Roblox Client
    if (userAgent.includes('roblox')) {
        console.log('🔍 Match: Roblox User-Agent detected');
        return true;
    }
    
    // KRNL Client
    if (clientType === 'krnl') {
        console.log('🔍 Match: KRNL header detected');
        return true;
    }
    
    // Client parameter
    if (client === 'krnl' || client === 'roblox') {
        console.log('🔍 Match: Client parameter detected:', client);
        return true;
    }
    
    console.log('🔍 No special client detected, showing FAKE code');
    return false;
}
