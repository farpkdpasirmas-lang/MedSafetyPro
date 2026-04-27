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

        // Notifications Logic
        let notificationHtml = '';
        if (user && typeof UserNotifications !== 'undefined') {
            notificationHtml = `
                <div class="notification-container" style="position: relative; margin-right: 1.5rem;">
                    <button onclick="Components.toggleNotifications()" id="notification-bell-btn" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; position: relative; padding: 0.5rem;">
                        🔔
                    </button>
                    
                    <div id="notification-dropdown" style="display: none; position: absolute; right: 0; top: 100%; width: 320px; background: white; border-radius: var(--radius-md); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; z-index: 50; max-height: 400px; overflow-y: auto;">
                        <div style="padding: 1rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 51;">
                            <h3 style="margin: 0; font-size: 1rem; color: var(--color-text-main);">Notifications</h3>
                            <div id="notification-mark-all-container"></div>
                        </div>
                        <div id="notification-list" style="padding: 0;">
                            <div style="padding: 1.5rem; text-align: center; color: var(--color-text-muted); font-size: 0.9rem;">
                                Loading notifications...
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <header class="header">
                <div class="header-left">
                    <button class="menu-toggle" onclick="toggleSidebar()">☰</button>
                    <h1 class="page-title">${title}</h1>
                </div>
                <div class="header-right" style="display: flex; align-items: center;">
                    ${notificationHtml}
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

    toggleNotifications: () => {
        const dropdown = document.getElementById('notification-dropdown');
        if (dropdown) {
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        }
    },

    markAllRead: async (userEmail) => {
        if (typeof UserNotifications !== 'undefined') {
            try {
                await UserNotifications.markAllAsRead(userEmail);
            } catch (e) {
                console.error("Failed to mark all as read:", e);
            }
        }
    },

    handleNotificationClick: async (userEmail, notificationId, reportId) => {
        if (typeof UserNotifications !== 'undefined') {
            try {
                await UserNotifications.delete(userEmail, notificationId);
            } catch (e) {
                console.error("Failed to delete notification:", e);
            }
        }
        
        // Ensure redirect works everywhere (even from admin pages if admin has notifications)
        const isFromAdmin = window.location.pathname.includes('/admin/');
        const prefix = isFromAdmin ? '../' : '';
        window.location.href = `${prefix}feedback.html?reportId=${reportId}`;
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

        // Initialize notification listener if needed
        const user = AuthService.getCurrentUser();
        if (user && typeof UserNotifications !== 'undefined') {
            UserNotifications.listen(user.email, (notifications) => {
                Components.renderNotifications(notifications, user.email);
            });
        }
    },

    renderNotifications: (notifications, userEmail) => {
        const bellBtn = document.getElementById('notification-bell-btn');
        const listContainer = document.getElementById('notification-list');
        const markAllContainer = document.getElementById('notification-mark-all-container');

        if (!bellBtn || !listContainer) return;

        const unreadCount = notifications.filter(n => !n.read).length;

        // Update Bell
        let badgeHtml = '';
        if (unreadCount > 0) {
            badgeHtml = `<span style="position: absolute; top: 0; right: 0; background: #ef4444; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold; border: 2px solid white;">${unreadCount}</span>`;
            markAllContainer.innerHTML = `<button onclick="Components.markAllRead('${userEmail}')" style="background: none; border: none; color: var(--color-primary); font-size: 0.8rem; cursor: pointer;">Mark all read</button>`;
        } else {
            markAllContainer.innerHTML = '';
        }
        bellBtn.innerHTML = `🔔 ${badgeHtml}`;

        // Update List
        if (notifications.length === 0) {
            listContainer.innerHTML = `
                <div style="padding: 1.5rem; text-align: center; color: var(--color-text-muted); font-size: 0.9rem;">
                    No notifications
                </div>
            `;
            return;
        }

        listContainer.innerHTML = notifications.map(n => `
            <div onclick="Components.handleNotificationClick('${userEmail}', '${n.id}', '${n.relatedId}')" style="padding: 1rem; border-bottom: 1px solid #f1f5f9; cursor: pointer; display: flex; gap: 1rem; transition: background-color 0.2s; ${n.read ? 'opacity: 0.7;' : 'background-color: #f0fdf4;'}">
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                        <strong style="font-size: 0.9rem; color: var(--color-text-main);">${n.title}</strong>
                        <span style="font-size: 0.75rem; color: var(--color-text-muted);">${UserNotifications.getRelativeTime(n.timestamp)}</span>
                    </div>
                    <p style="margin: 0; font-size: 0.85rem; color: var(--color-text-muted); line-height: 1.4;">${n.message}</p>
                </div>
                ${!n.read ? '<div style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--color-primary); margin-top: 0.25rem;"></div>' : ''}
            </div>
        `).join('');
    }
};

// Sidebar Toggle Logic
window.toggleSidebar = () => {
    document.querySelector('.sidebar').classList.toggle('open');
};
