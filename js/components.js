/**
 * UI Components
 * Generates HTML for shared components like Sidebar and Header
 */

const Components = {
    sidebar: (activePage, basePath = '') => {
        const user = AuthService.getCurrentUser();
        const isReporter = user && user.role === 'reporter';
        const isAdmin = user && user.role === 'admin';

        let menuItems = [];

        if (isAdmin) {
            menuItems = [
                { icon: '📝', label: 'Reports', href: 'admin/index.html#reports', active: activePage === 'admin' && (!window.location.hash || window.location.hash === '#reports') },
                { icon: '📊', label: 'Statistics', href: 'admin/index.html#stats', active: activePage === 'admin' && window.location.hash === '#stats' },
                // { icon: '🛠️', label: 'Maintenance', href: 'admin/index.html#maintenance', active: window.location.hash === '#maintenance' },
            ];
        } else {
            menuItems = [
                { icon: '📊', label: 'Statistik', href: 'dashboard.html', active: activePage === 'dashboard' },
            ];

            if (isReporter) {
                menuItems.push({ icon: '📝', label: 'Lapor Kesilapan', href: 'report.html', active: activePage === 'report' });
            }

            menuItems.push({ icon: '📝', label: 'Maklumbalas', href: 'feedback.html', active: activePage === 'feedback' });

            menuItems.push({ icon: '📚', label: 'Rujukan', href: 'references.html', active: activePage === 'references' });
        }

        return `
            <aside class="sidebar">
                <div class="sidebar-header">
                    <div class="logo">MedSafety Pro</div>
                </div>
                <nav class="sidebar-nav">
                    ${menuItems.map(item => `
                        <a href="${basePath}${item.href}" class="nav-item ${item.active ? 'active' : ''}">
                            <span class="nav-icon">${item.icon}</span>
                            <span class="nav-label">${item.label}</span>
                        </a>
                    `).join('')}
                </nav>
                <div class="sidebar-footer">
                    <button onclick="AuthService.logout()" class="nav-item logout-btn">
                        <span class="nav-icon">🚪</span>
                        <span class="nav-label">Logout</span>
                    </button>
                </div>
            </aside>
        `;
    },

    header: (title) => {
        const user = AuthService.getCurrentUser();
        return `
            <header class="header">
                <div class="header-left">
                    <button class="menu-toggle" onclick="toggleSidebar()">☰</button>
                    <h1 class="page-title">${title}</h1>
                </div>
                <div class="header-right">
                    <div class="user-profile">
                        <div class="avatar">${user ? user.fullname.charAt(0).toUpperCase() : 'U'}</div>
                        <div class="user-info">
                            <span class="user-name">${user ? user.fullname : 'Guest'}</span>
                            <span class="user-role">${user ? user.role : ''}</span>
                        </div>
                    </div>
                </div>
            </header>
        `;
    },

    renderLayout: (containerId, activePage, title, basePath = '') => {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="app-layout">
                ${Components.sidebar(activePage, basePath)}
                <main class="main-content">
                    ${Components.header(title)}
                    <div class="content-body" id="main-body">
                        <!-- Page Content Injected Here -->
                    </div>
                </main>
            </div>
        `;
    }
};

// Sidebar Toggle Logic
window.toggleSidebar = () => {
    document.querySelector('.sidebar').classList.toggle('open');
};
