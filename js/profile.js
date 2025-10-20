// Profile Manager
class ProfileManager {
    constructor() {
        this.userStats = null;
        this.userLevel = 'Noob';
        this.userSolvedMachines = [];
        this._overallChart = null;
        this._difficultyChart = null;
        this.init();
    }

    async init() {
        await this.loadUserProfile();
        this.setupEventListeners();
        this.renderProfile();

        // If auth wasn't ready, re-load once it's ready to populate data
        try {
            window.addEventListener('auth-ready', async () => {
                await this.loadUserProfile();
                this.renderProfile();
            }, { once: true });
        } catch {}
    }

    async loadUserProfile() {
        const user = window.authManager?.getCurrentUser?.() || null;
        if (!user) {
            // Fallback defaults so UI can render
            this.userStats = { solved: 0, wanted: 0, total: 0 };
            this.difficultyStats = { Facil: 0, Media: 0, Dificil: 0, Insane: 0 };
            this.userSolvedMachines = [];
            return;
        }

        try {
            // Load user stats
            const statsResult = await window.dataManager.getUserStats(user.id);
            if (statsResult.success) {
                this.userStats = statsResult.data;
                this.calculateUserLevel();
            }

            // Load difficulty stats
            await this.loadDifficultyStats();

            // Load user machines progress
            await this.loadUserMachines();

        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    async loadDifficultyStats() {
        const user = window.authManager.getCurrentUser();
        if (!user) return;
        try {
            const res = await window.dataManager.getSolvedByDifficulty(user.id);
            if (res.success) {
                this.difficultyStats = res.data; // {Facil, Media, Dificil, Insane}
            } else {
                this.difficultyStats = { Facil: 0, Media: 0, Dificil: 0, Insane: 0 };
            }
        } catch {
            this.difficultyStats = { Facil: 0, Media: 0, Dificil: 0, Insane: 0 };
        }
    }

    calculateUserLevel() {
        if (!this.userStats) return;

        const solved = this.userStats.solved || 0;
        
        if (solved >= 200) this.userLevel = 'Omniscient';
        else if (solved >= 100) this.userLevel = 'Guru';
        else if (solved >= 50) this.userLevel = 'Elite Hacker';
        else if (solved >= 25) this.userLevel = 'Pro Hacker';
        else if (solved >= 10) this.userLevel = 'Hacker';
        else this.userLevel = 'Noob';
    }

    async loadUserMachines() {
        const user = window.authManager.getCurrentUser();
        if (!user) return;
        const res = await window.dataManager.getUserSolvedMachines(user.id);
        this.userSolvedMachines = res.success ? res.data : [];
    }

    setupEventListeners() {
        // Profile tab navigation
        const tabButtons = document.querySelectorAll('.profile-tab');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Export data button
        const exportBtn = document.getElementById('export-data');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportUserData());
        }
    }

    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('.profile-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Show corresponding content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Load tab-specific data
        this.loadTabData(tabName);
    }

    async loadTabData(tabName) {
        switch (tabName) {
            case 'progress':
                await this.renderProgressChart();
                this.renderDifficultyStats();
                break;
            case 'machines':
                await this.renderUserMachines();
                break;
            case 'certifications':
                await this.renderCertifications();
                break;
            case 'trophies':
                await this.renderTrophies();
                break;
        }
    }

