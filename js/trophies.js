// Trophies Manager
class TrophiesManager {
    constructor() {
        this.trophies = [];
        this.userTrophies = new Set();
        this.init();
    }

    async init() {
        await this.loadTrophies();
        await this.loadUserProgress();
        this.renderTrophies();
        this.setupEventListeners();

        // In case the script ran before DOM is fully ready, try rendering once DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                if (document.getElementById('trophies-container')) this.renderTrophies();
            }, { once: true });
        }
    }

    async loadTrophies() {
        // Define only the six machine-count trophies
        this.trophies = [
            {
                id: 'first_blood',
                name: 'Primera Sangre',
                description: 'Resuelve 1 máquina',
                type: 'machine_count',
                requirement: 1,
                icon: '🏅',
                rarity: 'common'
            },
            {
                id: 'apprentice',
                name: 'Aprendiz',
                description: 'Resuelve 5 máquinas',
                type: 'machine_count',
                requirement: 5,
                icon: '🎓',
                rarity: 'common'
            },
            {
                id: 'journeyman',
                name: 'Viajero',
                description: 'Resuelve 10 máquinas',
                type: 'machine_count',
                requirement: 10,
                icon: '🧭',
                rarity: 'uncommon'
            },
            {
                id: 'pro_hacker',
                name: 'Pro Hacker',
                description: 'Resuelve 50 máquinas',
                type: 'machine_count',
                requirement: 50,
                icon: '⚡',
                rarity: 'epic'
            },
            {
                id: 'elite',
                name: 'Élite',
                description: 'Resuelve 100 máquinas',
                type: 'machine_count',
                requirement: 100,
                icon: '👑',
                rarity: 'legendary'
            },
            {
                id: 'guru',
                name: 'Gurú',
                description: 'Resuelve 200 máquinas',
                type: 'machine_count',
                requirement: 200,
                icon: '🧞',
                rarity: 'mythic'
            },
            {
                id: 'God',
                name: 'God Hacking',
                description: 'Resuelve 500 máquinas',
                type: 'machine_count',
                requirement: 500,
                icon: '👽',
                rarity: 'GOD'
            }
        ];
    }

    async loadUserProgress() {
        // If auth manager isn't ready yet, fallback to defaults
        if (!window.authManager || typeof window.authManager.getCurrentUser !== 'function') {
            this.userStats = { solved: 0 };
            this.calculateUnlockedTrophies();
            // Try to refresh once auth becomes ready
            try {
                window.addEventListener('auth-ready', () => {
                    this.loadUserProgress().then(() => {
                        // If on trophies page, re-render
                        if (document.getElementById('trophies-container')) this.renderTrophies();
                    });
                }, { once: true });
            } catch {}
            return;
        }

        const user = window.authManager.getCurrentUser();
        if (!user) {
            // Default to zero stats so trophies still render
            this.userStats = { solved: 0 };
            this.calculateUnlockedTrophies();
            return;
        }

        try {
            // Load user stats
            const statsResult = await window.dataManager.getUserStats(user.id);
            this.userStats = statsResult.success ? statsResult.data : { solved: 0, wanted: 0, total: 0 };
            this.calculateUnlockedTrophies();

            // In a real implementation, you would load user's specific trophy progress
            // from the database

        } catch (error) {
            console.error('Error loading user progress:', error);
        }
    }

    calculateUnlockedTrophies() {
        if (!this.userStats) return;

        const solvedCount = this.userStats.solved || 0;

        // Calculate which trophies are unlocked based on user stats
        this.trophies.forEach(trophy => {
            let unlocked = false;

            switch (trophy.type) {
                case 'machine_count':
                    unlocked = solvedCount >= trophy.requirement;
                    break;
                case 'difficulty_count':
                    // This would require difficulty-specific counts
                    unlocked = solvedCount >= trophy.requirement.count;
                    break;
                case 'platform_count':
                    // This would require platform-specific counts
                    unlocked = solvedCount >= trophy.requirement.count;
                    break;
                case 'streak':
                case 'daily_streak':
                case 'speedrun':
                    // These require more specific tracking
                    unlocked = false; // Placeholder
                    break;
            }

            if (unlocked) {
                this.userTrophies.add(trophy.id);
            }
        });
    }

    renderTrophies() {
        const container = document.getElementById('trophies-container');
        if (!container) return;

        const achieved = this.trophies.filter(t => this.userTrophies.has(t.id));
        const locked = this.trophies.filter(t => !this.userTrophies.has(t.id));

        container.innerHTML = `
            <div class="trophies-header">
                <div class="trophies-summary">
                    <h2>Logros y Trofeos</h2>
                    <div class="summary-stats">
                        <div class="stat">
                            <span class="number">${achieved.length}</span>
                            <span class="label">Obtenidos</span>
                        </div>
                        <div class="stat">
                            <span class="number">${this.trophies.length}</span>
                            <span class="label">Total</span>
                        </div>
                        <div class="stat">
                            <span class="number">${Math.round((achieved.length / this.trophies.length) * 100)}%</span>
                            <span class="label">Completado</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="trophies-filters">
                <button class="filter-btn active" data-filter="all">Todos</button>
                <button class="filter-btn" data-filter="achieved">Obtenidos</button>
                <button class="filter-btn" data-filter="locked">Por conseguir</button>
                <select id="rarity-filter">
                    <option value="all">Todas las rarezas</option>
                    <option value="common">Común</option>
                    <option value="uncommon">Poco Común</option>
                    <option value="rare">Rara</option>
                    <option value="epic">Épica</option>
                    <option value="legendary">Legendaria</option>
                    <option value="mythic">Mítica</option>
                    <option value="GOD">God</option>
                </select>
            </div>

            <div class="trophies-grid">
                ${this.trophies.map(trophy => this.renderTrophyCard(trophy)).join('')}
            </div>
        `;
    }

    renderTrophyCard(trophy) {
        const isAchieved = this.userTrophies.has(trophy.id);
        const progress = this.calculateTrophyProgress(trophy);
        
        return `
            <div class="trophy-card ${isAchieved ? 'achieved' : 'locked'} rarity-${trophy.rarity}" 
                 data-trophy-id="${trophy.id}" data-rarity="${trophy.rarity}">
                <div class="trophy-icon">
                    ${trophy.icon}
                    ${isAchieved ? '<div class="achieved-badge">✓</div>' : ''}
                </div>
                <div class="trophy-info">
                    <h4>${trophy.name}</h4>
                    <p class="trophy-desc">${trophy.description}</p>
                    <div class="trophy-progress">
                        ${!isAchieved ? `
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progress.percentage}%"></div>
                            </div>
                            <span class="progress-text">${progress.text}</span>
                        ` : `
                            <span class="achieved-text">¡Obtenido!</span>
                        `}
                    </div>
                </div>
                <div class="trophy-rarity ${trophy.rarity}">${this.getRarityName(trophy.rarity)}</div>
            </div>
        `;
    }

    calculateTrophyProgress(trophy) {
        if (this.userTrophies.has(trophy.id)) {
            return { percentage: 100, text: 'Completado' };
        }

        if (!this.userStats) {
            return { percentage: 0, text: 'Progreso no disponible' };
        }

        const solvedCount = this.userStats.solved || 0;
        let current = 0;
        let target = 1;

        switch (trophy.type) {
            case 'machine_count':
                current = solvedCount;
                target = trophy.requirement;
                break;
            case 'difficulty_count':
                current = solvedCount; // Simplified - should be difficulty-specific
                target = trophy.requirement.count;
                break;
            case 'platform_count':
                current = solvedCount; // Simplified - should be platform-specific
                target = trophy.requirement.count;
                break;
            default:
                current = 0;
                target = 1;
        }

        const percentage = Math.min((current / target) * 100, 100);
        const text = `${current}/${target}`;

        return { percentage, text };
    }

    getRarityName(rarity) {
        const names = {
            common: 'Común',
            uncommon: 'Poco Común',
            rare: 'Rara',
            epic: 'Épica',
            legendary: 'Legendaria',
            mythic: 'Mítica',
            god: 'GOD'
        };
        return names[rarity] || rarity;
    }

    setupEventListeners() {
        // Filter buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                this.handleFilterClick(e.target);
            }
        });

        // Rarity filter
        const rarityFilter = document.getElementById('rarity-filter');
        if (rarityFilter) {
            rarityFilter.addEventListener('change', (e) => {
                this.applyFilters();
            });
        }

        // Trophy card clicks
        document.addEventListener('click', (e) => {
            const trophyCard = e.target.closest('.trophy-card');
            if (trophyCard) {
                this.showTrophyDetails(trophyCard.dataset.trophyId);
            }
        });
    }

    handleFilterClick(button) {
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');

        this.applyFilters();
    }

    applyFilters() {
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
        const rarityFilter = document.getElementById('rarity-filter').value;

        document.querySelectorAll('.trophy-card').forEach(card => {
            let shouldShow = true;

            // Apply status filter
            if (activeFilter === 'achieved' && !card.classList.contains('achieved')) {
                shouldShow = false;
            } else if (activeFilter === 'locked' && card.classList.contains('achieved')) {
                shouldShow = false;
            }

            // Apply rarity filter
            if (rarityFilter !== 'all' && card.dataset.rarity !== rarityFilter) {
                shouldShow = false;
            }

            card.style.display = shouldShow ? 'flex' : 'none';
        });
    }

    showTrophyDetails(trophyId) {
        const trophy = this.trophies.find(t => t.id === trophyId);
        if (!trophy) return;

        const isAchieved = this.userTrophies.has(trophyId);
        const progress = this.calculateTrophyProgress(trophy);

        // Create modal or show details in a panel
        const detailsHtml = `
            <div class="trophy-details">
                <div class="trophy-header">
                    <div class="trophy-icon large">${trophy.icon}</div>
                    <div class="trophy-title">
                        <h3>${trophy.name}</h3>
                        <span class="trophy-rarity-badge ${trophy.rarity}">${this.getRarityName(trophy.rarity)}</span>
                    </div>
                </div>
                <div class="trophy-description">
                    <p>${trophy.description}</p>
                </div>
                <div class="trophy-progress-details">
                    <h4>Progreso</h4>
                    ${isAchieved ? `
                        <div class="achievement-message">
                            <span class="achieved-icon">🎉</span>
                            <span>¡Trofeo obtenido!</span>
                        </div>
                    ` : `
                        <div class="progress-display">
                            <div class="progress-bar large">
                                <div class="progress-fill" style="width: ${progress.percentage}%"></div>
                            </div>
                            <span class="progress-text">${progress.text}</span>
                        </div>
                    `}
                </div>
                <div class="trophy-requirements">
                    <h4>Requisitos</h4>
                    <p>${this.getRequirementDescription(trophy)}</p>
                </div>
            </div>
        `;

        // You could show this in a modal or dedicated details panel
        window.uiManager.showNotification(`Detalles: ${trophy.name}`, 'info');
        console.log('Trophy details:', detailsHtml);
    }

    getRequirementDescription(trophy) {
        switch (trophy.type) {
            case 'machine_count':
                return `Resolver ${trophy.requirement} máquina${trophy.requirement > 1 ? 's' : ''}`;
            case 'difficulty_count':
                return `Resolver ${trophy.requirement.count} máquina${trophy.requirement.count > 1 ? 's' : ''} de dificultad ${trophy.requirement.difficulty}`;
            case 'platform_count':
                return `Resolver ${trophy.requirement.count} máquina${trophy.requirement.count > 1 ? 's' : ''} de ${trophy.requirement.platform}`;
            case 'streak':
                return `Resolver ${trophy.requirement.count} máquinas durante un ${trophy.requirement.period}`;
            case 'daily_streak':
                return `Resolver máquinas por ${trophy.requirement} días consecutivos`;
            case 'speedrun':
                return `Completar una máquina en menos de ${trophy.requirement.time} minutos`;
            default:
                return 'Requisitos específicos';
        }
    }

    // Method to check for new trophies when user completes a machine
    async checkForNewTrophies(machineData) {
        const newTrophies = [];

        // Check each trophy condition
        for (const trophy of this.trophies) {
            if (this.userTrophies.has(trophy.id)) continue;

            let achieved = false;

            switch (trophy.type) {
                case 'machine_count':
                    achieved = (this.userStats.solved || 0) >= trophy.requirement;
                    break;
                // Add other trophy type checks here
            }

            if (achieved) {
                this.userTrophies.add(trophy.id);
                newTrophies.push(trophy);
            }
        }

        // Show notifications for new trophies
        newTrophies.forEach(trophy => {
            this.showTrophyUnlockedNotification(trophy);
        });

        return newTrophies;
    }

    showTrophyUnlockedNotification(trophy) {
        const notification = document.createElement('div');
        notification.className = `trophy-unlock-notification rarity-${trophy.rarity}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="trophy-icon">${trophy.icon}</div>
                <div class="notification-text">
                    <h4>¡Trofeo Desbloqueado!</h4>
                    <p>${trophy.name}</p>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize Trophies Manager globally (safe to run on any page)
if (!window.trophiesManager) {
    try { window.trophiesManager = new TrophiesManager(); } catch (e) { /* ignore */ }
}