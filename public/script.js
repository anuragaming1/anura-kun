document.addEventListener('DOMContentLoaded', function() {
    // State
    let isLoggedIn = false;
    let currentSlug = '';
    let isSlugAvailable = false;
    
    // DOM Elements
    const loginForm = document.getElementById('loginForm');
    const loginMessage = document.getElementById('loginMessage');
    const logoutBtn = document.getElementById('logoutBtn');
    const usernameDisplay = document.getElementById('usernameDisplay');
    
    // Check authentication status khi trang load
    checkAuthStatus();
    
    // Login form submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        // Clear previous message
        loginMessage.className = 'login-message';
        loginMessage.textContent = '';
        loginMessage.style.display = 'none';
        
        // Validation
        if (!username || !password) {
            showLoginMessage('Vui lòng nhập đầy đủ thông tin', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.success) {
                    isLoggedIn = true;
                    usernameDisplay.textContent = username;
                    document.body.classList.add('logged-in');
                    showLoginMessage('Đăng nhập thành công! Đang chuyển hướng...', 'success');
                    
                    // Chuyển sang app sau 1 giây
                    setTimeout(() => {
                        initApp();
                    }, 1000);
                } else {
                    showLoginMessage('Sai tên đăng nhập hoặc mật khẩu', 'error');
                }
            } else {
                showLoginMessage('Lỗi kết nối server', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showLoginMessage('Lỗi kết nối mạng. Vui lòng thử lại', 'error');
        }
    });
    
    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Check authentication status
    async function checkAuthStatus() {
        try {
            const response = await fetch('/api/check-auth');
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    isLoggedIn = true;
                    document.body.classList.add('logged-in');
                    usernameDisplay.textContent = data.username || 'anura123';
                    initApp();
                }
            }
        } catch (error) {
            console.log('Không thể kiểm tra trạng thái đăng nhập');
        }
    }
    
    // Initialize app after login
    function initApp() {
        setupTabs();
        setupFileUploads();
        setupSlugCheck();
        setupCreateSnippet();
        setupResetButton();
        setupCopyButtons();
        setupRefreshSnippets();
        loadRecentSnippets();
    }
    
    // Logout function
    async function logout() {
        try {
            const response = await fetch('/api/logout', { 
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                isLoggedIn = false;
                document.body.classList.remove('logged-in');
                
                // Clear form
                document.getElementById('username').value = '';
                document.getElementById('password').value = '';
                
                showNotification('Đã đăng xuất thành công', 'info');
            } else {
                showNotification('Lỗi khi đăng xuất', 'error');
            }
        } catch (error) {
            console.error('Logout error:', error);
            showNotification('Lỗi kết nối mạng', 'error');
        }
    }
    
    // Show login message
    function showLoginMessage(message, type = 'info') {
        loginMessage.textContent = message;
        loginMessage.className = `login-message ${type}`;
        loginMessage.style.display = 'block';
        
        // Auto hide after 5 seconds for info messages
        if (type === 'info') {
            setTimeout(() => {
                loginMessage.style.display = 'none';
            }, 5000);
        }
    }
    
    // Show notification in app
    function showNotification(message, type = 'info') {
        // Remove existing notification
        const existingNotification = document.querySelector('.app-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create new notification
        const notification = document.createElement('div');
        notification.className = `app-notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            min-width: 300px;
            max-width: 90vw;
        `;
        
        // Set color based on type
        if (type === 'success') {
            notification.style.background = 'linear-gradient(90deg, #00cc00, #009900)';
            notification.style.border = '1px solid #00ff00';
        } else if (type === 'error') {
            notification.style.background = 'linear-gradient(90deg, #ff3333, #cc0000)';
            notification.style.border = '1px solid #ff6666';
        } else {
            notification.style.background = 'linear-gradient(90deg, #00ccff, #0088cc)';
            notification.style.border = '1px solid #00ddff';
        }
        
        document.body.appendChild(notification);
        
        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease-out forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
    
    // Add CSS for notifications
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .notification-close {
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            line-height: 1;
            padding: 0;
            margin: 0;
        }
    `;
    document.head.appendChild(style);
    
    // Existing code for app functionality
    function setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `${tabId}-tab`) {
                        content.classList.add('active');
                    }
                });
            });
        });
    }
    
    function setupFileUploads() {
        const uploadFakeBtn = document.getElementById('upload-fake');
        const uploadRealBtn = document.getElementById('upload-real');
        const fakeFileInput = document.getElementById('fake-file');
        const realFileInput = document.getElementById('real-file');
        
        if (uploadFakeBtn) {
            uploadFakeBtn.addEventListener('click', () => fakeFileInput.click());
        }
        
        if (uploadRealBtn) {
            uploadRealBtn.addEventListener('click', () => realFileInput.click());
        }
        
        if (fakeFileInput) {
            fakeFileInput.addEventListener('change', (e) => handleFileUpload(e, 'fake'));
        }
        
        if (realFileInput) {
            realFileInput.addEventListener('change', (e) => handleFileUpload(e, 'real'));
        }
    }
    
    async function handleFileUpload(event, type) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Check file type
        const allowedExtensions = ['.lua', '.luau', '.txt'];
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!allowedExtensions.includes(fileExt)) {
            showNotification('Chỉ chấp nhận file .lua, .luau, .txt', 'error');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const content = e.target.result;
            const textareaId = type === 'fake' ? 'content_fake' : 'content_real';
            document.getElementById(textareaId).value = content;
            
            showNotification(`Đã tải lên: ${file.name}`, 'success');
        };
        
        reader.readAsText(file);
    }
    
    function setupSlugCheck() {
        const slugInput = document.getElementById('slug');
        const checkSlugBtn = document.getElementById('check-slug');
        const slugStatus = document.getElementById('slug-status');
        
        if (!slugInput || !checkSlugBtn) return;
        
        checkSlugBtn.addEventListener('click', checkSlug);
        slugInput.addEventListener('input', function() {
            currentSlug = this.value.trim();
            slugStatus.textContent = '';
            slugStatus.className = 'status-message';
            isSlugAvailable = false;
        });
        
        slugInput.addEventListener('blur', function() {
            if (this.value.trim() && !isSlugAvailable) {
                checkSlug();
            }
        });
        
        async function checkSlug() {
            const slug = slugInput.value.trim();
            
            if (!slug) {
                slugStatus.textContent = 'Vui lòng nhập tên đường dẫn';
                slugStatus.style.color = '#ff5555';
                return;
            }
            
            if (!/^[a-z0-9-_]+$/i.test(slug)) {
                slugStatus.textContent = 'Chỉ cho phép chữ, số, gạch ngang và gạch dưới';
                slugStatus.style.color = '#ff5555';
                return;
            }
            
            try {
                const response = await fetch(`/api/check/${slug}`);
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.available) {
                        slugStatus.textContent = '✓ Tên đường dẫn có sẵn';
                        slugStatus.style.color = '#00ff00';
                        isSlugAvailable = true;
                    } else {
                        slugStatus.textContent = '✗ Tên đường dẫn đã tồn tại';
                        slugStatus.style.color = '#ff5555';
                        isSlugAvailable = false;
                    }
                } else {
                    slugStatus.textContent = 'Lỗi xác thực. Vui lòng đăng nhập lại';
                    slugStatus.style.color = '#ff5555';
                }
            } catch (error) {
                slugStatus.textContent = 'Lỗi kết nối server';
                slugStatus.style.color = '#ff5555';
            }
        }
    }
    
    function setupCreateSnippet() {
        const createBtn = document.getElementById('create-btn');
        if (!createBtn) return;
        
        createBtn.addEventListener('click', async () => {
            const slug = document.getElementById('slug').value.trim();
            const contentFake = document.getElementById('content_fake').value.trim();
            const contentReal = document.getElementById('content_real').value.trim();
            
            // Validation
            if (!slug) {
                showNotification('Vui lòng nhập tên đường dẫn', 'error');
                return;
            }
            
            if (!contentFake || !contentReal) {
                showNotification('Vui lòng nhập cả mã giả và mã thật', 'error');
                return;
            }
            
            if (!isSlugAvailable) {
                showNotification('Vui lòng kiểm tra tên đường dẫn trước', 'error');
                return;
            }
            
            // Prepare data
            const formData = {
                slug: slug,
                content_fake: contentFake,
                content_real: contentReal
            };
            
            // Show loading
            const originalText = createBtn.innerHTML;
            createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo...';
            createBtn.disabled = true;
            
            try {
                const response = await fetch('/api/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    
                    if (result.success) {
                        // Update UI with results
                        document.getElementById('public-link').value = result.raw_url;
                        document.getElementById('secret-link').value = result.real_url;
                        
                        // Show result section
                        document.getElementById('result-section').classList.remove('hidden');
                        
                        // Scroll to results
                        document.getElementById('result-section').scrollIntoView({ 
                            behavior: 'smooth',
                            block: 'start'
                        });
                        
                        // Reload snippets list
                        loadRecentSnippets();
                        
                        showNotification('Tạo snippet thành công!', 'success');
                    } else {
                        showNotification('Lỗi: ' + result.error, 'error');
                    }
                } else if (response.status === 401) {
                    showNotification('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại', 'error');
                    setTimeout(() => {
                        logout();
                    }, 2000);
                } else {
                    showNotification('Lỗi server', 'error');
                }
            } catch (error) {
                showNotification('Lỗi kết nối server', 'error');
            } finally {
                // Reset button
                createBtn.innerHTML = originalText;
                createBtn.disabled = false;
            }
        });
    }
    
    function setupResetButton() {
        const resetBtn = document.getElementById('reset-btn');
        if (!resetBtn) return;
        
        resetBtn.addEventListener('click', () => {
            document.getElementById('slug').value = '';
            document.getElementById('content_fake').value = '';
            document.getElementById('content_real').value = '';
            document.getElementById('slug-status').textContent = '';
            document.getElementById('result-section').classList.add('hidden');
            isSlugAvailable = false;
            showNotification('Đã làm mới form', 'info');
        });
    }
    
    function setupCopyButtons() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.copy-btn')) {
                const button = e.target.closest('.copy-btn');
                const targetId = button.getAttribute('data-clipboard-target');
                const input = document.querySelector(targetId);
                
                if (!input) return;
                
                input.select();
                document.execCommand('copy');
                
                // Visual feedback
                const originalHtml = button.innerHTML;
                button.innerHTML = '<i class="fas fa-check"></i>';
                button.style.background = 'linear-gradient(90deg, #00ff00, #008800)';
                
                setTimeout(() => {
                    button.innerHTML = originalHtml;
                    button.style.background = '';
                }, 2000);
                
                showNotification('Đã sao chép link vào clipboard', 'success');
            }
        });
    }
    
    function setupRefreshSnippets() {
        const refreshBtn = document.getElementById('refresh-snippets');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', loadRecentSnippets);
        }
    }
    
    async function loadRecentSnippets() {
        const snippetsList = document.getElementById('snippets-list');
        if (!snippetsList) return;
        
        snippetsList.innerHTML = '<div class="loading-snippet"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>';
        
        try {
            const response = await fetch('/api/snippets');
            
            if (response.ok) {
                const snippets = await response.json();
                
                if (!snippets || snippets.length === 0) {
                    snippetsList.innerHTML = '<div class="loading-snippet">Chưa có snippet nào</div>';
                    return;
                }
                
                snippetsList.innerHTML = '';
                
                snippets.forEach(snippet => {
                    const date = new Date(snippet.created_at);
                    const formattedDate = date.toLocaleDateString('vi-VN');
                    const formattedTime = date.toLocaleTimeString('vi-VN', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    });
                    
                    const snippetElement = document.createElement('div');
                    snippetElement.className = 'snippet-item';
                    snippetElement.innerHTML = `
                        <div class="snippet-header">
                            <a href="/raw/${snippet.slug}" target="_blank" class="snippet-slug">
                                /raw/${snippet.slug}
                            </a>
                        </div>
                        <div class="snippet-meta">
                            <span><i class="far fa-calendar"></i> ${formattedDate}</span>
                            <span><i class="far fa-clock"></i> ${formattedTime}</span>
                            <span><i class="far fa-eye"></i> ${snippet.views} lượt xem</span>
                        </div>
                    `;
                    
                    snippetsList.appendChild(snippetElement);
                });
            } else if (response.status === 401) {
                snippetsList.innerHTML = '<div class="loading-snippet">Phiên đăng nhập hết hạn</div>';
            } else {
                snippetsList.innerHTML = '<div class="loading-snippet">Lỗi khi tải dữ liệu</div>';
            }
        } catch (error) {
            snippetsList.innerHTML = '<div class="loading-snippet">Lỗi kết nối server</div>';
        }
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+Enter to submit form
        if (e.ctrlKey && e.key === 'Enter') {
            if (document.getElementById('create-btn')) {
                document.getElementById('create-btn').click();
            }
        }
        
        // Escape to logout
        if (e.key === 'Escape' && isLoggedIn) {
            if (confirm('Bạn có muốn đăng xuất không?')) {
                logout();
            }
        }
    });
});
