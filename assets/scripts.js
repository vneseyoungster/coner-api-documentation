// Config Loader Utility
const ConfigLoader = {
    cache: {},

    async load(configPath) {
        if (this.cache[configPath]) {
            return this.cache[configPath];
        }

        try {
            const response = await fetch(configPath);
            if (!response.ok) {
                throw new Error(`Failed to load config: ${configPath}`);
            }
            const data = await response.json();
            this.cache[configPath] = data;
            return data;
        } catch (error) {
            console.error(`Error loading config from ${configPath}:`, error);
            return null;
        }
    },

    async loadShared() {
        return await this.load('config/shared-config.json');
    },

    async loadPage(pageName) {
        return await this.load(`config/${pageName}-config.json`);
    },

    async loadChangelog(environment) {
        return await this.load(`config/changelog-${environment}.json`);
    }
};

// Navigation Builder
async function buildNavigation(currentPage) {
    const sharedConfig = await ConfigLoader.loadShared();
    if (!sharedConfig) return;

    const nav = document.querySelector('.nav-content');
    if (!nav) return;

    nav.innerHTML = '';
    sharedConfig.navigation.forEach(item => {
        const link = document.createElement('a');
        link.href = item.path;
        link.textContent = `${item.icon} ${item.title}`;

        // Mark current page as active
        if (item.path === currentPage) {
            link.classList.add('active');
        }

        nav.appendChild(link);
    });
}

// Header Builder
async function buildHeader() {
    const sharedConfig = await ConfigLoader.loadShared();
    if (!sharedConfig) return;

    const headerTitle = document.querySelector('.header h1');
    const headerVersion = document.querySelector('.header .version');

    if (headerTitle) {
        headerTitle.textContent = sharedConfig.project.name;
    }

    if (headerVersion) {
        const env = document.body.dataset.environment || 'development';
        const envConfig = sharedConfig.environments[env];
        headerVersion.innerHTML = `Version ${sharedConfig.project.version} | Base URL: <code>${envConfig.baseUrl}</code>`;
    }
}

// Footer Builder
async function buildFooter() {
    const sharedConfig = await ConfigLoader.loadShared();
    if (!sharedConfig) return;

    const footer = document.querySelector('.footer');
    if (!footer) return;

    footer.innerHTML = `
        <p><strong>${sharedConfig.project.name}</strong> | Version ${sharedConfig.project.version}</p>
        <p>Maintained by: ${sharedConfig.project.maintainer} | Last Updated: ${sharedConfig.project.lastUpdated}</p>
    `;
}

// Copy Code Functionality
function copyCode(button) {
    const codeBlock = button.closest('.code-block');
    const code = codeBlock.querySelector('pre').textContent;

    navigator.clipboard.writeText(code).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.style.backgroundColor = '#10b981';

        setTimeout(() => {
            button.textContent = originalText;
            button.style.backgroundColor = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        button.textContent = 'Failed';
        setTimeout(() => {
            button.textContent = 'Copy';
        }, 2000);
    });
}

