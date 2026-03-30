// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const FILE_BASE_URL = 'http://localhost:5000/uploads';

// Global State
let currentUser = null;
let currentToken = null;
let currentProject = null;
let currentAssignment = null;
let socket = null;
let timerInterval = null;
let timerSeconds = 0;
let dashboardChart = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    if (typeof lucide !== 'undefined') lucide.createIcons();
});

function initializeApp() {
    // Check if user is logged in
    const savedToken = localStorage.getItem('token');
    const savedUserId = localStorage.getItem('userId');
    const savedUsername = localStorage.getItem('username');
    const savedIsAdmin = localStorage.getItem('isAdmin') === 'true';
    
    if (savedToken && savedUserId && savedUsername) {
        currentToken = savedToken;
        currentUser = {
            _id: savedUserId,
            username: savedUsername,
            is_admin: savedIsAdmin
        };
        showMainApp();
    } else {
        showAuthSection();
    }
}

function setupEventListeners() {
    // Auth Tab Buttons
    document.getElementById('loginTabBtn').addEventListener('click', () => switchAuthTab('login'));
    document.getElementById('registerTabBtn').addEventListener('click', () => switchAuthTab('register'));
    
    // Auth Forms
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    const safeAddListener = (id, event, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, handler);
    };

    // Navigation Tabs
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.addEventListener('click', switchSection);
    });
    
    // Logout
    safeAddListener('logoutBtn', 'click', handleLogout);
    
    // Refresh Buttons
    safeAddListener('refreshProjectsBtn', 'click', loadAvailableProjects);
    safeAddListener('refreshAssignmentsBtn', 'click', loadUserAssignments);
    safeAddListener('refreshDashboardBtn', 'click', loadDashboard);
    safeAddListener('adminRefreshBtn', 'click', loadAdminPanel);
    
    // Modal Close
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', closeModal);
    });
    
    document.querySelectorAll('.modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', closeModal);
    });
    
    // Modal Actions
    safeAddListener('modalTakeProjectBtn', 'click', handleTakeProject);
    safeAddListener('modalRenameProjectBtn', 'click', showRenameModal);
    safeAddListener('modalReleaseProjectBtn', 'click', handleReleaseProject);
    safeAddListener('confirmRenameBtn', 'click', handleRenameProject);
    safeAddListener('addMemberBtn', 'click', handleAddMember);
    
    // Admin Forms
    safeAddListener('createProjectBtn', 'click', showCreateProjectModal);
    safeAddListener('createProjectForm', 'submit', handleCreateProject);
    safeAddListener('editProjectForm', 'submit', handleEditProject);
    safeAddListener('confirmDeleteBtn', 'click', handleDeleteProject);
    
    // Notification Bell
    safeAddListener('notificationBellBtn', 'click', (e) => {
        e.stopPropagation();
        toggleNotificationDropdown();
    });
    safeAddListener('refreshArchiveBtn', 'click', loadArchive);
    
    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeToggle) {
            themeToggle.innerHTML = '<i data-lucide="sun"></i>';
        }
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        if (themeToggle) {
            themeToggle.innerHTML = '<i data-lucide="moon"></i>';
        }
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const newTheme = isDark ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            themeToggle.innerHTML = newTheme === 'dark' ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
            lucide.createIcons();
        });
    }

    // Mobile Menu
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.querySelector('.sidebar');
    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            mobileMenuBtn.innerHTML = sidebar.classList.contains('open') ? '<i data-lucide="x"></i>' : '<i data-lucide="menu"></i>';
            lucide.createIcons();
        });
    }

    safeAddListener('uploadFileBtn', 'click', handleFileUpload);
    safeAddListener('projectSearch', 'input', filterProjects);
    safeAddListener('projectStatusFilter', 'change', filterProjects);
    safeAddListener('archiveSearch', 'input', filterArchive);
    
    // Broadcast Modal
    safeAddListener('broadcastModalBtn', 'click', () => {
        const el = document.getElementById('broadcastModal');
        if (el) el.style.display = 'flex';
    });
    
    safeAddListener('closeBroadcastModal', 'click', () => {
        const el = document.getElementById('broadcastModal');
        if (el) el.style.display = 'none';
    });
    
    safeAddListener('broadcastForm', 'submit', handleBroadcastSubmit);
    safeAddListener('commentForm', 'submit', handleCommentSubmit);
    
    safeAddListener('projectFileInput', 'change', (e) => {
        const files = e.target.files;
        let text = 'Seçilmedi';
        if (files.length === 1) text = files[0].name;
        else if (files.length > 1) text = `${files.length} dosya seçildi`;
        const el = document.getElementById('selectedFileName');
        if (el) el.textContent = text;
    });
    
    safeAddListener('markAllReadBtn', 'click', markAllNotificationsRead);
    safeAddListener('startTimerBtn', 'click', startTimer);
    safeAddListener('stopTimerBtn', 'click', stopTimer);
    safeAddListener('chatForm', 'submit', handleChatSubmit);
    
    // Progress Events
    safeAddListener('addMilestoneBtn', 'click', handleAddMilestone);
    safeAddListener('saveProgressBtn', 'click', handleSaveProgress);

    document.getElementById('progressSlider').addEventListener('input', (e) => {
        document.getElementById('progressValue').textContent = `${e.target.value}%`;
    });
    
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchModalTab(e.target.getAttribute('data-modal-tab')));
    });

    // Close notification dropdown on outside click
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notificationDropdown');
        const bell = document.getElementById('notificationBellBtn');
        if (!bell.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
    
    // Close modal on outside click
    window.addEventListener('click', (event) => {
        const projectModal = document.getElementById('projectModal');
        const renameModal = document.getElementById('renameModal');
        
        if (event.target === projectModal) {
            closeModal.call(projectModal.querySelector('.close'));
        }
        if (event.target === renameModal) {
            closeModal.call(renameModal.querySelector('.close'));
        }
    });
    
    // Setup admin tab buttons
    setupAdminTabButtons();
}

// Auth Functions
function switchAuthTab(tab) {
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    document.querySelectorAll('.auth-tab-btn').forEach(btn => btn.classList.remove('active'));
    
    if (tab === 'login') {
        document.getElementById('loginForm').classList.add('active');
        document.getElementById('loginTabBtn').classList.add('active');
    } else {
        document.getElementById('registerForm').classList.add('active');
        document.getElementById('registerTabBtn').classList.add('active');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const messageEl = document.getElementById('authMessage');
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentToken = data.token;
            currentUser = {
                _id: data.userId,
                username: data.username,
                is_admin: data.is_admin || false
            };
            
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('username', data.username);
            localStorage.setItem('isAdmin', data.is_admin || false);
            
            showMessage(messageEl, 'Giriş başarılı!', 'success');
            setTimeout(showMainApp, 1000);
        } else {
            showMessage(messageEl, data.message || 'Giriş başarısız', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage(messageEl, 'Hata: ' + error.message, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const messageEl = document.getElementById('authMessage');
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(messageEl, 'Kayıt başarılı! Lütfen giriş yapın.', 'success');
            document.getElementById('registerForm').reset();
            setTimeout(() => switchAuthTab('login'), 1000);
        } else {
            showMessage(messageEl, data.message || 'Kayıt başarısız', 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showMessage(messageEl, 'Hata: ' + error.message, 'error');
    }
}

function handleLogout() {
    currentToken = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('isAdmin');
    showAuthSection();
}

// UI Functions
function showAuthSection() {
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('mainSection').style.display = 'none';
}

function showMainApp() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('mainSection').style.display = 'grid';
    
    // Update Profile
    const displayUsername = document.getElementById('displayUsername');
    const displayRole = document.getElementById('displayRole');
    const avatar = document.getElementById('currentUsernameAvatar');
    
    if (displayUsername) displayUsername.textContent = currentUser.username;
    if (displayRole) displayRole.textContent = currentUser.is_admin ? 'ADMIN' : 'MEMBER';
    if (avatar) avatar.textContent = currentUser.username.charAt(0).toUpperCase();

    // Compatibility for old logic references
    const legacyUsername = document.getElementById('currentUsername');
    if (legacyUsername) legacyUsername.textContent = currentUser.username;
    
    // Show admin panel only for admin users
    if (currentUser.is_admin) {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = '';
        });
    } else {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'none';
        });
    }
    
    // Don't call loadAvailableProjects here, let the tab click handling do it
    loadNotificationCount();
    
    // Restore last active section with a slight delay
    const lastSection = localStorage.getItem('activeSection') || 'projects';
    setTimeout(() => {
        const tabToClick = document.querySelector(`.nav-tab-btn[data-section="${lastSection}"]`);
        if (tabToClick) {
            tabToClick.click();
        }
    }, 100);
}

