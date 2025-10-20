// Gestión de la interfaz de usuario
class UIManager {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 12;
        this.filters = {};
        this.currentMachine = null;
    }

    async initCheckboxStates(machines) {
        const user = window.authManager.getCurrentUser();
        if (!user || !machines || machines.length === 0) return;
        for (const m of machines) {
            try {
                const res = await window.dataManager.getUserMachineStatus(user.id, m.id);
                if (res.success && res.data) {
                    const wanted = document.querySelector(`.wanted-checkbox[data-machine-id="${m.id}"]`);
                    const solved = document.querySelector(`.solved-checkbox[data-machine-id="${m.id}"]`);
                    if (wanted) wanted.checked = res.data.status === 'deseada';
                    if (solved) {
                        solved.checked = res.data.status === 'resuelta';
                        if (res.data.status === 'resuelta') {
                            solved.disabled = true;
                        }
                    }
                }
            } catch (e) {
                // ignore
            }
        }
    }

    // NAVEGACIÓN
    navigateTo(page) {
        window.location.href = page;
    }

    // LOADING STATES
    showLoading(element) {
        element.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Cargando...</p>
            </div>
        `;
    }

    getMachineImage(machine) {
        // Prefer provided image
        if (machine.image) return machine.image;
        // Try YouTube thumbnail if video present
        const yt = this.parseYouTube(machine.video);
        const vid = yt && yt.id;
        if (vid) return `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;
        // Fallback placeholder
        return 'assets/machine-placeholder.svg';
    }

    hideLoading() {
        const loadingElements = document.querySelectorAll('.loading-spinner');
        loadingElements.forEach(el => el.remove());
    }

    // NOTIFICACIONES
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }

    // MÁQUINAS - UI
    displayMachines(machines, containerId = 'machines-grid') {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!machines || machines.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No se encontraron máquinas</h3>
                    <p>Intenta ajustar los filtros o la búsqueda</p>
                </div>
            `;
            return;
        }

        container.innerHTML = machines.map(machine => this.createMachineCard(machine)).join('');
        
        // Añadir event listeners a las tarjetas
        this.addMachineCardListeners();

        // Inicializar estados de checkboxes según progreso del usuario
        this.initCheckboxStates(machines);
    }

    createMachineCard(machine) {
        const difficultyClass = machine.difficulty ? machine.difficulty.toLowerCase() : 'medium';
        const imageUrl = this.getMachineImage(machine);
        
        return `
            <div class="machine-card" data-machine-id="${machine.id}">
                <div class="card-header">
                    <h3 class="machine-name">${machine.name}</h3>
                    <span class="difficulty-badge ${difficultyClass}">${machine.difficulty || 'Media'}</span>
                </div>
                <div class="card-body">
                    <div class="machine-info card-compact">
                        <div class="compact-left">
                            <div class="info-row">
                                <span class="info-label">OS:</span>
                                <span class="info-value">${machine.os || 'N/A'}</span>
                            </div>
                            ${machine.ip ? `
                            <div class="info-row">
                                <span class="info-label">IP:</span>
                                <span class="info-value">${machine.ip}</span>
                            </div>
                            ` : ''}
                        </div>
                        ${imageUrl ? `
                        <div class="compact-thumb">
                            <img src="${imageUrl}" alt="${machine.name}" loading="lazy" />
                        </div>` : ''}
                    </div>
                    ${machine.techniques && machine.techniques.length > 0 ? `
                    <div class="tags-container">
                        ${machine.techniques.slice(0, 3).map(tech => 
                            `<span class="tag">${tech}</span>`
                        ).join('')}
                        ${machine.techniques.length > 3 ? 
                            `<span class="tag-more">+${machine.techniques.length - 3}</span>` : ''
                        }
                    </div>
                    ` : ''}
                </div>
                <div class="card-footer">
                    <div class="checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" class="wanted-checkbox" data-machine-id="${machine.id}">
                            Deseada
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" class="solved-checkbox" data-machine-id="${machine.id}">
                            Resuelta
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    addMachineCardListeners() {
        const machineCards = document.querySelectorAll('.machine-card');
        machineCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // No abrir modal si se hace click en los checkboxes
                if (e.target.type === 'checkbox' || e.target.classList.contains('checkbox-label')) {
                    return;
                }
                
                const machineId = card.dataset.machineId;
                this.openMachineModal(machineId);
            });
        });

        // Checkbox listeners
        document.querySelectorAll('.wanted-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', this.handleWantedChange.bind(this));
        });

        document.querySelectorAll('.solved-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', this.handleSolvedChange.bind(this));
        });
    }

    async handleWantedChange(e) {
        const machineId = e.target.dataset.machineId;
        const isWanted = e.target.checked;
        
        const user = window.authManager.getCurrentUser();
        if (!user) return;

        const status = isWanted ? 'deseada' : 'none';
        const result = await window.dataManager.updateUserMachineStatus(user.id, machineId, status);
        
        if (result.success) {
            this.showNotification(`Máquina ${isWanted ? 'añadida a' : 'eliminada de'} deseadas`, 'success');
        } else {
            e.target.checked = !isWanted; // Revertir cambio
            this.showNotification('Error actualizando estado', 'error');
        }
    }

    async handleSolvedChange(e) {
        const machineId = e.target.dataset.machineId;
        const isSolved = e.target.checked;
        
        const user = window.authManager.getCurrentUser();
        if (!user) return;

        // If trying to uncheck after being solved, block the action (irreversible)
        if (!isSolved) {
            // Prevent unmarking and inform the user
            e.target.checked = true;
            this.showNotification('Una máquina marcada como resuelta no puede deshacerse.', 'error');
            return;
        }

        // Confirm before marking as solved
        const confirmed = window.confirm('Vas a marcar esta máquina como RESUELTA. Esta acción NO se puede deshacer. ¿Confirmas?');
        if (!confirmed) {
            e.target.checked = false;
            return;
        }

        const status = 'resuelta';
        const result = await window.dataManager.updateUserMachineStatus(user.id, machineId, status);
        
        if (result.success) {
            this.showNotification('Máquina marcada como resuelta', 'success');
            // Disable checkbox to prevent future changes
            e.target.disabled = true;
            // Update user stats and then check trophies
            await this.updateUserStats();
            try {
                if (window.trophiesManager) {
                    const stats = await window.dataManager.getUserStats(user.id);
                    if (stats.success) {
                        window.trophiesManager.userStats = stats.data;
                        await window.trophiesManager.checkForNewTrophies({ machineId });
                        // If on trophies page, re-render to reflect changes
                        if (document.getElementById('trophies-container')) {
                            window.trophiesManager.renderTrophies();
                        }
                    }
                }
            } catch {}
        } else {
            e.target.checked = false; // Revertir cambio
            this.showNotification('Error actualizando estado', 'error');
        }
    }

    // MODAL DE MÁQUINA
    async openMachineModal(machineId) {
        let result = await window.dataManager.getMachineById(machineId);
        if (!result.success) {
            // Try to resolve by name if available in roadmap context
            const roadmapName = document.querySelector(`.roadmap-machine[data-machine-id="${machineId}"] h4`)?.textContent?.trim();
            if (roadmapName) {
                result = await window.dataManager.getMachineByName(roadmapName);
            }
        }
        if (!result.success) {
            this.showNotification('Error cargando máquina', 'error');
            return;
        }

        this.currentMachine = result.data;
        this.populateMachineModal(result.data);
        this.showModal('machine-modal');
        
        // Cargar notas
        this.loadMachineNotes(this.currentMachine.id);
    }

    async openMachineModalByName(name) {
        const result = await window.dataManager.getMachineByName(name);
        if (!result.success) {
            this.showNotification('Error cargando máquina', 'error');
            return;
        }
        this.currentMachine = result.data;
        this.populateMachineModal(result.data);
        this.showModal('machine-modal');
        // Notas
        this.loadMachineNotes(this.currentMachine.id);
    }

    populateMachineModal(machine) {
        // Información básica
        document.getElementById('modal-machine-name').textContent = machine.name;
        document.getElementById('modal-difficulty').textContent = machine.difficulty;
        document.getElementById('modal-difficulty').className = `difficulty-badge ${machine.difficulty.toLowerCase()}`;
        document.getElementById('modal-os').textContent = machine.os;
        document.getElementById('modal-ip').textContent = machine.ip || 'N/A';

        // Técnicas
        const techniquesContainer = document.getElementById('modal-techniques');
        techniquesContainer.innerHTML = machine.techniques 
            ? machine.techniques.map(tech => `<span class="tag">${tech}</span>`).join('')
            : '<span class="no-data">No hay técnicas especificadas</span>';

        // Certificaciones
        const certsContainer = document.getElementById('modal-certifications');
        certsContainer.innerHTML = machine.certifications && machine.certifications.length > 0
            ? machine.certifications.map(cert => `<span class="tag certification-tag">${cert}</span>`).join('')
            : '<span class="no-data">No aplica certificaciones</span>';

        // Video
        const videoContainer = document.getElementById('video-container');
        const yt = this.parseYouTube(machine.video);
        if (yt && yt.id) {
            const params = new URLSearchParams({ rel: '0' });
            if (yt.start) params.set('start', String(yt.start));
            videoContainer.innerHTML = `
                <iframe 
                    width="100%" 
                    height="400" 
                    src="https://www.youtube-nocookie.com/embed/${yt.id}?${params.toString()}" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    referrerpolicy="strict-origin-when-cross-origin"
                    loading="lazy"
                    allowfullscreen>
                </iframe>
                <div class="video-fallback-link">
                    <a href="${this.getOriginalVideoUrl(machine.video, yt.id, yt.start)}" target="_blank" rel="noopener noreferrer">Abrir video en YouTube</a>
                </div>
            `;
        } else {
            videoContainer.innerHTML = '<p class="no-video">No hay video de resolución disponible</p>';
        }

        // Inicializar Pomodoro
        if (window.pomodoroManager) {
            window.pomodoroManager.init();
        }
    }

    parseYouTube(val) {
        if (!val) return null;
        // Already an ID
        if (/^[a-zA-Z0-9_-]{6,}$/i.test(val) && !val.includes('http')) return { id: val, start: 0 };
        try {
            const url = new URL(val);
            // start seconds from t or start
            let start = 0;
            const t = url.searchParams.get('t') || '';
            const startParam = url.searchParams.get('start');
            if (startParam) start = parseInt(startParam, 10) || 0;
            else if (t) start = this.parseYouTubeTime(t);

            if (url.hostname.includes('youtu.be')) {
                const id = url.pathname.replace('/', '').trim();
                return id ? { id, start } : null;
            }
            const v = url.searchParams.get('v');
            if (v) return { id: v, start };
            const paths = url.pathname.split('/');
            const embedIdx = paths.indexOf('embed');
            if (embedIdx >= 0 && paths[embedIdx+1]) return { id: paths[embedIdx+1], start };
        } catch (e) {
            // Not a valid URL
        }
        return null;
    }

    parseYouTubeTime(tVal) {
        // Supports formats like '11s', '1m10s', '90', '90s'
        if (!tVal) return 0;
        if (/^\d+$/.test(String(tVal))) return parseInt(tVal, 10) || 0;
        let seconds = 0;
        const re = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i;
        const m = String(tVal).match(re);
        if (!m) return 0;
        const h = parseInt(m[1] || '0', 10);
        const min = parseInt(m[2] || '0', 10);
        const s = parseInt(m[3] || '0', 10);
        seconds = h * 3600 + min * 60 + s;
        if (seconds === 0 && /s$/i.test(tVal)) {
            // e.g., '11s' matched above; already handled
        }
        return seconds;
    }

    getOriginalVideoUrl(original, id, start) {
        try {
            if (original && original.includes('http')) return original;
        } catch {}
        const url = new URL('https://www.youtube.com/watch');
        url.searchParams.set('v', id);
        if (start) url.searchParams.set('t', `${start}s`);
        return url.toString();
    }

    async loadMachineNotes(machineId) {
        const user = window.authManager.getCurrentUser();
        if (!user) return;

        const result = await window.dataManager.getMachineNotes(user.id, machineId);
        const notesList = document.getElementById('notes-list');
        
        if (result.success && result.data) {
            notesList.innerHTML = result.data.map(note => `
                <div class="note-item" data-note-id="${note.id}">
                    <div class="note-header">
                        <h4>${note.name}</h4>
                        <button class="delete-note" data-note-id="${note.id}">&times;</button>
                    </div>
                    <div class="note-content">${note.content}</div>
                    <div class="note-timestamp">Timestamp: ${note.timestamp || 'N/A'}</div>
                </div>
            `).join('');

            // Añadir event listeners para eliminar notas
            document.querySelectorAll('.delete-note').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const noteId = btn.dataset.noteId;
                    await this.deleteNote(noteId);
                });
            });
        } else {
            notesList.innerHTML = '<p class="no-notes">No hay notas para esta máquina</p>';
        }
    }

    async deleteNote(noteId) {
        const result = await window.dataManager.deleteNote(noteId);
        if (result.success) {
            this.showNotification('Nota eliminada', 'success');
            document.querySelector(`.note-item[data-note-id="${noteId}"]`)?.remove();
        } else {
            this.showNotification('Error eliminando nota', 'error');
        }
    }

    // MODAL CONTROLS
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    // FILTROS
    setupFilters() {
        const filterToggle = document.getElementById('filter-toggle');
        const filtersPanel = document.getElementById('filters-panel');
        const clearFilters = document.getElementById('clear-filters');

        if (filterToggle && filtersPanel) {
            filterToggle.addEventListener('click', () => {
                filtersPanel.classList.toggle('hidden');
            });
        }

        if (clearFilters) {
            clearFilters.addEventListener('click', this.clearFilters.bind(this));
        }

        // Filter change listeners
        ['difficulty-filter', 'os-filter', 'techniques-filter', 'tags-filter'].forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', this.handleFilterChange.bind(this));
            }
        });
    }

    handleFilterChange() {
        this.filters = {
            difficulty: document.getElementById('difficulty-filter')?.value || '',
            os: document.getElementById('os-filter')?.value || '',
            techniques: document.getElementById('techniques-filter')?.value || '',
            tags: document.getElementById('tags-filter')?.value || '',
            search: document.getElementById('search-input')?.value || ''
        };

        this.currentPage = 1;
        this.loadMachinesWithFilters();
    }

    clearFilters() {
        // Reset filter inputs
        ['difficulty-filter', 'os-filter', 'techniques-filter', 'tags-filter', 'search-input'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });

        this.filters = {};
        this.currentPage = 1;
        this.loadMachinesWithFilters();
        
        // Ocultar panel de filtros
        const filtersPanel = document.getElementById('filters-panel');
        if (filtersPanel) filtersPanel.classList.add('hidden');
    }

    // BÚSQUEDA
    setupSearch() {
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');

        if (searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', this.performSearch.bind(this));
        }
    }

    performSearch() {
        const searchTerm = document.getElementById('search-input')?.value || '';
        this.filters.search = searchTerm;
        this.currentPage = 1;
        this.loadMachinesWithFilters();
    }

    // PAGINACIÓN
    setupPagination() {
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.changePage(-1));
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.changePage(1));
        }
    }

    updatePagination(totalCount) {
        const totalPages = Math.ceil(totalCount / this.pageSize);
        const pageInfo = document.getElementById('page-info');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        if (pageInfo) {
            pageInfo.textContent = `Página ${this.currentPage} de ${totalPages}`;
        }

        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= totalPages;
        }
    }

    async changePage(direction) {
        this.currentPage += direction;
        await this.loadMachinesWithFilters();
    }

    // CARGA DE MÁQUINAS
    async loadMachinesWithFilters() {
        const grid = document.getElementById('machines-grid');
        if (!grid) return;

        this.showLoading(grid);

        const result = await window.dataManager.getMachines(this.filters, this.currentPage, this.pageSize);
        this.hideLoading();

        if (result.success) {
            this.displayMachines(result.data);
            this.updatePagination(result.totalCount);
            this.updateStats(result.data);
        } else {
            this.showNotification('Error cargando máquinas', 'error');
        }
    }

    updateStats(machines) {
        // Actualizar estadísticas en el dashboard
        const totalElement = document.getElementById('total-machines');
        const solvedElement = document.getElementById('solved-machines');
        const wantedElement = document.getElementById('wanted-machines');

        if (totalElement) totalElement.textContent = machines.length;
        // Estos valores se deberían cargar desde las estadísticas del usuario
    }

    async updateUserStats() {
        const user = window.authManager.getCurrentUser();
        if (!user) return;

        const result = await window.dataManager.getUserStats(user.id);
        if (result.success) {
            const solvedElement = document.getElementById('solved-machines');
            const wantedElement = document.getElementById('wanted-machines');

            if (solvedElement) solvedElement.textContent = result.data.solved;
            if (wantedElement) wantedElement.textContent = result.data.wanted;
        }
    }
}

// Inicializar UI Manager
window.uiManager = new UIManager();