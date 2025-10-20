// Notes Manager
class NotesManager {
    constructor() {
        this.currentMachineId = null;
        this.notes = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Note form submission
        const addNoteBtn = document.getElementById('add-note');
        if (addNoteBtn) {
            addNoteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.addNote();
            });
        }

        // Timestamp from video (would need YouTube API integration)
        this.setupVideoTimestamp();
    }

    async loadNotes(machineId) {
        this.currentMachineId = machineId;
        const user = window.authManager.getCurrentUser();
        
        if (!user) {
            console.error('User not authenticated');
            return;
        }

        try {
            const result = await window.dataManager.getMachineNotes(user.id, machineId);
            
            if (result.success) {
                this.notes = result.data || [];
                this.displayNotes();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error loading notes:', error);
            window.uiManager.showNotification('Error cargando notas', 'error');
        }
    }

    displayNotes() {
        const notesList = document.getElementById('notes-list');
        if (!notesList) return;

        if (this.notes.length === 0) {
            notesList.innerHTML = `
                <div class="no-notes">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10,9 9,9 8,9"></polyline>
                    </svg>
                    <p>No hay notas para esta máquina</p>
                    <small>Añade tu primera nota para empezar</small>
                </div>
            `;
            return;
        }

        notesList.innerHTML = this.notes.map(note => this.createNoteElement(note)).join('');
        this.addNoteEventListeners();
    }

    createNoteElement(note) {
        const timestamp = note.timestamp || '00:00';
        return `
            <div class="note-item" data-note-id="${note.id}">
                <div class="note-header">
                    <h4>${this.escapeHtml(note.name)}</h4>
                    <div class="note-actions">
                        <button class="note-action timestamp-btn" data-timestamp="${timestamp}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            ${timestamp}
                        </button>
                        <button class="note-action delete-note" data-note-id="${note.id}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="note-content">${this.escapeHtml(note.content)}</div>
                <div class="note-meta">
                    <span class="note-date">${this.formatDate(note.created_at)}</span>
                </div>
            </div>
        `;
    }

    addNoteEventListeners() {
        // Delete note buttons
        document.querySelectorAll('.delete-note').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const noteId = btn.dataset.noteId;
                await this.deleteNote(noteId);
            });
        });

        // Timestamp buttons
        document.querySelectorAll('.timestamp-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const timestamp = btn.dataset.timestamp;
                this.seekToTimestamp(timestamp);
            });
        });
    }

    async addNote() {
        const nameInput = document.getElementById('note-name');
        const contentInput = document.getElementById('note-content');
        const timestampInput = document.getElementById('note-timestamp');

        if (!nameInput || !contentInput || !this.currentMachineId) {
            window.uiManager.showNotification('Error: Datos incompletos', 'error');
            return;
        }

        const user = window.authManager.getCurrentUser();
        if (!user) {
            window.uiManager.showNotification('Usuario no autenticado', 'error');
            return;
        }

        const noteData = {
            name: nameInput.value.trim(),
            content: contentInput.value.trim(),
            timestamp: this.validateTimestamp(timestampInput.value.trim()) || '00:00'
        };

        if (!noteData.name) {
            window.uiManager.showNotification('El nombre de la nota es requerido', 'error');
            nameInput.focus();
            return;
        }

        if (!noteData.content) {
            window.uiManager.showNotification('El contenido de la nota es requerido', 'error');
            contentInput.focus();
            return;
        }

        try {
            const result = await window.dataManager.addNote(
                user.id, 
                this.currentMachineId, 
                noteData
            );

            if (result.success) {
                window.uiManager.showNotification('Nota añadida correctamente', 'success');
                
                // Clear form
                nameInput.value = '';
                contentInput.value = '';
                timestampInput.value = '';
                
                // Reload notes
                await this.loadNotes(this.currentMachineId);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error adding note:', error);
            window.uiManager.showNotification('Error añadiendo nota', 'error');
        }
    }

    async deleteNote(noteId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
            return;
        }

        try {
            const result = await window.dataManager.deleteNote(noteId);
            
            if (result.success) {
                window.uiManager.showNotification('Nota eliminada', 'success');
                this.notes = this.notes.filter(note => note.id !== noteId);
                this.displayNotes();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error deleting note:', error);
            window.uiManager.showNotification('Error eliminando nota', 'error');
        }
    }

    setupVideoTimestamp() {
        // This would integrate with YouTube API to get current timestamp
        // For now, we'll just provide a way to set the current time manually
        const timestampInput = document.getElementById('note-timestamp');
        const setCurrentTimeBtn = document.createElement('button');
        
        setCurrentTimeBtn.type = 'button';
        setCurrentTimeBtn.textContent = 'Ahora';
        setCurrentTimeBtn.className = 'timestamp-now-btn';
        setCurrentTimeBtn.addEventListener('click', () => {
            // In a real implementation, this would get the current video time
            // For now, we'll use a placeholder
            if (timestampInput) {
                timestampInput.value = this.getCurrentTime();
            }
        });

        if (timestampInput && timestampInput.parentNode) {
            timestampInput.parentNode.appendChild(setCurrentTimeBtn);
        }
    }

    getCurrentTime() {
        // Placeholder - in real implementation, this would get from YouTube player
        const now = new Date();
        return `${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    }

    seekToTimestamp(timestamp) {
        // Placeholder - in real implementation, this would seek YouTube player
        console.log('Seeking to timestamp:', timestamp);
        window.uiManager.showNotification(`Buscando: ${timestamp}`, 'info');
    }

    validateTimestamp(timestamp) {
        // Basic timestamp validation (MM:SS)
        const regex = /^([0-5]?[0-9]):([0-5][0-9])$/;
        return regex.test(timestamp) ? timestamp : null;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Search notes by content
    searchNotes(query) {
        if (!query) return this.notes;
        
        const lowerQuery = query.toLowerCase();
        return this.notes.filter(note => 
            note.name.toLowerCase().includes(lowerQuery) ||
            note.content.toLowerCase().includes(lowerQuery)
        );
    }

    // Export notes for a machine
    exportNotes(machineId) {
        const machineNotes = this.notes.filter(note => note.machine_id === machineId);
        const dataStr = JSON.stringify(machineNotes, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `notes-machine-${machineId}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }
}

// Initialize Notes Manager
window.notesManager = new NotesManager();