function switchSection(e) {
    const btn = e.currentTarget;
    const sectionId = btn.getAttribute('data-section');
    const title = btn.querySelector('span') ? btn.querySelector('span').textContent : 'Dashboard';
    
    localStorage.setItem('activeSection', sectionId);
    
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
    document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));
    
    // Update Header Title
    const titleEl = document.getElementById('currentSectionTitle');
    if (titleEl) titleEl.textContent = title;

    if (sectionId === 'projects') {
        document.getElementById('projectsSection').classList.add('active');
        loadAvailableProjects();
    } else if (sectionId === 'my-assignments') {
        document.getElementById('assignmentsSection').classList.add('active');
        loadUserAssignments();
    } else if (sectionId === 'dashboard') {
        document.getElementById('dashboardSection').classList.add('active');
        loadDashboard();
    } else if (sectionId === 'archive') {
        document.getElementById('archiveSection').classList.add('active');
        loadArchive();
    } else if (sectionId === 'admin') {
        document.getElementById('adminSection').classList.add('active');
        loadAdminPanel();
    }
    
    btn.classList.add('active');
    
    // Close sidebar on mobile after click
    if (window.innerWidth <= 1024) {
        document.querySelector('.sidebar').classList.remove('open');
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        if (mobileMenuBtn) {
            mobileMenuBtn.innerHTML = '<i data-lucide="menu"></i>';
            lucide.createIcons();
        }
    }
}

function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `message ${type}`;
}

// Project Functions
async function loadAvailableProjects() {
    const projectsList = document.getElementById('projectsList');
    projectsList.innerHTML = '<div class="loading">Projeler yükleniyor</div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/projects/available`);
        const projects = await response.json();
        
        if (projects.length === 0) {
            projectsList.innerHTML = '<div class="empty-state"><h3>Müsait Proje Yok</h3><p>Tüm projeler şu anda alınmış durumda.</p></div>';
            return;
        }
        
        projectsList.innerHTML = '';
        projects.forEach(project => {
            const card = createProjectCard(project);
            projectsList.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading projects:', error);
        projectsList.innerHTML = '<div class="empty-state"><p>Projeler yüklenemedi</p></div>';
    }
}

function getStatusLabel(status) {
    const labels = {
        'planning': '<i data-lucide="compass"></i> Planlama',
        'in_progress': '<i data-lucide="settings"></i> Geliştirme',
        'testing': '<i data-lucide="test-tube"></i> Test',
        'completed': '<i data-lucide="check-circle"></i> Tamamlandı'
    };
    return labels[status] || status;
}

function getStatusClass(status) {
    const classes = {
        'planning': 'status-planning',
        'in_progress': 'status-progress',
        'testing': 'status-testing',
        'completed': 'status-completed'
    };
    return classes[status] || '';
}

function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'card project-card';
    const isTaken = project.isTaken;
    
    card.dataset.name = (project.originalName || '').toLowerCase();
    card.dataset.desc = (project.description || '').toLowerCase();
    card.dataset.status = isTaken ? 'taken' : 'available';
    
    card.innerHTML = `
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
            <div class="card-title-group">
                <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 4px;">${project.originalName}</h3>
                <div class="meta-row" style="display: flex; gap: 12px; font-size: 12px; color: var(--text-muted);">
                    <span><i data-lucide="brain" style="width: 12px;"></i> ${project.level || 'Orta'}</span>
                </div>
            </div>
            <span class="status-badge ${isTaken ? 'status-testing' : 'status-completed'}">
                <i data-lucide="${isTaken ? 'lock' : 'unlock'}"></i> ${isTaken ? 'Dolu' : 'Müsait'}
            </span>
        </div>
        <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 24px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${project.description || 'Bu proje için henüz bir açıklama eklenmemiş.'}
        </p>
        <div class="card-footer" style="display: flex; gap: 12px; margin-top: auto; padding-top: 20px; border-top: 1px solid var(--border-light);">
            <button class="btn btn-secondary btn-view-detail" style="flex: 1;">
                <i data-lucide="eye"></i> İncele
            </button>
            ${!isTaken ? `
                <button class="btn btn-primary btn-take-quick" style="flex: 1;">
                    <i data-lucide="zap"></i> Başlat
                </button>` : ''}
        </div>
    `;
    
    card.querySelector('.btn-view-detail').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('previewProjectName').textContent = project.originalName;
        document.getElementById('previewProjectDesc').textContent = project.description || 'Açıklama yok';
        const statusEl = document.getElementById('previewProjectStatus');
        statusEl.innerHTML = `<span class="status-badge ${isTaken ? 'status-testing' : 'status-completed'}">${isTaken ? 'Alındı' : 'Müsait'}</span>`;
        document.getElementById('projectPreviewModal').style.display = 'flex';
        lucide.createIcons();
    });

    if (!isTaken) {
        card.querySelector('.btn-take-quick').addEventListener('click', async (e) => {
            e.stopPropagation();
            currentProject = project;
            await handleTakeProject();
        });
    }

    card.addEventListener('click', () => showProjectDetail(project));
    return card;
}

