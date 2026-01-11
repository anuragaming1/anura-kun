document.addEventListener('DOMContentLoaded', function() {
    // State
    let isLoggedIn = false;
    let currentSlug = '';
    let isSlugAvailable = false;
    
    // DOM Elements
    const loginBtn = document.getElementById('loginBtn');
    const loginModal = document.getElementById('loginModal');
    const closeModalBtn = document.querySelector('.close-modal');
    const loginForm = document.getElementById('loginForm');
    const createSection = document.getElementById('createSection');
    const formContainer = document.getElementById('formContainer');
    const loginRequired = document.getElementById('loginRequired');
    const snippetsLoginRequired = document.getElementById('snippetsLoginRequired');
    const promptLoginBtn = document.getElementById('promptLoginBtn');
    const promptLoginBtn2 = document.getElementById('promptLoginBtn2');
    
    // Check authentication status
    checkAuthStatus();
    
    // Login button click
    loginBtn.addEventListener('click', () => {
        if (isLoggedIn) {
            logout();
        } else {
            loginModal.classList.remove('hidden');
        }
    });
    
    // Close modal
    closeModalBtn.addEventListener('click', () => {
        loginModal.classList.add('hidden');
    });
    
    // Click outside modal to close
    window.addEventListener('click', (event) => {
        if (event.target === loginModal) {
            loginModal.classList.add('hidden');
        }
    });
    
    // Login form submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
                isLoggedIn = true;
                updateUIForLoggedIn();
                loginModal.classList.add('hidden');
                showNotification('Đăng nhập thành công!', 'success');
                loadRecentSnippets();
            } else {
                showNotification('Sai tên đăng nhập hoặc mật khẩu', 'error');
            }
        } catch (error) {
            showNotification('Lỗi kết nối server', 'error');
        }
    });
    
    // Prompt login buttons
    promptLoginBtn?.addEventListener('click', () => {
        loginModal.classList.remove('hidden');
    });
    
    promptLoginBtn2?.addEventListener('click', () => {
        loginModal.classList.remove('hidden');
    });
    
    // Check authentication status
    async function checkAuthStatus() {
        try {
            const response = await fetch('/api/check-auth');
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    isLoggedIn = true;
                    updateUIForLoggedIn();
                    loadRecentSnippets();
                }
            }
        } catch (error) {
            console.log('Không thể kiểm tra trạng thái đăng nhập');
        }
    }
    
    // Update UI when logged in
    function updateUIForLoggedIn() {
        loginBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> <span class="login-text">Đăng xuất</span>';
        loginBtn.classList.add('logged-in');
        
        if (formContainer) formContainer.classList.remove('hidden');
        if (loginRequired) loginRequired.classList.add('hidden');
        if (snippetsLoginRequired) snippetsLoginRequired.classList.add('hidden');
    }
    
    // Logout function
    async function logout() {
        try {
            await fetch('/api/logout', { method: 'POST' });
            isLoggedIn = false;
            loginBtn.innerHTML = '<i class="fas fa-user"></i> <span class="login-text">Đăng nhập</span>';
            loginBtn.classList.remove('logged-in');
            
            if (formContainer) formContainer.classList.add('hidden');
            if (loginRequired) loginRequired.classList.remove('hidden');
            if (snippetsLoginRequired) snippetsLoginRequired.classList.remove('hidden');
            
            showNotification('Đã đăng xuất', 'info');
        } catch (error) {
            showNotification('Lỗi khi đăng xuất', 'error');
        }
    }
    
    // Show notification
    function showNotification(message, type = 'info') {
        // Remove existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create new notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
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
    
    // Existing code for tabs, file uploads, etc. (from previous version)
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
        
        reader.read
