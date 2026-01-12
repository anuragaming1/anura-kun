document.addEventListener('DOMContentLoaded', function() {
    // State
    let isLoggedIn = false;
    let currentSlug = '';
    let isSlugAvailable = false;
    
    // DOM Elements
    const loginModal = document.getElementById('loginModal');
    const closeModalBtn = document.querySelector('.close-modal');
    const loginForm = document.getElementById('loginForm');
    const mainContent = document.getElementById('mainContent');
    const accessBlocked = document.getElementById('accessBlocked');
    const loginPromptBtn = document.getElementById('loginPromptBtn');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const logoutBtn = document.getElementById('logoutBtn');
    const footer = document.getElementById('footer');
    const slugInput = document.getElementById('slug');
    const checkSlugBtn = document.getElementById('check-slug');
    const slugStatus = document.getElementById('slug-status');
    
    // Khởi tạo
    mainContent.classList.add('hidden');
    footer.classList.add('hidden');
    accessBlocked.classList.remove('hidden');
    loginModal.classList.remove('hidden');
    
    // Check authentication
    checkAuthStatus();
    
    // Close modal
    closeModalBtn.addEventListener('click', () => {
        if (!isLoggedIn) {
            showNotification('Bạn phải đăng nhập để sử dụng hệ thống', 'error');
            return;
        }
        loginModal.classList.add('hidden');
    });
    
    // Click outside modal
    window.addEventListener('click', (event) => {
        if (event.target === loginModal && !isLoggedIn) {
            showNotification('Vui lòng đăng nhập để tiếp tục', 'error');
        }
    });
    
    // Login form submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            showNotification('Vui lòng nhập đầy đủ thông tin', 'error');
            return;
        }
        
        // Show loading
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xác thực...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                isLoggedIn = true;
                updateUIForLoggedIn(username);
                loginModal.classList.add('hidden');
                showNotification('Đăng nhập thành công! Chào mừng ' + username, 'success');
                
                setTimeout(() => {
                    if (typeof loadRecentSnippets === 'function') {
                        loadRecentSnippets();
                    }
                }, 500);
            } else {
                showNotification(data.error || 'Sai tên đăng nhập hoặc mật khẩu', 'error');
                document.getElementById('password').value = '';
            }
        } catch (error) {
            console.error('Login error:', error);
            showNotification('Lỗi kết nối server. Vui lòng thử lại sau.', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
    
    // Login prompt button
    if (loginPromptBtn) {
        loginPromptBtn.addEventListener('click', () => {
            loginModal.classList.remove('hidden');
        });
    }
    
    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Check authentication status
    async function checkAuthStatus() {
        try {
            const response = await fetch('/api/check-auth', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated && data.username) {
                    isLoggedIn = true;
                    updateUIForLoggedIn(data.username);
                    
                    if (typeof loadRecentSnippets === 'function') {
                        loadRecentSnippets();
                    }
                }
            }
        } catch (error) {
            console.log('Không thể kiểm tra trạng thái đăng nhập:', error);
        }
    }
    
    // Update UI when logged in
    function updateUIForLoggedIn(username) {
        if (welcomeMessage) {
            welcomeMessage.classList.remove('hidden');
            usernameDisplay.textContent = username;
        }
        
        mainContent.classList.remove('hidden');
        accessBlocked.classList.add('hidden');
        footer.classList.remove('hidden');
        
        const formContainer = document.getElementById('formContainer');
        const loginRequired = document.getElementById('loginRequired');
        const snippetsLoginRequired = document.getElementById('snippetsLoginRequired');
        const snippetsList = document.getElementById('snippets-list');
        
        if (formContainer) formContainer.classList.remove('hidden');
        if (loginRequired) loginRequired.classList.add('hidden');
        if (snippetsLoginRequired) snippetsLoginRequired.classList.add('hidden');
        if (snippetsList) snippetsList.classList.remove('hidden');
    }
    
    // Logout function
    async function logout() {
        if (!confirm('Bạn có chắc muốn đăng xuất khỏi hệ thống?')) {
            return;
        }
        
        try {
            const response = await fetch('/api/logout', { 
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                isLoggedIn = false;
                
                mainContent.classList.add('hidden');
                footer.classList.add('hidden');
                accessBlocked.classList.remove('hidden');
                loginModal.classList.remove('hidden');
                
                if (welcomeMessage) {
                    welcomeMessage.classList.add('hidden');
                }
                
                document.getElementById('username').value = '';
                document.getElementById('password').value = '';
                
                if (slugInput) {
                    slugInput.value = '';
                    document.getElementById('content_fake').value = '';
                    document.getElementById('content_real').value = '';
                    if (slugStatus) slugStatus.textContent = '';
                    document.getElementById('result-section').classList.add('hidden');
                    isSlugAvailable = false;
                }
                
                showNotification('Đã đăng xuất khỏi hệ thống', 'info');
            }
        } catch (error) {
            showNotification('Lỗi khi đăng xuất', 'error');
        }
    }
    
    // Show notification
    function showNotification(message, type = 'info') {
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        document.body.appendChild(notification);
        
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease-out forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
    
    // Setup các chức năng khác
    setupTabs();
    setupFileUploads();
    setupSlugCheck();
    setupCreateSnippet();
    setupResetButton();
    setupCopyButtons();
    setupRefreshSnippets();
    
    // Tab switching
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
    
    // File upload handling
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
        if (!isLoggedIn) {
            showNotification('Vui lòng đăng nhập trước', 'error');
            loginModal.classList.remove('hidden');
            return;
        }
        
        const file = event.target.files[0];
        if (!file) return;
        
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
    
    // Slug checking
    function setupSlugCheck() {
        if (!slugInput || !checkSlugBtn) return;
        
        checkSlugBtn.addEventListener('click', checkSlug);
        slugInput.addEventListener('input', function() {
            currentSlug = this.value.trim();
            if (slugStatus) {
                slugStatus.textContent = '';
                slugStatus.className = 'status-message';
            }
            isSlugAvailable = false;
        });
        
        slugInput.addEventListener('blur', function() {
            if (this.value.trim() && !isSlugAvailable) {
                checkSlug();
            }
        });
        
        async function checkSlug() {
            if (!isLoggedIn) {
                showNotification('Vui lòng đăng nhập trước', 'error');
                loginModal.classList.remove('hidden');
                return;
            }
            
            const slug = slugInput.value.trim();
            
            if (!slug) {
                if (slugStatus) {
                    slugStatus.textContent = 'Vui lòng nhập tên đường dẫn';
                    slugStatus.style.color = '#ff5555';
                }
                return;
            }
            
            if (!/^[a-z0-9-_]+$/i.test(slug)) {
                if (slugStatus) {
                    slugStatus.textContent = 'Chỉ cho phép chữ, số, gạch ngang và gạch dưới';
                    slugStatus.style.color = '#ff5555';
                }
                return;
            }
            
            try {
                const response = await fetch(`/api/check/${slug}`, {
                    credentials: 'include'
                });
                
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                
                const data = await response.json();
                
                if (slugStatus) {
                    if (data.available) {
                        slugStatus.textContent = '✓ Tên đường dẫn có sẵn';
                        slugStatus.style.color = '#00ff00';
                        isSlugAvailable = true;
                    } else {
                        slugStatus.textContent = '✗ Tên đường dẫn đã tồn tại';
                        slugStatus.style.color = '#ff5555';
                        isSlugAvailable = false;
                    }
                }
            } catch (error) {
                console.error('Check slug error:', error);
                if (slugStatus) {
                    slugStatus.textContent = 'Lỗi kết nối server';
                    slugStatus.style.color = '#ff5555';
                }
            }
        }
    }
    
    // Create snippet - CHỈ 1 LINK
    function setupCreateSnippet() {
        const createBtn = document.getElementById('create-btn');
        if (!createBtn) return;
        
        createBtn.addEventListener('click', async () => {
            if (!isLoggedIn) {
                showNotification('Vui lòng đăng nhập để tạo snippet', 'error');
                loginModal.classList.remove('hidden');
                return;
            }
            
            const slug = document.getElementById('slug').value.trim();
            const contentFake = document.getElementById('content_fake').value.trim();
            const contentReal = document.getElementById('content_real').value.trim();
            
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
            
            const formData = {
                slug: slug,
                content_fake: contentFake,
                content_real: contentReal
            };
            
            const originalText = createBtn.innerHTML;
            createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo...';
            createBtn.disabled = true;
            
            try {
                const response = await fetch('/api/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData),
                    credentials: 'include'
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // CHỈ 1 LINK
                    document.getElementById('public-link').value = result.raw_url;
                    
                    document.getElementById('result-section').classList.remove('hidden');
                    
                    document.getElementById('result-section').scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                    });
                    
                    if (typeof loadRecentSnippets === 'function') {
                        loadRecentSnippets();
                    }
                    
                    showNotification('Tạo snippet thành công!', 'success');
                } else {
                    showNotification('Lỗi: ' + result.error, 'error');
                }
            } catch (error) {
                console.error('Create snippet error:', error);
                showNotification('Lỗi kết nối server', 'error');
            } finally {
                createBtn.innerHTML = originalText;
                createBtn.disabled = false;
            }
        });
    }
    
    // Reset form
    function setupResetButton() {
        const resetBtn = document.getElementById('reset-btn');
        if (!resetBtn) return;
        
        resetBtn.addEventListener('click', () => {
            if (!isLoggedIn) {
                showNotification('Vui lòng đăng nhập trước', 'error');
                loginModal.classList.remove('hidden');
                return;
            }
            
            if (slugInput) slugInput.value = '';
            if (document.getElementById('content_fake')) document.getElementById('content_fake').value = '';
            if (document.getElementById('content_real')) document.getElementById('content_real').value = '';
            if (slugStatus) slugStatus.textContent = '';
            if (document.getElementById('result-section')) document.getElementById('result-section').classList.add('hidden');
            isSlugAvailable = false;
            showNotification('Đã làm mới form', 'info');
        });
    }
    
    // Copy buttons
    function setupCopyButtons() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.copy-btn')) {
                if (!isLoggedIn) {
                    showNotification('Vui lòng đăng nhập trước', 'error');
                    loginModal.classList.remove('hidden');
                    return;
                }
                
                const button = e.target.closest('.copy-btn');
                const targetId = button.getAttribute('data-clipboard-target');
                const input = document.querySelector(targetId);
                
                if (!input) return;
                
                input.select();
                document.execCommand('copy');
                
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
    
    // Load recent snippets
    function setupRefreshSnippets() {
        const refreshBtn = document.getElementById('refresh-snippets');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', loadRecentSnippets);
        }
    }
    
    async function loadRecentSnippets() {
        if (!isLoggedIn) return;
        
        const snippetsList = document.getElementById('snippets-list');
        if (!snippetsList) return;
        
        snippetsList.innerHTML = '<div class="loading-snippet"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>';
        snippetsList.classList.remove('hidden');
        
        try {
            const response = await fetch('/api/snippets', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
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
        } catch (error) {
            console.error('Load snippets error:', error);
            snippetsList.innerHTML = '<div class="loading-snippet">Lỗi khi tải dữ liệu</div>';
        }
    }
    
    // Prompt login buttons
    const promptLoginBtn = document.getElementById('promptLoginBtn');
    const promptLoginBtn2 = document.getElementById('promptLoginBtn2');
    
    if (promptLoginBtn) {
        promptLoginBtn.addEventListener('click', () => {
            loginModal.classList.remove('hidden');
        });
    }
    
    if (promptLoginBtn2) {
        promptLoginBtn2.addEventListener('click', () => {
            loginModal.classList.remove('hidden');
        });
    }
    
    // Chặn truy cập API khi chưa đăng nhập
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        if (typeof args[0] === 'string' && 
            (args[0].includes('/api/login') || args[0].includes('/api/check-auth'))) {
            return originalFetch.apply(this, args);
        }
        
        if (!isLoggedIn && typeof args[0] === 'string' && args[0].includes('/api/')) {
            showNotification('Vui lòng đăng nhập trước', 'error');
            loginModal.classList.remove('hidden');
            throw new Error('Not authenticated');
        }
        
        return originalFetch.apply(this, args);
    };
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            if (document.getElementById('create-btn')) {
                document.getElementById('create-btn').click();
            }
        }
        
        if (e.key === 'Escape' && !isLoggedIn) {
            showNotification('Bạn phải đăng nhập để sử dụng hệ thống', 'error');
        }
    });
});