async function loadUserAssignments() {
    const assignmentsList = document.getElementById('assignmentsList');
    const completedList = document.getElementById('completedAssignmentsList');
    
    assignmentsList.innerHTML = '<div class="loading">Projeler yükleniyor</div>';
    completedList.innerHTML = '<div class="loading">Yükleniyor...</div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/assignments/user/${currentUser._id}`);
        const assignments = await response.json();
        
        const active = assignments.filter(a => a.status !== 'completed');
        const completed = assignments.filter(a => a.status === 'completed');
        
        // Active Projects
        if (active.length === 0) {
            assignmentsList.innerHTML = '<div class="empty-state"><h3>Aktif Proje Yok</h3><p>Henüz bir proje başlatmadınız.</p></div>';
        } else {
            assignmentsList.innerHTML = '';
            active.forEach(assignment => {
                const card = createAssignmentCard(assignment);
                assignmentsList.appendChild(card);
            });
        }

        // Completed Projects
        if (completed.length === 0) {
            completedList.innerHTML = '<div class="empty-state"><h3>Tamamlanan Proje Yok</h3></div>';
        } else {
            completedList.innerHTML = '';
            completed.forEach(assignment => {
                const card = createAssignmentCard(assignment);
                // Style completed cards slightly differently
                card.style.opacity = '0.85';
                card.style.borderLeft = '4px solid var(--success-color)';
                completedList.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Error loading assignments:', error);
        assignmentsList.innerHTML = '<div class="empty-state"><p>Projeler yüklenemedi</p></div>';
        completedList.innerHTML = '';
    }
}

function createAssignmentCard(assignment) {
    const card = document.createElement('div');
    card.className = 'card assignment-card';
    const isOwner = assignment.createdBy === currentUser._id;
    const progress = (assignment.progress !== undefined) ? assignment.progress : 0;
    
    card.innerHTML = `
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
            <div class="card-title-group">
                <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 4px;">${assignment.projectName}</h3>
                <div class="meta-row" style="display: flex; gap: 12px; font-size: 12px; color: var(--text-muted);">
                    <span><i data-lucide="clock" style="width: 12px;"></i> ${assignment.level || 'Orta'}</span>
                </div>
            </div>
            <span class="status-badge ${getStatusClass(assignment.status)}">
                ${getStatusLabel(assignment.status)}
            </span>
        </div>
        <div class="progress-section" style="margin-bottom: 24px;">
            <div class="progress-info" style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 8px;">
                <span style="color: var(--text-secondary);">İlerleme Durumu</span>
                <span style="color: var(--primary);">%${progress}</span>
            </div>
            <div class="progress-bar-container" style="height: 10px; background: var(--bg); border-radius: 5px; overflow: hidden;">
                <div class="progress-bar" style="width: ${progress}%; height: 100%; background: linear-gradient(to right, var(--primary), var(--primary-light)); border-radius: 5px; transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);"></div>
            </div>
        </div>
        <div class="card-footer" style="display: flex; gap: 12px; padding-top: 20px; border-top: 1px solid var(--border-light);">
            <button class="btn btn-primary" onclick="showAssignmentDetail('${assignment.assignmentId}')" style="flex: 1;">
                <i data-lucide="settings"></i> Yönet
            </button>
            ${isOwner ? `
                <button class="btn btn-secondary" onclick="handleReleaseProjectQuick('${assignment.assignmentId}', '${assignment.originalProjectName}')">
                    <i data-lucide="log-out"></i> Bırak
                </button>` : ''}
        </div>
    `;
    
    lucide.createIcons();
    return card;
}
async function showProjectDetail(project) {
    currentProject = project;
    
    const modal = document.getElementById('projectModal');
    const nameEl = document.getElementById('modalProjectName');
    const descEl = document.getElementById('modalProjectDescription');
    const teamSection = document.getElementById('modalTeamSection');
    const teamMembersList = document.getElementById('modalTeamMembers');
    const adminPanel = document.getElementById('adminPanel');
    const takeBtn = document.getElementById('modalTakeProjectBtn');
    const renameBtn = document.getElementById('modalRenameProjectBtn');
    const releaseBtn = document.getElementById('modalReleaseProjectBtn');
    
    nameEl.textContent = project.originalName;
    descEl.textContent = project.description || 'Açıklama yok';

    // ── Sıfırla: eski projenin verileri görünmesin ──────────────
    document.getElementById('filesList').innerHTML = '<p style="font-size:0.9rem;color:#7f8c8d;padding:10px;">Yükleniyor...</p>';
    document.getElementById('milestonesList').innerHTML = '';
    const progressBar = document.getElementById('progressBarFill');
    if (progressBar) progressBar.style.width = '0%';
    document.getElementById('progressPercent').textContent = '0';
    document.getElementById('progressSlider').value = 0;
    document.getElementById('progressNotes').value = '';
    document.getElementById('chatMessages').innerHTML = '<div class="empty-state">Yükleniyor...</div>';
    document.getElementById('modalProgressSection').style.display = 'none';
    document.getElementById('modalTimeTrackingSection').style.display = 'none';
    const tabsSectionReset = document.getElementById('modalTabsSection');
    if (tabsSectionReset) tabsSectionReset.style.display = 'none';
    // ────────────────────────────────────────────────────────────
    
    // Load full project details
    try {
        const response = await fetch(`${API_BASE_URL}/projects/${project._id}`);
        const fullProject = await response.json();
        currentProject = fullProject;
        
        if (fullProject.team) {
            teamSection.style.display = 'block';
            teamMembersList.innerHTML = '';
            
            fullProject.team.members.forEach(member => {
                const memberEl = document.createElement('div');
                memberEl.className = 'team-member-item';
                const isCreator = fullProject.team.createdBy === member.userId;
                memberEl.innerHTML = `
                    <div>
                        <div class="username">${member.username}</div>
                        ${isCreator ? '<div class="role">👑 Sahip</div>' : ''}
                    </div>
                    ${currentUser._id === fullProject.team.createdBy && !isCreator ? 
                        `<button class="remove-btn" onclick="handleRemoveMember('${fullProject.team.assignmentId}', '${member.userId}')">Çıkar</button>` : ''}
                `;
                teamMembersList.appendChild(memberEl);
            });
            
            // Show admin panel if user is owner
            if (currentUser._id === fullProject.team.createdBy) {
                adminPanel.style.display = 'block';
                loadAvailableUsers(fullProject.team.members.map(m => m.userId));
            } else {
                adminPanel.style.display = 'none';
            }
            
            takeBtn.style.display = 'none';
            renameBtn.style.display = currentUser._id === fullProject.team.createdBy ? 'block' : 'none';
            releaseBtn.style.display = currentUser._id === fullProject.team.createdBy ? 'block' : 'none';
            
            // Load and display progress
            loadAndShowProgress(fullProject);
            
            // V3.0 Features
            const tabsSection = document.getElementById('modalTabsSection');
            if (tabsSection) tabsSection.style.display = 'block';
            
            document.getElementById('modalTimeTrackingSection').style.display = 'flex';
            loadTimerStatus(fullProject.team.assignmentId);
            initializeSocket(fullProject.team.assignmentId);
            switchModalTab('comments');

            // Load comments
            loadComments(fullProject.team.assignmentId);
        } else {
            teamSection.style.display = 'none';
            takeBtn.style.display = 'block';
            renameBtn.style.display = 'none';
            releaseBtn.style.display = 'none';
            
            const tabsSection = document.getElementById('modalTabsSection');
            if (tabsSection) tabsSection.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading project details:', error);
    }
    
    modal.style.display = 'flex';
}

async function loadAvailableUsers(excludeUserIds = []) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/users`);
        const users = await response.json();
        
        const selectEl = document.getElementById('newMemberSelect');
        selectEl.innerHTML = '<option value="">Üye Seç</option>';
        
        users.forEach(user => {
            if (user._id !== currentUser._id && !excludeUserIds.includes(user._id)) {
                const option = document.createElement('option');
                option.value = user._id;
                option.textContent = user.username;
                selectEl.appendChild(option);
            }
        });
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function handleTakeProject() {
    try {
        const response = await fetch(`${API_BASE_URL}/projects/${currentProject._id}/take`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ userId: currentUser._id })
        });
        
        if (response.ok) {
            showToast('Proje başarıyla alındı!', 'success');
            closeModal.call(document.getElementById('projectModal').querySelector('.close'));
            loadAvailableProjects();
            loadUserAssignments();
        } else {
            const data = await response.json();
            showToast('Hata: ' + (data.message || 'Bilinmeyen hata'), 'error');
        }
    } catch (error) {
        console.error('Error taking project:', error);
        showToast('Hata: ' + error.message, 'error');
    }
}

function showRenameModal() {
    document.getElementById('renameModal').style.display = 'flex';
    document.getElementById('newProjectName').value = currentProject.currentName;
}

async function handleRenameProject() {
    const newName = document.getElementById('newProjectName').value;
    
    if (!newName.trim()) {
        alert('Proje adı boş olamaz');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/projects/${currentProject._id}/rename`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
                userId: currentUser._id,
                newName: newName
            })
        });
        
        if (response.ok) {
            showToast('Proje adı başarıyla güncellendi!', 'success');
            document.getElementById('modalProjectName').textContent = newName;
            currentProject.currentName = newName;
            closeModal.call(document.getElementById('renameModal').querySelector('.close'));
        } else {
            const data = await response.json();
            showToast('Hata: ' + (data.message || 'Bilinmeyen hata'), 'error');
        }
    } catch (error) {
        console.error('Error renaming project:', error);
        showToast('Hata: ' + error.message, 'error');
    }
}

async function handleAddMember() {
    const userId = document.getElementById('newMemberSelect').value;
    
    if (!userId) {
        alert('Lütfen bir üye seçin');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/assignments/${currentProject.team.assignmentId}/add-member`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
                userId: userId,
                requesterId: currentUser._id
            })
        });
        
        if (response.ok) {
            showToast('Üye başarıyla eklendi!', 'success');
            showProjectDetail(currentProject);
        } else {
            const data = await response.json();
            showToast('Hata: ' + (data.message || 'Bilinmeyen hata'), 'error');
        }
    } catch (error) {
        console.error('Error adding member:', error);
        showToast('Hata: ' + error.message, 'error');
    }
}

async function handleRemoveMember(assignmentId, memberId) {
    if (!confirm('Bu üyeyi takımdan çıkarmak istediğinize emin misiniz? ⚠️')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/assignments/${assignmentId}/remove-member`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
                memberId: memberId,
                requesterId: currentUser._id
            })
        });
        
        if (response.ok) {
            showToast('Üye başarıyla çıkarıldı!', 'success');
            showProjectDetail(currentProject);
        } else {
            const data = await response.json();
            showToast('Hata: ' + (data.message || 'Bilinmeyen hata'), 'error');
        }
    } catch (error) {
        console.error('Error removing member:', error);
        showToast('Hata: ' + error.message, 'error');
    }
}