// Smooth Scroll for Navigation Links
function initSmoothScroll() {
    document.querySelectorAll('.nav a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Highlight Active Navigation Item on Scroll
function initScrollHighlight() {
    window.addEventListener('scroll', () => {
        const sections = document.querySelectorAll('.section');
        const navLinks = document.querySelectorAll('.nav a[href^="#"]');

        let current = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;

            if (window.pageYOffset >= sectionTop - 150) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');

            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    });
}

// Tab Functionality
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;

            // Remove active class from all tabs and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });

    // Activate first tab by default
    if (tabButtons.length > 0) {
        tabButtons[0].click();
    }
}

// Changelog Renderer
function renderChangelog(data) {
    if (!data || !data.versions) return '';

    let html = '';
    data.versions.forEach(version => {
        html += `
            <div class="changelog-entry">
                <div class="changelog-header">
                    <span class="changelog-version">v${version.version}</span>
                    <span class="changelog-date">${version.date}</span>
                </div>
        `;

        // Added
        if (version.added && version.added.length > 0) {
            html += `
                <div class="changelog-section added">
                    <h4>✨ Added</h4>
                    <ul>
                        ${version.added.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        // Changed
        if (version.changed && version.changed.length > 0) {
            html += `
                <div class="changelog-section changed">
                    <h4>🔄 Changed</h4>
                    <ul>
                        ${version.changed.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        // Deprecated
        if (version.deprecated && version.deprecated.length > 0) {
            html += `
                <div class="changelog-section deprecated">
                    <h4>⚠️ Deprecated</h4>
                    <ul>
                        ${version.deprecated.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        // Removed
        if (version.removed && version.removed.length > 0) {
            html += `
                <div class="changelog-section removed">
                    <h4>🗑️ Removed</h4>
                    <ul>
                        ${version.removed.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        // Fixed
        if (version.fixed && version.fixed.length > 0) {
            html += `
                <div class="changelog-section fixed">
                    <h4>🐛 Fixed</h4>
                    <ul>
                        ${version.fixed.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        // Security
        if (version.security && version.security.length > 0) {
            html += `
                <div class="changelog-section security">
                    <h4>🔒 Security</h4>
                    <ul>
                        ${version.security.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        html += `</div>`;
    });

    return html;
}

// Build Sidebar Navigation from H2 sections
function buildSidebarNav() {
    const sidebarNav = document.querySelector('.sidebar-nav');
    if (!sidebarNav) return;

    // Get all H2 sections from main content
    const sections = document.querySelectorAll('.main-content .section');
    if (sections.length === 0) return;

    // Group sections by category
    const groups = {
        'Endpoints': [],
        'Reference': []
    };

    sections.forEach(section => {
        const heading = section.querySelector('h2');
        if (!heading) return;

        const sectionId = section.id;
        const sectionTitle = heading.textContent;

        // Categorize sections
        if (sectionTitle.includes('Endpoints') || sectionTitle.includes('Check')) {
            groups['Endpoints'].push({ id: sectionId, title: sectionTitle });
        } else {
            groups['Reference'].push({ id: sectionId, title: sectionTitle });
        }
    });

    // Build HTML
    let html = '';
    Object.entries(groups).forEach(([groupName, items]) => {
        if (items.length === 0) return;

        html += `
            <div class="nav-group" data-group="${groupName.toLowerCase()}">
                <div class="nav-group-header" onclick="toggleNavGroup(this)">
                    <span>${groupName}</span>
                    <span class="nav-group-toggle">▼</span>
                </div>
                <ul class="nav-group-items">
                    ${items.map(item => `
                        <li class="nav-item">
                            <a href="#${item.id}">${item.title}</a>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    });

    sidebarNav.innerHTML = html;

    // Set initial max-height for transitions
    document.querySelectorAll('.nav-group-items').forEach(items => {
        items.style.maxHeight = items.scrollHeight + 'px';
    });

    // Initialize smooth scroll for sidebar links
    initSidebarScroll();
}

// Build Table of Contents from current section
function buildTableOfContents() {
    const tocList = document.querySelector('.toc-list');
    if (!tocList) return;

    // Get all H3 and H4 from main content
    const headings = document.querySelectorAll('.main-content h3, .main-content h4');
    if (headings.length === 0) {
        tocList.innerHTML = '<li class="toc-item"><span class="toc-link" style="color: var(--text-secondary); cursor: default;">No headings found</span></li>';
        return;
    }

    let html = '';
    headings.forEach((heading, index) => {
        const headingText = heading.textContent;
        const headingId = heading.id || `heading-${index}`;

        // Add ID if not present
        if (!heading.id) {
            heading.id = headingId;
        }

        const itemClass = heading.tagName === 'H4' ? 'toc-item-h4' : 'toc-item-h3';

        html += `
            <li class="toc-item ${itemClass}">
                <a href="#${headingId}" class="toc-link">${headingText}</a>
            </li>
        `;
    });

    tocList.innerHTML = html;

    // Initialize smooth scroll for TOC links
    initTocScroll();
}

// Toggle navigation group collapse
function toggleNavGroup(header) {
    const group = header.closest('.nav-group');
    const items = group.querySelector('.nav-group-items');

    group.classList.toggle('collapsed');

    // Save state to localStorage
    const groupName = group.dataset.group;
    const isCollapsed = group.classList.contains('collapsed');
    localStorage.setItem(`nav-group-${groupName}`, isCollapsed ? 'collapsed' : 'expanded');
}

// Restore collapsed state from localStorage
function restoreNavState() {
    document.querySelectorAll('.nav-group').forEach(group => {
        const groupName = group.dataset.group;
        const savedState = localStorage.getItem(`nav-group-${groupName}`);

        if (savedState === 'collapsed') {
            group.classList.add('collapsed');
        }
    });
}

// Initialize smooth scroll for sidebar links
function initSidebarScroll() {
    document.querySelectorAll('.sidebar-nav a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                const headerHeight = 170; // header + nav height
                const targetPosition = targetElement.offsetTop - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Initialize smooth scroll for TOC links
function initTocScroll() {
    document.querySelectorAll('.toc-link[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                const headerHeight = 170;
                const targetPosition = targetElement.offsetTop - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Enhanced scroll highlighting for sidebar
function initEnhancedScrollHighlight() {
    window.addEventListener('scroll', () => {
        // Highlight sidebar navigation
        const sections = document.querySelectorAll('.main-content .section');
        const sidebarLinks = document.querySelectorAll('.sidebar-nav a[href^="#"]');

        let currentSection = '';

        // Find current section (H2)
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (window.pageYOffset >= sectionTop - 200) {
                currentSection = section.getAttribute('id');
            }
        });

        // Update sidebar highlights
        sidebarLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + currentSection) {
                link.classList.add('active');
            }
        });
    });
}

// Copy page URL to clipboard
function copyPageUrl() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        const btn = event.target.closest('.copy-page-btn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<span>✓ Copied!</span>';
        btn.style.borderColor = 'var(--success-color)';
        btn.style.color = 'var(--success-color)';

        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.borderColor = '';
            btn.style.color = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy URL:', err);
    });
}

// Update sidebar version display
async function updateSidebarVersion() {
    const sharedConfig = await ConfigLoader.loadShared();
    if (!sharedConfig) return;

    const versionNumber = document.querySelector('.sidebar-version-number');
    if (versionNumber) {
        versionNumber.textContent = `v${sharedConfig.project.version}`;
    }
}

// Initialize Page
async function initPage(currentPage) {
    await buildHeader();
    await buildNavigation(currentPage);
    await buildFooter();

    // Build sidebar if elements exist
    if (document.querySelector('.sidebar-nav')) {
        await updateSidebarVersion();
        buildSidebarNav();
        restoreNavState();
        initEnhancedScrollHighlight();
    } else {
        // Fallback for pages without sidebar
        initSmoothScroll();
        initScrollHighlight();
    }
}

// Export functions for global use
window.ConfigLoader = ConfigLoader;
window.buildNavigation = buildNavigation;
window.buildHeader = buildHeader;
window.buildFooter = buildFooter;
window.copyCode = copyCode;
window.initTabs = initTabs;
window.renderChangelog = renderChangelog;
window.initPage = initPage;
window.buildSidebarNav = buildSidebarNav;
window.buildTableOfContents = buildTableOfContents;
window.toggleNavGroup = toggleNavGroup;
window.copyPageUrl = copyPageUrl;