    renderDifficultyStats() {
        const progressTab = document.getElementById('progress-tab');
        if (!progressTab) return;
        const charts = progressTab.querySelectorAll('.progress-chart');
        const container = charts[1] || null; // second placeholder block
        const stats = this.difficultyStats || { Facil: 0, Media: 0, Dificil: 0, Insane: 0 };
        const labels = ['Fácil','Media','Difícil','Insane'];
        const data = [stats.Facil||0, stats.Media||0, stats.Dificil||0, stats.Insane||0];

        const html = `
            <h3>Estadísticas por dificultad</h3>
            <canvas id="difficultyChart" height="180"></canvas>
        `;
        let target = container;
        if (!target) {
            target = document.createElement('div');
            target.className = 'progress-chart';
            progressTab.appendChild(target);
        }
        target.innerHTML = html;

        try {
            if (this._difficultyChart) {
                this._difficultyChart.destroy();
                this._difficultyChart = null;
            }
            const ctx = target.querySelector('#difficultyChart');
            if (window.Chart && ctx) {
                this._difficultyChart = new window.Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels,
                        datasets: [{
                            label: 'Máquinas resueltas',
                            data,
                            backgroundColor: ['#00d26a55','#2d7cff55','#ff8a0055','#ff3e3e55'],
                            borderColor: ['#00d26a','#2d7cff','#ff8a00','#ff3e3e'],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: { beginAtZero: true, ticks: { precision: 0 } }
                        },
                        plugins: { legend: { display: false } }
                    }
                });
            }
        } catch {}
    }

    renderProfile() {
        this.renderUserHeader();
        this.renderStatsCards();
        this.renderDifficultyStats();
        this.renderProgressChart();
    }

    renderUserHeader() {
        const user = window.authManager.getCurrentUser();
        if (!user) return;

        const headerElement = document.querySelector('.profile-header');
        if (headerElement) {
            headerElement.innerHTML = `
                <div class="user-avatar">
                    <div class="avatar-placeholder">${user.email[0].toUpperCase()}</div>
                </div>
                <div class="user-info">
                    <h1>${user.email}</h1>
                    <div class="user-level ${this.userLevel.toLowerCase().replace(' ', '-')}">
                        <span class="level-badge">${this.userLevel}</span>
                        <span class="level-progress">${this.getLevelProgress()}% hasta siguiente nivel</span>
                    </div>
                </div>
            `;
        }
    }

    renderStatsCards() {
        if (!this.userStats) return;

        const statsElement = document.querySelector('.profile-stats');
        if (statsElement) {
            statsElement.innerHTML = `
                <div class="stat-card">
                    <div class="stat-icon solved">✓</div>
                    <div class="stat-info">
                        <div class="stat-number">${this.userStats.solved || 0}</div>
                        <div class="stat-label">Resueltas</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon wanted">❤</div>
                    <div class="stat-info">
                        <div class="stat-number">${this.userStats.wanted || 0}</div>
                        <div class="stat-label">Deseadas</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon total">Σ</div>
                    <div class="stat-info">
                        <div class="stat-number">${this.userStats.total || 0}</div>
                        <div class="stat-label">Total</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon streak">🔥</div>
                    <div class="stat-info">
                        <div class="stat-number">${this.getCurrentStreak()}</div>
                        <div class="stat-label">Racha Actual</div>
                    </div>
                </div>
            `;
        }
    }

    getLevelProgress() {
        if (!this.userStats) return 0;
        
        const solved = this.userStats.solved || 0;
        let nextLevelThreshold = 10;
        
        switch (this.userLevel) {
            case 'Noob': nextLevelThreshold = 10; break;
            case 'Hacker': nextLevelThreshold = 25; break;
            case 'Pro Hacker': nextLevelThreshold = 50; break;
            case 'Elite Hacker': nextLevelThreshold = 100; break;
            case 'Guru': nextLevelThreshold = 200; break;
            default: return 100;
        }
        
        const progress = (solved / nextLevelThreshold) * 100;
        return Math.min(progress, 100);
    }

    getCurrentStreak() {
        // This would calculate the current streak of consecutive days with solved machines
        // For now, return a placeholder
        return 7;
    }

    async renderProgressChart() {
        const progressTab = document.getElementById('progress-tab');
        if (!progressTab) return;
        const charts = progressTab.querySelectorAll('.progress-chart');
        const container = charts[0] || null; // first placeholder block
        let totalMachines = 0;
        try {
            const res = await window.dataManager.getMachines({}, 1, 1);
            if (res && res.success) totalMachines = res.totalCount || (res.data ? res.data.length : 0) || 0;
        } catch {}

        const solved = this.userStats?.solved || 0;
        const remaining = Math.max(totalMachines - solved, 0);

        const html = `
            <h3>Progreso general</h3>
            <div style="height:220px"><canvas id="overallChart"></canvas></div>
            <div class="progress-text">${solved}/${totalMachines} máquinas resueltas</div>
        `;
        let target = container;
        if (!target) {
            target = document.createElement('div');
            target.className = 'progress-chart';
            progressTab.prepend(target);
        }
        target.innerHTML = html;

        try {
            if (this._overallChart) {
                this._overallChart.destroy();
                this._overallChart = null;
            }
            const ctx = target.querySelector('#overallChart');
            if (window.Chart && ctx) {
                this._overallChart = new window.Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Resueltas', 'Restantes'],
                        datasets: [{
                            data: [solved, remaining],
                            backgroundColor: ['#9fef00','#2a2d3e'],
                            borderColor: ['#1a1b26','#1a1b26'],
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        cutout: '72%',
                        plugins: {
                            legend: { position: 'bottom', labels: { color: '#a5b1cd' } }
                        }
                    }
                });
            }
        } catch {}
    }

    async renderUserMachines() {
        const machinesTab = document.getElementById('machines-tab');
        if (!machinesTab) return;
        const list = this.userSolvedMachines || [];
        if (list.length === 0) {
            machinesTab.innerHTML = `
                <div class="user-machines-grid">
                    <div class="empty-state">
                        <h3>No tienes máquinas resueltas aún</h3>
                        <p>Cuando resuelvas máquinas, aparecerán aquí</p>
                    </div>
                </div>
            `;
            return;
        }
        machinesTab.innerHTML = `
            <div class="user-machines-grid">
                ${list.map(m => `
                    <div class="machine-card" data-machine-id="${m.id}">
                        <div class="card-header">
                            <h3 class="machine-name">${m.name}</h3>
                            <span class="difficulty-badge ${String(m.difficulty||'').toLowerCase()}">${m.difficulty||''}</span>
                        </div>
                        <div class="card-body">
                            <div class="machine-info card-compact">
                                <div class="compact-left">
                                    <div class="info-row"><span class="info-label">OS:</span><span class="info-value">${m.os||'N/A'}</span></div>
                                    ${m.ip ? `<div class="info-row"><span class="info-label">IP:</span><span class="info-value">${m.ip}</span></div>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="card-footer">
                            <div class="action-buttons">
                                <button class="btn-primary view-machine" data-machine-id="${m.id}">Ver</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        machinesTab.querySelectorAll('.view-machine').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-machine-id');
                if (id) window.uiManager.openMachineModal(id);
            });
        });
    }

    async renderCertifications() {
        const certsTab = document.getElementById('certifications-tab');
        if (!certsTab) return;
        const user = window.authManager.getCurrentUser();
        if (!user) return;
        const res = await window.dataManager.getCertificationProgress(user.id);
        const certs = res.success ? res.data : [];
        if (certs.length === 0) {
            certsTab.innerHTML = `
                <div class="certifications-list">
                    <div class="empty-state">
                        <h3>Sin certificaciones</h3>
                        <p>Asocia máquinas con certificaciones para ver tu progreso</p>
                    </div>
                </div>
            `;
            return;
        }
        certsTab.innerHTML = `
            <div class="certifications-list">
                ${certs.map(c => `
                    <div class="certification-item">
                        <h4>${c.name}</h4>
                        <div class="cert-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${c.pct}%"></div>
                            </div>
                            <span>${c.pct}% (${c.solved}/${c.total})</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async renderTrophies() {
        const trophiesTab = document.getElementById('trophies-tab');
        if (!trophiesTab) return;
        const manager = window.trophiesManager;
        if (!manager) {
            trophiesTab.innerHTML = `<div class="empty-state"><p>No hay datos de trofeos</p></div>`;
            return;
        }
        const achieved = (manager.trophies || []).filter(t => manager.userTrophies?.has(t.id));
        if (achieved.length === 0) {
            trophiesTab.innerHTML = `
                <div class="trophies-grid">
                    <div class="empty-state">
                        <h3>Sin trofeos todavía</h3>
                        <p>Desbloquea trofeos resolviendo máquinas</p>
                    </div>
                </div>
            `;
            return;
        }
        trophiesTab.innerHTML = `
            <div class="trophies-grid">
                ${achieved.map(t => `
                    <div class="trophy-card achieved rarity-${t.rarity}">
                        <div class="trophy-icon">${t.icon}</div>
                        <div class="trophy-info">
                            <h4>${t.name}</h4>
                            <p class="trophy-desc">${t.description}</p>
                            <span class="achieved-text">¡Obtenido!</span>
                        </div>
                        <div class="trophy-rarity ${t.rarity}">${manager.getRarityName(t.rarity)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    calculateTrophies() { return []; }

    async exportUserData() {
        const user = window.authManager.getCurrentUser();
        if (!user) return;

        try {
            // Collect user data
            const exportData = {
                user: {
                    email: user.email,
                    level: this.userLevel,
                    stats: this.userStats
                },
                exportDate: new Date().toISOString()
            };

            // Convert to JSON and download
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', `hacklearn-data-${user.email}-${new Date().toISOString().split('T')[0]}.json`);
            linkElement.click();

            window.uiManager.showNotification('Datos exportados correctamente', 'success');
        } catch (error) {
            console.error('Error exporting data:', error);
            window.uiManager.showNotification('Error exportando datos', 'error');
        }
    }

    // Update user preferences
    async updatePreferences(preferences) {
        const user = window.authManager.getCurrentUser();
        if (!user) return;

        // This would update user preferences in the database
        // Implementation depends on your database structure
        console.log('Updating user preferences:', preferences);
    }
}

// Initialize Profile Manager when on profile page
if (window.location.pathname.includes('profile.html')) {
    window.profileManager = new ProfileManager();
}