async function handleReleaseProject() {
    if (!confirm('Bu projeyi bırakmak istediğinize emin misiniz?\nProje adı orijinal haline döner ve takım dağılır. ⚠️')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/assignments/${currentProject.team.assignmentId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
                requesterId: currentUser._id
            })
        });
        
        if (response.ok) {
            showToast('Proje başarıyla bırakıldı!', 'success');
            closeModal.call(document.getElementById('projectModal').querySelector('.close'));
            loadAvailableProjects();
            loadUserAssignments();
        } else {
            const data = await response.json();
            showToast('Hata: ' + (data.message || 'Bilinmeyen hata'), 'error');
        }
    } catch (error) {
        console.error('Error releasing project:', error);
        showToast('Hata: ' + error.message, 'error');
    }
}

function handleReleaseProjectQuick(assignmentId, originalName) {
    if (!confirm('Bu projeyi bırakmak istediğinize emin misiniz?')) {
        return;
    }
    
    fetch(`${API_BASE_URL}/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({
            requesterId: currentUser._id
        })
    }).then(response => {
        if (response.ok) {
            showToast('Proje başarıyla bırakıldı!', 'success');
            loadAvailableProjects();
            loadUserAssignments();
        } else {
            showToast('Hata: Proje bırakılamadı', 'error');
        }
    }).catch(error => {
        console.error('Error releasing project:', error);
        showToast('Hata: ' + error.message, 'error');
    });
}

function closeModal(e) {
    const modal = e ? e.target.closest('.modal') : document.querySelector('.modal[style*="display: flex"]');
    if (modal) {
        modal.style.display = 'none';
        
        // V3.0 Cleanup
        if (modal.id === 'projectModal') {
            if (socket) {
                socket.emit('leave', { assignmentId: currentProject.team.assignmentId });
                socket.disconnect();
                socket = null;
            }
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        }
    }
}

function showAssignmentDetail(assignmentId) {
    // Load and show assignment details in modal
    fetch(`${API_BASE_URL}/assignments/${assignmentId}`, {
        headers: { 'Authorization': `Bearer ${currentToken}` }
    })
    .then(response => {
        if (!response.ok) throw new Error('Assignment not found');
        return response.json();
    })
    .then(assignment => {
        // Show in project modal
        fetch(`${API_BASE_URL}/projects/${assignment.projectId}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        })
        .then(response => {
            if (!response.ok) throw new Error('Project not found');
            return response.json();
        })
        .then(project => {
            showProjectDetail(project);
        })
        .catch(err => {
            console.error('Error loading project for assignment:', err);
            showToast('Proje detayları yüklenemedi', 'error');
        });
    })
    .catch(err => {
        console.error('Error loading assignment:', err);
        showToast('Görev detayları yüklenemedi', 'error');
    });
}
// ── Dashboard Functions (Unified) ───────────────────────────
// Handled by updateDashboardUI and renderStatusChart at the end of file

function getActivityLabel(action) {
    const labels = {
        'project_taken': '📌 Proje aldı',
        'member_added': '➕ Üye ekledi',
        'name_changed': '✏️ Proje adını değiştirdi',
        'member_removed': '➖ Üye çıkardı',
        'project_released': '🔓 Projeyi bıraktı',
        'progress_updated': '📈 İlerleme güncelledi',
        'status_changed': '🔄 Durumunu değiştirdi',
        'milestone_added': '🎯 Milestone ekledi',
        'milestone_updated': '✓ Milestone güncelledi'
    };
    return labels[action] || action;
}

// Admin Panel Functions
async function loadAdminPanel() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/stats`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const stats = await response.json();
        
        // Update stats
        document.getElementById('adminTotalProjects').textContent = stats.totalProjects;
        document.getElementById('adminTakenProjects').textContent = stats.takenProjects;
        document.getElementById('adminAvailableProjects').textContent = stats.availableProjects;
        document.getElementById('adminTotalAssignments').textContent = stats.totalAssignments;
        document.getElementById('adminTotalUsers').textContent = stats.totalUsers;
        
        // Display recent assignments
        const recentList = document.getElementById('adminRecentAssignments');
        let recentTableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Proje</th>
                        <th>Sahip</th>
                        <th>Üye Sayısı</th>
                        <th>Durum</th>
                        <th>İlerleme</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        stats.recentAssignments.forEach(assignment => {
            recentTableHTML += `
                <tr>
                    <td>${assignment.projectName}</td>
                    <td>${assignment.ownerName}</td>
                    <td>${assignment.memberCount}</td>
                    <td><span class="status-badge status-${assignment.status}">${assignment.status}</span></td>
                    <td>${assignment.progress}%</td>
                </tr>
            `;
        });
        
        recentTableHTML += '</tbody></table>';
        recentList.innerHTML = recentTableHTML;
        
        // Load projects list
        await loadAdminProjectsList();
        
    } catch (error) {
        console.error('Error loading admin panel:', error);
    }
}

async function loadAdminProjectsList() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/projects`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const projects = await response.json();
        
        const projectsList = document.getElementById('adminProjectsList');
        let projectsTableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Proje Adı</th>
                        <th>Durumu</th>
                        <th>Sahip</th>
                        <th>Üye Sayısı</th>
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        projects.forEach(project => {
            const status = project.isTaken ? 'Alınmış' : 'Müsait';
            projectsTableHTML += `
                <tr>
                    <td style="font-weight: 600;">${project.originalName}</td>
                    <td><span class="status-badge ${project.isTaken ? 'status-process' : 'status-completed'}">${status}</span></td>
                    <td>${project.ownerName || '-'}</td>
                    <td>${project.memberCount || 0}</td>
                    <td>
                        <div class="table-actions">
                            <button class="icon-btn btn-edit" data-project-id="${project._id}" data-project-name="${project.originalName}" data-project-desc="${project.description || ''}" title="Düzenle">
                                <i data-lucide="edit-3"></i>
                            </button>
                            <button class="icon-btn danger btn-delete" data-project-id="${project._id}" data-project-name="${project.originalName}" title="Sil">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        projectsTableHTML += '</tbody></table>';
        projectsList.innerHTML = projectsTableHTML;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
        // Add event listeners to buttons
        projectsList.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const projectId = btn.getAttribute('data-project-id');
                const projectName = btn.getAttribute('data-project-name');
                const projectDesc = btn.getAttribute('data-project-desc');
                showEditProjectModal(projectId, projectName, projectDesc);
            });
        });
        
        projectsList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const projectId = btn.getAttribute('data-project-id');
                const projectName = btn.getAttribute('data-project-name');
                showDeleteConfirm(projectId, projectName);
            });
        });
        
    } catch (error) {
        console.error('Error loading projects list:', error);
    }
}

async function loadAdminAssignmentsList() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/assignments`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const assignments = await response.json();
        
        const list = document.getElementById('adminAssignmentsList');
        let assignmentsTableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Proje</th>
                        <th>Sahip</th>
                        <th>Üyeler</th>
                        <th>Durum</th>
                        <th>İlerleme</th>
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        assignments.forEach(a => {
            assignmentsTableHTML += `
                <tr>
                    <td style="font-weight:600;">${a.projectName}</td>
                    <td>${a.ownerName}</td>
                    <td>${a.memberCount}</td>
                    <td><span class="status-badge status-${a.status}">${a.status}</span></td>
                    <td>
                        <div class="progress-bar-container" style="width: 80px; margin: 0;">
                            <div class="progress-bar" style="width: ${a.progress}%"></div>
                        </div>
                        <span style="font-size: 11px; font-weight: 600;">%${a.progress}</span>
                    </td>
                    <td>
                        <button class="btn btn-small btn-danger" onclick="handleForceDeleteAssignment('${a._id}')">
                            <i data-lucide="trash-2" style="width:14px;height:14px;"></i> Zorla Sil
                        </button>
                    </td>
                </tr>
            `;
        });
        
        assignmentsTableHTML += '</tbody></table>';
        list.innerHTML = assignmentsTableHTML;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
        console.error('Error loading admin assignments:', error);
    }
}

