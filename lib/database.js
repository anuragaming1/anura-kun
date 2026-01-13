const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class Database {
    constructor() {
        // Lưu database trong /tmp (tồn tại qua các request trên cùng instance)
        this.dataPath = '/tmp/anura_database.json';
        console.log('💾 Database path:', this.dataPath);
        
        // Khởi tạo database
        this.data = this.initializeDatabase();
        
        console.log('✅ Database initialized');
        console.log('📊 Total snippets:', this.data.snippets.length);
        console.log('👥 Total users:', this.data.users.length);
    }

    initializeDatabase() {
        try {
            // Kiểm tra file database có tồn tại không
            if (fs.existsSync(this.dataPath)) {
                console.log('📂 Loading existing database...');
                const fileContent = fs.readFileSync(this.dataPath, 'utf8');
                
                // Parse JSON với validation
                if (fileContent.trim() === '') {
                    console.log('⚠️  Database file is empty, creating default');
                    return this.createDefaultDatabase();
                }
                
                try {
                    const parsedData = JSON.parse(fileContent);
                    console.log('📂 Database loaded successfully');
                    
                    // Đảm bảo cấu trúc dữ liệu đúng
                    if (!parsedData.snippets || !Array.isArray(parsedData.snippets)) {
                        parsedData.snippets = [];
                    }
                    if (!parsedData.users || !Array.isArray(parsedData.users)) {
                        parsedData.users = this.createDefaultUsers();
                    }
                    
                    return parsedData;
                } catch (parseError) {
                    console.error('❌ Error parsing database JSON:', parseError.message);
                    console.log('🔄 Creating new database...');
                    return this.createDefaultDatabase();
                }
            } else {
                console.log('🔄 Creating new database file...');
                return this.createDefaultDatabase();
            }
        } catch (error) {
            console.error('💥 Critical error initializing database:', error.message);
            // Fallback: tạo database mới
            return this.createDefaultDatabase();
        }
    }

    createDefaultDatabase() {
        const defaultData = {
            snippets: [],
            users: this.createDefaultUsers()
        };
        
        // Lưu database mới
        this.saveDatabase(defaultData);
        return defaultData;
    }

    createDefaultUsers() {
        // Tạo user mặc định: anura123/anura123
        // Password hash của "anura123" (bcrypt)
        const defaultUsers = [
            {
                id: 1,
                username: 'anura123',
                password_hash: '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq3J4mYJwTx.6I4hQpFq2q3J5V8B7a', // bcrypt hash của "anura123"
                created_at: new Date().toISOString()
            }
        ];
        
        console.log('👤 Default user created: anura123');
        return defaultUsers;
    }

    saveDatabase(data = null) {
        try {
            const dataToSave = data || this.data;
            const jsonData = JSON.stringify(dataToSave, null, 2);
            
            // Đảm bảo thư mục tồn tại
            const dir = path.dirname(this.dataPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            // Ghi file
            fs.writeFileSync(this.dataPath, jsonData, 'utf8');
            console.log('💾 Database saved to:', this.dataPath);
            
            // Debug: in kích thước file
            const stats = fs.statSync(this.dataPath);
            console.log('📁 File size:', stats.size, 'bytes');
            
            return true;
        } catch (error) {
            console.error('❌ Error saving database:', error.message);
            return false;
        }
    }

    // ==================== USER METHODS ====================

    async authenticate(username, password) {
        console.log('🔐 Authenticating user:', username);
        
        // Tìm user
        const user = this.data.users.find(u => u.username === username);
        
        if (!user) {
            console.log('❌ User not found:', username);
            return false;
        }
        
        console.log('✅ User found in database');
        
        // Simple authentication cho anura123/anura123
        if (username === 'anura123' && password === 'anura123') {
            console.log('✅ Simple authentication successful');
            return true;
        }
        
        // Nếu muốn dùng bcrypt (uncomment phần dưới)
        /*
        try {
            const bcrypt = require('bcryptjs');
            const isValid = bcrypt.compareSync(password, user.password_hash);
            console.log('🔐 Bcrypt authentication result:', isValid);
            return isValid;
        } catch (bcryptError) {
            console.error('❌ Bcrypt error:', bcryptError.message);
            return false;
        }
        */
        
        return false;
    }

    getUserByUsername(username) {
        return this.data.users.find(u => u.username === username);
    }

    // ==================== SNIPPET METHODS ====================

    async createSnippet(slug, content_fake, content_real) {
        console.log('➕ Creating new snippet...');
        
        // CHUẨN HÓA SLUG: trim và chuyển về lowercase
        slug = slug.trim().toLowerCase();
        console.log('📝 Slug (normalized):', `"${slug}"`);
        console.log('📝 Fake content length:', content_fake?.length || 0);
        console.log('📝 Real content length:', content_real?.length || 0);
        
        // Validation
        if (!slug || !content_fake || !content_real) {
            console.log('❌ Missing required fields');
            return { success: false, error: 'Missing required fields' };
        }
        
        // Kiểm tra slug đã tồn tại chưa (không phân biệt hoa/thường)
        const existingSnippet = this.data.snippets.find(s => 
            s.slug.toLowerCase() === slug.toLowerCase()
        );
        
        if (existingSnippet) {
            console.log('❌ Slug already exists:', slug);
            console.log('📊 Existing snippet:', {
                id: existingSnippet.id,
                created_at: existingSnippet.created_at
            });
            return { success: false, error: 'Slug already exists' };
        }
        
        // Tạo secret key
        const secretKey = crypto.randomBytes(32).toString('hex');
        
        // Tạo snippet mới
        const newSnippet = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            slug: slug, // Lưu dạng lowercase đã chuẩn hóa
            content_fake: content_fake,
            content_real: content_real,
            secret_key: secretKey,
            created_at: new Date().toISOString(),
            views: 0,
            last_accessed: null
        };
        
        // Thêm vào database
        this.data.snippets.push(newSnippet);
        
        // Lưu database
        const saved = this.saveDatabase();
        
        if (!saved) {
            console.log('❌ Failed to save snippet to database');
            return { success: false, error: 'Database save failed' };
        }
        
        console.log('✅ Snippet created successfully!');
        console.log('📊 New snippet details:', {
            id: newSnippet.id,
            slug: newSnippet.slug,
            secret_key_length: newSnippet.secret_key.length,
            created_at: newSnippet.created_at
        });
        
        // Debug: in tất cả snippets
        this.debugAllSnippets();
        
        return {
            success: true,
            slug: slug,
            secretKey: secretKey
        };
    }

    async getSnippet(slug) {
        console.log('🔍 Searching for snippet:', `"${slug}"`);
        
        // CHUẨN HÓA SLUG: trim và chuyển về lowercase
        slug = slug.trim().toLowerCase();
        
        // Log tất cả slugs hiện có
        const allSlugs = this.data.snippets.map(s => `"${s.slug}"`);
        console.log('📊 Available slugs:', allSlugs.length > 0 ? allSlugs.join(', ') : 'None');
        
        // Tìm snippet (KHÔNG phân biệt hoa/thường - đã chuẩn hóa)
        const snippet = this.data.snippets.find(s => 
            s.slug.toLowerCase() === slug
        );
        
        if (snippet) {
            console.log('✅ Snippet found!');
            console.log('📝 Snippet details:', {
                id: snippet.id,
                slug: snippet.slug,
                fake_length: snippet.content_fake?.length || 0,
                real_length: snippet.content_real?.length || 0,
                views: snippet.views || 0
            });
            
            // Cập nhật last_accessed
            snippet.last_accessed = new Date().toISOString();
            this.saveDatabase();
            
            return {
                ...snippet,
                content_fake: snippet.content_fake || '',
                content_real: snippet.content_real || ''
            };
        } else {
            console.log('❌ Snippet not found');
            
            // Debug thêm: kiểm tra xem có slug nào gần giống không
            const similarSlugs = this.data.snippets.filter(s => 
                s.slug.toLowerCase().includes(slug.toLowerCase()) ||
                slug.toLowerCase().includes(s.slug.toLowerCase())
            );
            
            if (similarSlugs.length > 0) {
                console.log('ℹ️  Similar slugs found:', similarSlugs.map(s => s.slug).join(', '));
            }
            
            return null;
        }
    }

    async incrementViews(slug) {
        // Chuẩn hóa slug
        slug = slug.trim().toLowerCase();
        
        const snippet = this.data.snippets.find(s => 
            s.slug.toLowerCase() === slug
        );
        
        if (snippet) {
            snippet.views = (snippet.views || 0) + 1;
            snippet.last_accessed = new Date().toISOString();
            this.saveDatabase();
            console.log('📈 Incremented views for:', slug, 'Total:', snippet.views);
        }
    }

    async checkSlugAvailable(slug) {
        // Chuẩn hóa slug
        slug = slug.trim().toLowerCase();
        
        const exists = this.data.snippets.some(s => 
            s.slug.toLowerCase() === slug
        );
        console.log('🔍 Check slug availability:', slug, '=>', exists ? 'NOT available' : 'AVAILABLE');
        return !exists;
    }

    async getRecentSnippets(limit = 20) {
        // Sắp xếp theo thời gian tạo (mới nhất đầu tiên)
        const sorted = [...this.data.snippets].sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
        
        const recent = sorted.slice(0, limit).map(s => ({
            slug: s.slug,
            created_at: s.created_at,
            views: s.views || 0,
            last_accessed: s.last_accessed
        }));
        
        console.log('📋 Returning recent snippets:', recent.length, 'items');
        return recent;
    }
    
    async getAllSnippets() {
        console.log('📋 Returning ALL snippets, count:', this.data.snippets.length);
        
        const allSnippets = this.data.snippets.map(s => ({
            id: s.id,
            slug: s.slug,
            content_fake: s.content_fake || '',
            content_real: s.content_real || '',
            secret_key: s.secret_key || '',
            created_at: s.created_at,
            views: s.views || 0,
            last_accessed: s.last_accessed
        }));
        
        // Debug: in chi tiết từng snippet
        allSnippets.forEach((s, i) => {
            console.log(`   [${i}] "${s.slug}" | fake:${s.content_fake.length} | real:${s.content_real.length} | views:${s.views}`);
        });
        
        return allSnippets;
    }

    async deleteSnippet(slug) {
        // Chuẩn hóa slug
        slug = slug.trim().toLowerCase();
        
        const initialLength = this.data.snippets.length;
        this.data.snippets = this.data.snippets.filter(s => 
            s.slug.toLowerCase() !== slug
        );
        
        if (this.data.snippets.length < initialLength) {
            this.saveDatabase();
            console.log('🗑️  Deleted snippet:', slug);
            return true;
        }
        
        console.log('❌ Snippet not found for deletion:', slug);
        return false;
    }

    async searchSnippets(query) {
        // Chuẩn hóa query
        query = query.trim().toLowerCase();
        
        const results = this.data.snippets.filter(s => 
            s.slug.toLowerCase().includes(query) ||
            (s.content_fake && s.content_fake.toLowerCase().includes(query)) ||
            (s.content_real && s.content_real.toLowerCase().includes(query))
        );
        
        console.log('🔍 Search results for "' + query + '":', results.length, 'items');
        return results.map(s => ({
            slug: s.slug,
            created_at: s.created_at,
            views: s.views || 0
        }));
    }

    // ==================== DEBUG METHODS ====================

    debugAllSnippets() {
        console.log('🐛 DEBUG: ALL SNIPPETS IN DATABASE');
        console.log('🐛 Total:', this.data.snippets.length);
        
        if (this.data.snippets.length === 0) {
            console.log('🐛 Database is empty!');
            return;
        }
        
        this.data.snippets.forEach((snippet, index) => {
            console.log(`🐛 [${index}] SLUG: "${snippet.slug}"`);
            console.log(`   ID: ${snippet.id}`);
            console.log(`   Created: ${snippet.created_at}`);
            console.log(`   Views: ${snippet.views || 0}`);
            console.log(`   Fake length: ${snippet.content_fake?.length || 0}`);
            console.log(`   Real length: ${snippet.content_real?.length || 0}`);
            console.log(`   Secret key: ${snippet.secret_key ? 'YES (' + snippet.secret_key.length + ' chars)' : 'NO'}`);
            console.log(`   Last accessed: ${snippet.last_accessed || 'Never'}`);
            console.log('   ---');
        });
    }

    getDatabaseStats() {
        return {
            total_snippets: this.data.snippets.length,
            total_users: this.data.users.length,
            snippets: this.data.snippets.map(s => ({
                slug: s.slug,
                created_at: s.created_at,
                views: s.views || 0
            })),
            users: this.data.users.map(u => ({
                username: u.username,
                created_at: u.created_at
            })),
            file_path: this.dataPath,
            file_exists: fs.existsSync(this.dataPath)
        };
    }

    // ==================== BACKUP & RESTORE ====================

    async backupDatabase() {
        try {
            const backupPath = `/tmp/anura_backup_${Date.now()}.json`;
            fs.writeFileSync(backupPath, JSON.stringify(this.data, null, 2));
            console.log('💾 Backup created:', backupPath);
            return backupPath;
        } catch (error) {
            console.error('❌ Backup failed:', error.message);
            return null;
        }
    }

    async restoreDatabase(backupPath) {
        try {
            if (!fs.existsSync(backupPath)) {
                console.log('❌ Backup file not found:', backupPath);
                return false;
            }
            
            const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
            this.data = backupData;
            this.saveDatabase();
            
            console.log('🔙 Database restored from:', backupPath);
            return true;
        } catch (error) {
            console.error('❌ Restore failed:', error.message);
            return false;
        }
    }

    // ==================== CLEANUP ====================

    async cleanupOldSnippets(maxAgeDays = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
        
        const initialCount = this.data.snippets.length;
        this.data.snippets = this.data.snippets.filter(s => 
            new Date(s.created_at) > cutoffDate
        );
        
        const removedCount = initialCount - this.data.snippets.length;
        
        if (removedCount > 0) {
            this.saveDatabase();
            console.log('🧹 Cleanup removed', removedCount, 'old snippets');
        }
        
        return removedCount;
    }
}

// Singleton pattern để đảm bảo chỉ có 1 instance database
let dbInstance = null;

module.exports = async function getDatabase() {
    if (!dbInstance) {
        console.log('🆕 Creating new database instance...');
        dbInstance = new Database();
        
        // Debug: in thống kê database
        const stats = dbInstance.getDatabaseStats();
        console.log('📊 Database stats:', stats);
    } else {
        console.log('♻️  Using existing database instance');
    }
    
    return dbInstance;
};