async function loadAdminUsersList() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const users = await response.json();
        
        const list = document.getElementById('adminUsersList');
        let usersTableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Kullanıcı</th>
                        <th>E-posta</th>
                        <th>Proje Sayısı</th>
                        <th>Rol</th>
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        users.forEach(u => {
            const isAdmin = u.is_admin || false;
            usersTableHTML += `
                <tr>
                    <td><strong>${u.username}</strong></td>
                    <td>${u.email}</td>
                    <td>${u.projectCount || 0}</td>
                    <td><span class="status-badge ${isAdmin ? 'status-testing' : 'status-planning'}">${isAdmin ? '👑 Admin' : '👤 Üye'}</span></td>
                    <td>
                        <button class="btn btn-small ${isAdmin ? 'btn-secondary' : 'btn-primary'}" 
                            onclick="handleUserRoleChange('${u._id}', ${!isAdmin})">
                            ${isAdmin ? 'Yetkiyi Al' : 'Admin Yap'}
                        </button>
                    </td>
                </tr>
            `;
        });
        
        usersTableHTML += '</tbody></table>';
        list.innerHTML = usersTableHTML;
    } catch (error) {
        console.error('Error loading admin users:', error);
    }
}

async function handleForceDeleteAssignment(assignmentId) {
    if (!confirm('DİKKAT! Bu görev kalıcı olarak silinecek ve proje boşa çıkarılacak. Emin misiniz?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/assignments/${assignmentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (response.ok) {
            showToast('Görev zorla silindi', 'success');
            loadAdminAssignmentsList();
            loadAdminPanel();
        } else {
            const data = await response.json();
            showToast(data.message || 'Silme başarısız', 'error');
        }
    } catch (error) {
        console.error('Force delete error:', error);
    }
}

async function handleUserRoleChange(userId, newIsAdmin) {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ is_admin: newIsAdmin })
        });
        
        if (response.ok) {
            showToast('Kullanıcı rolü güncellendi', 'success');
            loadAdminUsersList();
        } else {
            const data = await response.json();
            showToast(data.message || 'Hata oluştu', 'error');
        }
    } catch (error) {
        console.error('Role change error:', error);
    }
}

function setupAdminTabButtons() {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const currentBtn = e.currentTarget;
            document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
            
            currentBtn.classList.add('active');
            const tabId = currentBtn.getAttribute('data-admin-tab');
            const targetTab = document.getElementById(`admin${tabId.charAt(0).toUpperCase() + tabId.slice(1)}Tab`);
            if (targetTab) targetTab.classList.add('active');

            // Lazy-load tab data
            if (tabId === 'assignments') loadAdminAssignmentsList();
            else if (tabId === 'users') loadAdminUsersList();
            else if (tabId === 'projects') loadAdminProjectsList();
        });
    });
}

// ── Notification System ────────────────────────────────────────
function toggleNotificationDropdown() {
    const dropdown = document.getElementById('notificationDropdown');
    const isOpen = dropdown.style.display !== 'none';
    if (isOpen) {
        dropdown.style.display = 'none';
    } else {
        dropdown.style.display = 'flex';
        loadNotifications();
    }
}

async function loadNotificationCount() {
    if (!currentUser) return;
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard/notifications/${currentUser._id}/count`);
        if (response.ok) {
            const data = await response.json();
            updateBadge(data.unreadCount);
        }
    } catch (error) {
        console.error('Error loading notification count:', error);
    }
}

function updateBadge(count) {
    const badge = document.getElementById('notificationBadge');
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
}

async function loadNotifications() {
    if (!currentUser) return;
    const list = document.getElementById('notificationList');
    list.innerHTML = '<div class="notif-loading">Yükleniyor...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/dashboard/notifications/${currentUser._id}`);
        if (!response.ok) throw new Error('API error');
        const notifications = await response.json();

        if (notifications.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>📭 Bildirim yok</p></div>';
            return;
        }

        list.innerHTML = '';
        notifications.forEach(notif => {
            const item = document.createElement('div');
            item.className = `notification-item ${notif.read ? '' : 'unread'}`;
            const time = new Date(notif.createdAt).toLocaleString('tr-TR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
            item.innerHTML = `
                <div class="notification-content">
                    <div class="notification-title">${getNotifIcon(notif.type)} ${notif.title}</div>
                    <div class="notification-message">${notif.message}</div>
                    <div class="notification-time">${time}</div>
                </div>
                ${!notif.read ? `<button class="btn-mark-read" onclick="markNotificationRead('${notif._id}')">✓ Oku</button>` : ''}
            `;
            list.appendChild(item);
        });
    } catch (error) {
        list.innerHTML = '<div class="empty-state"><p>Bildirimler yüklenemedi</p></div>';
        console.error('Error loading notifications:', error);
    }
}

function getNotifIcon(type) {
    const icons = {
        'member_added': '➕',
        'member_removed': '➖',
        'name_changed': '✏️',
        'project_released': '🔓',
        'admin_broadcast': '📢'
    };
    return icons[type] || '🔔';
}

async function markNotificationRead(notifId) {
    try {
        await fetch(`${API_BASE_URL}/dashboard/notifications/${notifId}/read`, { method: 'POST' });
        loadNotifications();
        loadNotificationCount();
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function markAllNotificationsRead() {
    if (!currentUser) return;
    try {
        await fetch(`${API_BASE_URL}/dashboard/notifications/${currentUser._id}/read-all`, { method: 'POST' });
        loadNotifications();
        updateBadge(0);
        showToast('Tüm bildirimler okundu olarak işaretlendi', 'success');
    } catch (error) {
        console.error('Error marking all as read:', error);
    }
}

// showToast was redundant here, consolidated to the lucide-powered version at the end of the file.

// ── Admin CRUD Functions ──────────────────────────────────────
function showCreateProjectModal() {
    document.getElementById('createProjectModal').style.display = 'flex';
}

async function handleCreateProject(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById('createProjectName');
    const descInput = document.getElementById('createProjectDesc');
    
    if (!nameInput || !descInput) return;
    
    const name = nameInput.value;
    const description = descInput.value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ originalName: name, description })
        });
        
        if (response.ok) {
            showToast('Proje başarıyla oluşturuldu!', 'success');
            document.getElementById('createProjectForm').reset();
            document.getElementById('createProjectModal').style.display = 'none';
            loadAdminPanel();
            loadAvailableProjects();
        } else {
            const data = await response.json();
            showToast('Hata: ' + (data.message || 'Proje oluşturulamadı'), 'error');
        }
    } catch (error) {
        console.error('Error creating project:', error);
        showToast('Hata: ' + error.message, 'error');
    }
}

function showEditProjectModal(id, name, desc) {
    const modal = document.getElementById('editProjectModal');
    document.getElementById('editProjectId').value = id;
    document.getElementById('editProjectName').value = name;
    document.getElementById('editProjectDesc').value = desc;
    modal.style.display = 'flex';
}

async function handleEditProject(e) {
    e.preventDefault();
    
    const id = document.getElementById('editProjectId').value;
    const name = document.getElementById('editProjectName').value;
    const description = document.getElementById('editProjectDesc').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/projects/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ originalName: name, description })
        });
        
        if (response.ok) {
            showToast('Proje başarıyla güncellendi!', 'success');
            document.getElementById('editProjectModal').style.display = 'none';
            loadAdminPanel();
            loadAvailableProjects();
        } else {
            const data = await response.json();
            showToast('Hata: ' + (data.message || 'Güncelleme başarısız'), 'error');
        }
    } catch (error) {
        console.error('Error editing project:', error);
        showToast('Hata: ' + error.message, 'error');
    }
}

function showDeleteConfirm(id, name) {
    const modal = document.getElementById('deleteConfirmModal');
    document.getElementById('deleteConfirmMessage').textContent = `"${name}" adlı projeyi silmek istediğinize emin misiniz? Sistemden tamamen kaldırılacaktır.`;
    document.getElementById('confirmDeleteBtn').setAttribute('data-id', id);
    modal.style.display = 'flex';
}

async function handleDeleteProject() {
    const id = this.getAttribute('data-id');
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/projects/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (response.ok) {
            showToast('Proje başarıyla silindi!', 'success');
            document.getElementById('deleteConfirmModal').style.display = 'none';
            loadAdminPanel();
            loadAvailableProjects();
        } else {
            const data = await response.json();
            showToast('Hata: ' + (data.message || 'Silme başarısız'), 'error');
        }
    } catch (error) {
        console.error('Error deleting project:', error);
        showToast('Hata: ' + error.message, 'error');
    }
}
// ── Project Progress Functions ────────────────────────────────
async function loadAndShowProgress(project) {
    const progressSection = document.getElementById('modalProgressSection');
    const progressBarFill = document.getElementById('progressBarFill');
    const progressText = document.getElementById('progressPercent');
    const milestoneList = document.getElementById('milestonesList');
    const statusSelect = document.getElementById('progressStatus');
    
    if (progressSection) progressSection.style.display = 'block';
    
    try {
        const response = await fetch(`${API_BASE_URL}/progress/${project.team.assignmentId}`);
        if (!response.ok) throw new Error('Progress not found');
        const progress = await response.json();
        
        // Update UI
        const percent = progress.progress || 0;
        if (progressBarFill) progressBarFill.style.width = `${percent}%`;
        if (progressText) progressText.textContent = percent;
        if (statusSelect) statusSelect.value = progress.status || 'planning';
        
        const slider = document.getElementById('progressSlider');
        const notesArea = document.getElementById('progressNotes');
        const saveBtn = document.getElementById('saveProgressBtn');
        
        if (slider) slider.value = percent;
        if (notesArea) notesArea.value = progress.notes || '';
        
        // Permissions
        const isMember = project.team.members.some(m => m.userId === currentUser._id);
        const isOwner = currentUser._id === project.team.createdBy;
        const canEdit = isOwner || isMember || currentUser.is_admin;
        
        if (statusSelect) statusSelect.disabled = !canEdit;
        if (slider) slider.disabled = !canEdit;
        if (notesArea) notesArea.disabled = !canEdit;
        if (saveBtn) saveBtn.style.display = canEdit ? 'block' : 'none';
        
        // Milestones
        milestoneList.innerHTML = '';
        if (progress.milestones.length === 0) {
            milestoneList.innerHTML = '<p style="font-size: 0.9rem; color: #7f8c8d; padding: 10px;">Henüz milestone eklenmemiş.</p>';
        }
        
        progress.milestones.forEach((m, index) => {
            const item = document.createElement('div');
            item.className = `milestone-item ${m.completed ? 'completed' : ''}`;
            item.innerHTML = `
                <input type="checkbox" ${m.completed ? 'checked' : ''} ${currentUser._id !== project.team.createdBy ? 'disabled' : ''} 
                    onchange="handleToggleMilestone('${project.team.assignmentId}', ${index}, this.checked)">
                <span class="milestone-title">${m.title}</span>
                ${m.dueDate ? `<span class="milestone-date">${new Date(m.dueDate).toLocaleDateString('tr-TR')}</span>` : ''}
                ${currentUser._id === project.team.createdBy ? `<button class="btn-delete-milestone" onclick="handleDeleteMilestone('${project.team.assignmentId}', ${index})">🗑️</button>` : ''}
            `;
            milestoneList.appendChild(item);
        });
        
        // Show add milestone for owner
        document.getElementById('addMilestoneArea').style.display = isOwner ? 'block' : 'none';
        
        // Files
        const filesList = document.getElementById('filesList');
        filesList.innerHTML = '';
        if (!progress.files || progress.files.length === 0) {
            filesList.innerHTML = '<p style="font-size: 0.9rem; color: #7f8c8d; padding: 10px;">Henüz dosya yüklenmemiş.</p>';
        } else {
            progress.files.forEach(file => {
                const item = document.createElement('div');
                item.className = 'file-item';
                item.innerHTML = `
                    <span class="file-icon">📄</span>
                    <a href="${FILE_BASE_URL}/${file.filename}" target="_blank" class="file-name">${file.originalName}</a>
                    <span class="file-info">${new Date(file.uploadedAt).toLocaleDateString('tr-TR')}</span>
                    ${isOwner ? `<button class="btn-delete-file" title="Dosyayı Sil" data-filename="${file.filename}">🗑️</button>` : ''}
                `;
                if (isOwner) {
                    item.querySelector('.btn-delete-file').addEventListener('click', () => {
                        handleDeleteFile(file.filename, file.originalName);
                    });
                }
                filesList.appendChild(item);
            });
        }
        
        // File Upload Form Visibility
        document.getElementById('fileUploadContainer').style.display = isOwner ? 'block' : 'none';
        
    } catch (error) {
        console.error('Error loading progress:', error);
    }
}

async function handleStatusChange(status) {
    if (!currentProject || !currentProject.team) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/progress/${currentProject.team.assignmentId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ status: status, userId: currentUser._id })
        });
        
        if (response.ok) {
            showToast('Proje durumu güncellendi!', 'success');
            loadUserAssignments();
            loadAndShowProgress(currentProject);
        } else {
            const data = await response.json();
            showToast('Hata: ' + (data.message || 'Hata oluştu'), 'error');
        }
    } catch (error) {
        console.error('Error updating status:', error);
    }
}

async function handleSaveProgress() {
    if (!currentProject || !currentProject.team) return;
    
    const progress = document.getElementById('progressSlider').value;
    const status = document.getElementById('progressStatus').value;
    const notes = document.getElementById('progressNotes').value;
    const assignmentId = currentProject.team.assignmentId;
    
    try {
        const response = await fetch(`${API_BASE_URL}/progress/${assignmentId}/update`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ 
                progress: parseInt(progress), 
                status, 
                notes, 
                userId: currentUser._id 
            })
        });
        
        if (response.ok) {
            showToast('İlerleme kaydedildi!', 'success');
            loadUserAssignments();
            loadAndShowProgress(currentProject);
        }
    } catch (error) {
        console.error('Error saving progress:', error);
        showToast('Kaydedilemedi', 'error');
    }
}

async function handleAddMilestone() {
    const titleInput = document.getElementById('newMilestoneInput');
    const title = titleInput.value.trim();
    
    if (!title) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/progress/${currentProject.team.assignmentId}/milestones`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ title, userId: currentUser._id })
        });
        
        if (response.ok) {
            titleInput.value = '';
            loadAndShowProgress(currentProject);
        }
    } catch (error) {
        console.error('Error adding milestone:', error);
    }
}

async function handleToggleMilestone(assignmentId, index, completed) {
    try {
        await fetch(`${API_BASE_URL}/progress/${assignmentId}/milestones/${index}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ completed, userId: currentUser._id })
        });
        loadAndShowProgress(currentProject);
    } catch (error) {
        console.error('Error toggling milestone:', error);
    }
}

// ── Admin Broadcast ──────────────────────────────────────────
async function handleBroadcastSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('broadcastTitle').value.trim();
    const message = document.getElementById('broadcastMessage').value.trim();
    
    if (!title || !message) {
        showToast('Lütfen tüm alanları doldurun', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Gönderiliyor...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/broadcast`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ title, message, senderId: currentUser._id })
        });
        
        const data = await response.json();
        if (response.ok) {
            showToast('Duyuru tüm kullanıcılara gönderildi!', 'success');
            document.getElementById('broadcastForm').reset();
            document.getElementById('broadcastModal').style.display = 'none';
        } else {
            showToast('Hata: ' + (data.message || 'Duyuru gönderilemedi'), 'error');
        }
    } catch (error) {
        console.error('Error sending broadcast:', error);
        showToast('Hata: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '📢 Duyuru Yayınla';
    }
}

// ── Project Comments Functions ────────────────────────────────
async function loadComments(assignmentId) {
    const list = document.getElementById('commentsList');
    list.innerHTML = '<div style="text-align:center; padding:10px; font-size:0.8rem; color:var(--text-secondary);">Yükleniyor...</div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/progress/${assignmentId}/comments`);
        const comments = await response.json();
        
        list.innerHTML = '';
        if (comments.length === 0) {
            list.innerHTML = '<div style="text-align:center; padding:10px; font-size:0.8rem; color:var(--text-secondary);">Henüz yorum yok.</div>';
            return;
        }
        
        comments.forEach(c => {
            const item = document.createElement('div');
            item.className = 'comment-item';
            const time = new Date(c.createdAt).toLocaleString('tr-TR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
            
            // Explicit string comparison to be safe
            const isOwner = String(c.userId) === String(currentUser._id);
            const isAdmin = currentUser.is_admin === true || currentUser.is_admin === 'true';
            
            item.innerHTML = `
                <div class="comment-header">
                    <span class="comment-user">${c.username}</span>
                    <div class="comment-meta">
                        <span class="comment-time">${time}</span>
                        ${(isOwner || isAdmin) ? `<button class="btn-delete-comment" onclick="handleDeleteComment('${c._id}', '${assignmentId}')" title="Yorumu Sil">🗑️</button>` : ''}
                    </div>
                </div>
                <div class="comment-message">${c.message}</div>
            `;
            list.appendChild(item);
        });
        
        // Scroll to bottom
        list.scrollTop = list.scrollHeight;
    } catch (error) {
        console.error('Error loading comments:', error);
        list.innerHTML = '<div style="text-align:center; padding:10px; font-size:0.8rem; color:var(--danger-color);">Yorumlar yüklenemedi.</div>';
    }
}

async function handleDeleteComment(commentId, assignmentId) {
    if (!confirm('Bu yorumu silmek istediğinize emin misiniz?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/progress/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ userId: currentUser._id })
        });
        
        if (response.ok) {
            showToast('Yorum silindi', 'success');
            loadComments(assignmentId);
        } else {
            const data = await response.json();
            showToast(data.message || 'Yorum silinemedi', 'error');
        }
    } catch (error) {
        console.error('Comment delete error:', error);
        showToast('Bir hata oluştu', 'error');
    }
}

async function handleCommentSubmit(e) {
    e.preventDefault();
    
    if (!currentProject || !currentProject.team) return;
    
    const input = document.getElementById('commentInput');
    const message = input.value.trim();
    const assignmentId = currentProject.team.assignmentId;
    
    if (!message) return;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/progress/${assignmentId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
                userId: currentUser._id,
                message: message
            })
        });
        
        if (response.ok) {
            input.value = '';
            loadComments(assignmentId);
        } else {
            const data = await response.json();
            showToast(data.message || 'Yorum gönderilemedi', 'error');
        }
    } catch (error) {
        console.error('Error posting comment:', error);
        showToast('Bir hata oluştu', 'error');
    } finally {
        submitBtn.disabled = false;
    }
}

// ── Search & Filter Functions ────────────────────────────────
function filterProjects() {
    const query = document.getElementById('projectSearch').value.toLowerCase();
    const status = document.getElementById('projectStatusFilter').value;
    const cards = document.querySelectorAll('#projectsList .project-card');
    
    cards.forEach(card => {
        const name = card.dataset.name || '';
        const desc = card.dataset.desc || '';
        const cardStatus = card.dataset.status || '';
        
        const matchesQuery = name.includes(query) || desc.includes(query);
        const matchesStatus = status === 'all' || cardStatus === status;
        
        card.style.display = (matchesQuery && matchesStatus) ? '' : 'none';
    });
}

// ── File Management Functions ────────────────────────────────
async function handleFileUpload(e) {
    if (e) e.preventDefault();
    const fileInput = document.getElementById('projectFileInput');
    const files = fileInput.files;
    
    if (!files || files.length === 0) {
        showToast('Lütfen en az bir dosya seçin', 'info');
        return;
    }
    
    if (!currentProject || !currentProject.team) return;
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('file', files[i]);
    }
    formData.append('userId', currentUser._id);
    
    const btn = document.getElementById('uploadFileBtn');
    btn.disabled = true;
    btn.textContent = 'Yükleniyor...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/progress/${currentProject.team.assignmentId}/files`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            },
            body: formData
        });
        
        if (response.ok) {
            showToast('Dosya başarıyla yüklendi!', 'success');
            fileInput.value = '';
            document.getElementById('selectedFileName').textContent = 'Seçilmedi';
            loadAndShowProgress(currentProject);
        } else {
            const data = await response.json();
            showToast('Hata: ' + (data.message || 'Yükleme başarısız'), 'error');
        }
    } catch (error) {
        console.error('File upload error:', error);
        showToast('Bir hata oluştu', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '📁 Dosya Yükle';
    }
}

async function handleDeleteFile(filename, originalName) {
    if (!confirm(`'${originalName}' dosyasını silmek istediğinize emin misiniz?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/progress/${currentProject.team.assignmentId}/files/${filename}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ userId: currentUser._id })
        });
        
        if (response.ok) {
            showToast('Dosya başarıyla silindi', 'success');
            loadAndShowProgress(currentProject);
        } else {
            const data = await response.json();
            showToast('Hata: ' + (data.message || 'Silme işlemi başarısız'), 'error');
        }
    } catch (error) {
        console.error('File delete error:', error);
        showToast('Bir hata oluştu', 'error');
    }
}

// ── Dashboard Functions ───────────────────────────────────────
async function loadDashboard() {
    try {
        // Fetch Global Stats
        const statsResponse = await fetch(`${API_BASE_URL}/dashboard/stats`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const stats = await statsResponse.json();
        
        // Fetch User Summary
        const summaryResponse = await fetch(`${API_BASE_URL}/dashboard/user/${currentUser._id}/summary`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const summary = await summaryResponse.json();
        
        updateDashboardUI(stats, summary);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Dashboard verileri yüklenemedi', 'error');
    }
}

function updateDashboardUI(stats, summary) {
    // Hero Greeting
    const greetingEl = document.getElementById('heroGreeting');
    if (greetingEl) {
        const hour = new Date().getHours();
        let intro = "Merhaba";
        if (hour >= 5 && hour < 12) intro = "Günaydın";
        else if (hour >= 12 && hour < 18) intro = "Tünaydın";
        else if (hour >= 18 || hour < 5) intro = "İyi Akşamlar";
        greetingEl.textContent = `${intro}, ${currentUser.username}! 👋`;
    }

    // Global Stats
    document.getElementById('dashTotalProjects').textContent = stats.totalProjects;
    document.getElementById('dashTakenProjects').textContent = stats.takenProjects;
    document.getElementById('dashAvailableProjects').textContent = stats.availableProjects;
    document.getElementById('dashUserTotal').textContent = stats.totalUsers;
    
    // User Summary
    document.getElementById('userActiveProjects').textContent = summary.totalProjects;
    document.getElementById('userOwnedProjects').textContent = summary.ownedProjects;
    document.getElementById('userMemberProjects').textContent = summary.memberInProjects;
    document.getElementById('userCompletedProjects').textContent = summary.completedProjects;
    
    // Status Chart
    renderStatusChart(stats.projectsByStatus);
    
    // Recent Activities
    renderRecentActivities(stats.recentActivities);
}

function renderStatusChart(statusData) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    
    if (dashboardChart) {
        dashboardChart.destroy();
    }
    
    const labels = {
        'planning': '📅 Planlama',
        'in_progress': '💻 Geliştirme',
        'testing': '🧪 Test',
        'completed': '✅ Tamamlandı'
    };
    
    const data = {
        labels: Object.keys(statusData).map(key => labels[key] || key),
        datasets: [{
            data: Object.values(statusData),
            backgroundColor: [
                '#6366f1', // planning (primary)
                '#f59e0b', // in_progress (warning)
                '#818cf8', // testing (primary-light)
                '#10b981'  // completed (success)
            ],
            borderWidth: 0,
            hoverOffset: 10
        }]
    };
    
    dashboardChart = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: { size: 12 }
                    }
                }
            },
            cutout: '70%'
        }
    });
}

function renderRecentActivities(activities) {
    const container = document.getElementById('recentActivities');
    container.innerHTML = '';
    
    if (!activities || activities.length === 0) {
        container.innerHTML = '<div class="empty-state">Aktivite bulunmuyor</div>';
        return;
    }
    
    const activityIcons = {
        'project_created': 'plus-circle',
        'project_taken': 'play-circle',
        'member_added': 'user-plus',
        'progress_updated': 'trending-up',
        'status_changed': 'refresh-cw',
        'milestone_added': 'flag',
        'file_uploaded': 'file-up',
        'comment_added': 'message-square'
    };
    
    activities.forEach(act => {
        const item = document.createElement('div');
        item.className = 'activity-item-v2';
        
        const date = new Date(act.timestamp).toLocaleString('tr-TR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });
        
        item.innerHTML = `
            <div class="activity-dot"><i data-lucide="${activityIcons[act.type] || 'circle'}"></i></div>
            <div class="activity-info">
                <div class="activity-text"><strong>${act.username || 'Sistem'}</strong>: ${act.description}</div>
                <div class="activity-time">${date}</div>
            </div>
        `;
        container.appendChild(item);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ── Archive Functions ────────────────────────────────────────
async function loadArchive() {
    const archiveList = document.getElementById('archiveList');
    archiveList.innerHTML = '<div class="loading">Arşiv yükleniyor...</div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/projects/archive`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const projects = await response.json();
        
        if (projects.length === 0) {
            archiveList.innerHTML = '<div class="empty-state"><h3>Arşiv Boş</h3><p>Henüz tamamlanmış proje bulunmuyor.</p></div>';
            return;
        }
        
        archiveList.innerHTML = '';
        projects.forEach(project => {
            const card = document.createElement('div');
            card.className = 'archive-card';
            card.dataset.name = project.originalName.toLowerCase();
            
            card.innerHTML = `
                <div class="archive-header">
                    <h3>${project.originalName}</h3>
                    <span class="archive-date">${new Date(project.completedAt).toLocaleDateString('tr-TR')}</span>
                </div>
                <p>${project.description || 'Açıklama yok'}</p>
                <div class="archive-owner">👥 Ekip: ${project.team && project.team.length ? project.team.join(', ') : 'Bilinmiyor'}</div>
                <button class="btn btn-secondary btn-small" onclick="viewArchiveProject('${project.projectId}')">Detayları Gör</button>
            `;
            archiveList.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading archive:', error);
        archiveList.innerHTML = '<div class="empty-state"><p>Arşiv yüklenemedi</p></div>';
    }
}

function filterArchive() {
    const query = document.getElementById('archiveSearch').value.toLowerCase();
    document.querySelectorAll('.archive-card').forEach(card => {
        card.style.display = card.dataset.name.includes(query) ? '' : 'none';
    });
}

async function viewArchiveProject(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (!response.ok) throw new Error('Proje bulunamadı');
        const project = await response.json();
        showProjectDetail(project);
    } catch (error) {
        console.error('Error loading archive project:', error);
        showToast('Proje detayları yüklenemedi', 'error');
    }
}

async function loadMilestoneCalendar() {
    // Admin only calendar view logic here
}

// ── V3.0 Feature Functions ───────────────────────────────────
function switchModalTab(tabId) {
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-modal-tab') === tabId);
    });
    document.querySelectorAll('.modal-tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `modal${tabId.charAt(0).toUpperCase() + tabId.slice(1)}Tab`);
    });
}

function initializeSocket(assignmentId) {
    if (socket) socket.disconnect();
    
    socket = io('http://localhost:5000');
    
    socket.on('connect', () => {
        socket.emit('join', { assignmentId });
    });
    
    socket.on('previous_messages', (messages) => {
        const chatContainer = document.getElementById('chatMessages');
        chatContainer.innerHTML = '';
        if (messages.length === 0) {
            chatContainer.innerHTML = '<div class="empty-state">Henüz mesaj yok.</div>';
        } else {
            messages.forEach(msg => renderChatMessage(msg));
        }
        chatContainer.scrollTop = chatContainer.scrollHeight;
    });
    
    socket.on('new_message', (msg) => {
        renderChatMessage(msg);
        const chatContainer = document.getElementById('chatMessages');
        chatContainer.scrollTop = chatContainer.scrollHeight;
    });
}

function renderChatMessage(msg) {
    const chatContainer = document.getElementById('chatMessages');
    const isEmpty = chatContainer.querySelector('.empty-state');
    if (isEmpty) isEmpty.remove();
    
    const div = document.createElement('div');
    const isSelf = msg.username === currentUser.username;
    div.className = `chat-message ${isSelf ? 'self' : 'other'}`;
    
    const time = new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    
    div.innerHTML = `
        ${!isSelf ? `<div class="chat-user">${msg.username}</div>` : ''}
        <div class="chat-text">${msg.message}</div>
        <div class="chat-time">${time}</div>
    `;
    chatContainer.appendChild(div);
}

function handleChatSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message || !socket) return;
    
    socket.emit('message', {
        assignmentId: currentProject.team.assignmentId,
        userId: currentUser._id,
        username: currentUser.username,
        message: message
    });
    
    input.value = '';
}

async function loadTimerStatus(assignmentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/timetracking/status/${assignmentId}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const status = await response.json();
        
        timerSeconds = status.totalSeconds;
        updateTimerUI();
        
        if (status.active) {
            const start = new Date(status.startTime);
            const now = new Date();
            const sessionDiff = Math.floor((now - start) / 1000);
            timerSeconds += sessionDiff;
            startTimer(true); // resume
        } else {
            document.getElementById('startTimerBtn').style.display = 'inline-block';
            document.getElementById('stopTimerBtn').style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading timer status:', error);
    }
}

async function startTimer(isResume = false) {
    if (!isResume) {
        try {
            const response = await fetch(`${API_BASE_URL}/timetracking/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify({ assignmentId: currentProject.team.assignmentId })
            });
            if (!response.ok) return;
        } catch (error) {
            console.error('Error starting timer:', error);
            return;
        }
    }
    
    document.getElementById('startTimerBtn').style.display = 'none';
    document.getElementById('stopTimerBtn').style.display = 'inline-block';
    
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timerSeconds++;
        updateTimerUI();
    }, 1000);
}

async function stopTimer() {
    try {
        const response = await fetch(`${API_BASE_URL}/timetracking/stop`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ assignmentId: currentProject.team.assignmentId })
        });
        
        if (response.ok || response.status === 404) {
            clearInterval(timerInterval);
            timerInterval = null;
            document.getElementById('startTimerBtn').style.display = 'inline-block';
            document.getElementById('stopTimerBtn').style.display = 'none';
            if (response.ok) {
                showToast('Çalışma süresi kaydedildi.', 'success');
            } else {
                showToast('Aktif oturum bulunamadı, sayaç durduruldu.', 'warning');
            }
        } else {
            const err = await response.json();
            showToast('Hata: ' + (err.message || 'Zaman kaydedilemedi'), 'error');
        }
    } catch (error) {
        console.error('Error stopping timer:', error);
    }
}

function updateTimerUI() {
    const hours = Math.floor(timerSeconds / 3600);
    const minutes = Math.floor((timerSeconds % 3600) / 60);
    const seconds = timerSeconds % 60;
    
    const pad = (n) => n.toString().padStart(2, '0');
    document.getElementById('projectTimer').textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'alert-circle';
    if (type === 'warning') icon = 'alert-triangle';
    
    toast.innerHTML = `
        <i data-lucide="${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function getNotifIcon(type) {
    const icons = {
        'assignment': 'briefcase',
        'member_added': 'user-plus',
        'status_change': 'refresh-cw',
        'progress_update': 'trending-up',
        'milestone': 'flag',
        'file_upload': 'file-up',
        'comment': 'message-square',
        'broadcast': 'megaphone'
    };
    return icons[type] || 'bell';
}

function updateNotificationUI(count) {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        badge.style.display = count > 0 ? 'block' : 'none';
        badge.textContent = count > 9 ? '9+' : count;
    }
}
