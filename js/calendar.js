// Calendar Manager
class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.scheduledMachines = new Map();
        this.dayViewDate = new Date();
        this.init();
    }

    // Render upcoming sessions list in sidebar
    renderUpcomingSessions() {
        const list = document.getElementById('upcoming-sessions');
        if (!list) return;
        const todayKey = this.formatDateKey(new Date());
        const upcoming = [];
        this.scheduledMachines.forEach((items, dateKey) => {
            if (dateKey >= todayKey) {
                items.forEach(it => upcoming.push({ dateKey, item: it }));
            }
        });
        upcoming.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
        if (upcoming.length === 0) {
            list.innerHTML = '<div class="empty-sessions"><p>No hay sesiones programadas</p></div>';
            return;
        }
        list.innerHTML = upcoming.slice(0, 10).map(({ dateKey, item }) => {
            const m = item.machines || {};
            return `
                <div class="session-item">
                    <div class="session-header">
                        <span class="session-date">${this.parseDateKey(dateKey).toLocaleDateString()}</span>
                        <span class="session-status scheduled">Programada</span>
                    </div>
                    <div class="session-machines" style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;">
                        <span>${m.name || 'Desconocida'}</span>
                        <button class="btn-secondary" data-unschedule-id="${item.id}">Quitar</button>
                    </div>
                </div>
            `;
        }).join('');
        // Attach unschedule handlers
        list.querySelectorAll('[data-unschedule-id]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const entryId = btn.getAttribute('data-unschedule-id');
                await this.unscheduleMachineById(entryId);
            });
        });
    }

    async unscheduleMachineById(entryId) {
        const user = window.authManager.getCurrentUser();
        if (!user || !entryId) return;
        try {
            const res = await window.dataManager.deleteScheduledEntry(user.id, entryId);
            if (res.success) {
                // Remove from local map
                this.scheduledMachines.forEach((arr, key) => {
                    const idx = arr.findIndex(it => String(it.id) === String(entryId));
                    if (idx >= 0) {
                        arr.splice(idx, 1);
                        if (arr.length === 0) this.scheduledMachines.delete(key);
                    }
                });
                // Refresh UI
                this.renderMiniCalendar();
                this.renderFullCalendar();
                this.renderDayView();
                this.renderUpcomingSessions();
                this.updateMonthStats();
                window.uiManager.showNotification('Sesión desprogramada', 'success');
            } else {
                window.uiManager.showNotification('No se pudo desprogramar', 'error');
            }
        } catch (e) {
            window.uiManager.showNotification('Error al desprogramar', 'error');
        }
    }

    // Update month stats in sidebar
    updateMonthStats() {
        const monthScheduledEl = document.getElementById('month-scheduled');
        const monthCompletedEl = document.getElementById('month-completed');
        const monthSuccessEl = document.getElementById('month-success');
        if (!monthScheduledEl || !monthCompletedEl || !monthSuccessEl) return;

        const y = this.currentDate.getFullYear();
        const m = this.currentDate.getMonth();
        const startKey = this.formatDateKey(new Date(y, m, 1));
        const endKey = this.formatDateKey(new Date(y, m + 1, 0));
        let scheduledCount = 0;
        this.scheduledMachines.forEach((items, dateKey) => {
            if (dateKey >= startKey && dateKey <= endKey) scheduledCount += items.length;
        });
        const completedCount = 0; // si se implementa estado de completadas, actualizar aquí
        const successPct = scheduledCount > 0 ? Math.round((completedCount / scheduledCount) * 100) : 0;
        monthScheduledEl.textContent = String(scheduledCount);
        monthCompletedEl.textContent = String(completedCount);
        monthSuccessEl.textContent = `${successPct}%`;
    }

    // Helpers to handle dates in local timezone to avoid UTC shifts
    formatDateKey(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    parseDateKey(key) {
        const [y, m, d] = key.split('-').map(n => parseInt(n, 10));
        return new Date(y, (m || 1) - 1, d || 1);
    }

    // Full calendar (interactive month view)
    renderFullCalendar() {
        const container = document.getElementById('full-calendar');
        if (!container) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        let html = `
            <div class="full-cal-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem;">
                <button id="full-prev-month" class="btn-secondary">‹</button>
                <h3 style="margin:0;">${monthNames[month]} ${year}</h3>
                <button id="full-next-month" class="btn-secondary">›</button>
            </div>
            <div class="full-cal-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;">
                ${['Lu','Ma','Mi','Ju','Vi','Sa','Do'].map(d=>`<div style=\"text-align:center;color:var(--text-muted);font-family:'Roboto Mono',monospace;font-size:0.8rem;\">${d}</div>`).join('')}
        `;

        // Adjust JS getDay(): Sunday=0. We will align so Monday is first (Lu)
        const firstWeekday = (firstDay.getDay() + 6) % 7; // 0: Monday
        for (let i = 0; i < firstWeekday; i++) {
            html += '<div class="full-cal-day empty" style="min-height:90px;border:1px solid var(--border-color);background:var(--htb-darker);"></div>';
        }

        const today = new Date(); today.setHours(0,0,0,0);
        const selectedKey = this.selectedDate ? this.formatDateKey(this.selectedDate) : null;
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateKey = this.formatDateKey(date);
            const scheduled = this.scheduledMachines.get(dateKey) || [];
            const isToday = date.getTime() === today.getTime();
            const isSelected = selectedKey === dateKey;
            html += `
                <div class="full-cal-day${isSelected ? ' selected' : ''}${scheduled.length ? ' has-scheduled' : ''}" data-date="${dateKey}" style="min-height:120px;border:1px solid ${isSelected ? 'var(--htb-primary)' : 'var(--border-color)'};background:${isSelected ? 'var(--htb-darker)' : 'var(--htb-card)'};border-radius:6px;padding:6px;display:flex;flex-direction:column;gap:6px;position:relative;">
                    <div style="display:flex;align-items:center;justify-content:space-between;">
                        <span style="color:${isToday ? 'var(--htb-primary)' : 'var(--text-light)'};font-weight:700;font-family:'Roboto Mono',monospace;">${day}</span>
                        ${scheduled.length ? `<span class=\"tag\" style=\"padding:2px 6px;\">${scheduled.length}</span>` : ''}
                    </div>
                    <div class="day-items" style="display:flex;flex-direction:column;gap:4px;">
                        ${scheduled.slice(0,3).map(item => {
                            const m = item.machines || {};
                            return `<button class=\"btn-secondary\" data-view-machine=\"${m.id || ''}\" style=\"justify-content:flex-start;padding:4px;font-size:0.75rem;\">${m.name || 'Desconocida'}</button>`;
                        }).join('')}
                        ${scheduled.length > 3 ? `<div style=\"color:var(--text-muted);font-size:0.8rem;\">+${scheduled.length - 3} más</div>` : ''}
                    </div>
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;

        // Click handlers: selecting day and viewing machine
        container.querySelectorAll('.full-cal-day[data-date]').forEach(cell => {
            cell.addEventListener('click', (e) => {
                const dateKey = cell.getAttribute('data-date');
                if (!dateKey) return;
                // Set day view to this date using local parsing
                const d = this.parseDateKey(dateKey);
                this.dayViewDate = d;
                this.selectedDate = d;
                this.renderDayView();
                // Show a notification with machines scheduled for that date
                this.showScheduledMachines(d);
            });
            cell.querySelectorAll('[data-view-machine]').forEach(btn => {
                btn.addEventListener('click', (evt) => {
                    evt.stopPropagation();
                    const mid = btn.getAttribute('data-view-machine');
                    if (mid) window.uiManager.openMachineModal(mid);
                });
            });
        });

        // Bind month nav buttons
        this.setupEventListeners();
    }

    init() {
        this.setupEventListeners();
        this.loadScheduledMachines();
        this.renderDayView();
        this.renderFullCalendar();
    }

    setupEventListeners() {
        // Schedule machine button
        const scheduleBtn = document.getElementById('schedule-machine');
        if (scheduleBtn) {
            scheduleBtn.addEventListener('click', () => this.scheduleMachine());
        }

        // Day view navigation
        document.getElementById('prev-day')?.addEventListener('click', () => {
            this.dayViewDate.setDate(this.dayViewDate.getDate() - 1);
            this.renderDayView();
        });
        document.getElementById('next-day')?.addEventListener('click', () => {
            this.dayViewDate.setDate(this.dayViewDate.getDate() + 1);
            this.renderDayView();
        });
    }

    async loadScheduledMachines() {
        const user = window.authManager.getCurrentUser();
        if (!user) return;

        try {
            // Load scheduled machines for the current month
            const startDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
            const endDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
            
            const result = await window.dataManager.getScheduledMachines(
                user.id,
                this.formatDateKey(startDate),
                this.formatDateKey(endDate)
            );

            if (result.success) {
                this.scheduledMachines.clear();
                result.data.forEach(item => {
                    const dateKey = (item.date && typeof item.date === 'string' && item.date.length === 10) ? item.date : this.formatDateKey(new Date(item.date || ''));
                    if (!this.scheduledMachines.has(dateKey)) {
                        this.scheduledMachines.set(dateKey, []);
                    }
                    this.scheduledMachines.get(dateKey).push(item);
                });
                
                this.renderMiniCalendar();
                this.renderDayView();
                this.renderFullCalendar();
                this.renderUpcomingSessions();
                this.updateMonthStats();
            }
        } catch (error) {
            console.error('Error loading scheduled machines:', error);
        }
    }

    renderMiniCalendar() {
        const calendarElement = document.getElementById('mini-calendar');
        if (!calendarElement) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];

        let html = `
            <div class="mini-calendar-header">
                <button class="calendar-nav prev-month">‹</button>
                <h4>${monthNames[month]} ${year}</h4>
                <button class="calendar-nav next-month">›</button>
            </div>
            <div class="mini-calendar-grid">
                <div class="calendar-weekdays">
                    <span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sa</span><span>Do</span>
                </div>
                <div class="calendar-days">
        `;

        // Monday-first offset for empty cells
        const firstWeekdayMini = (firstDay.getDay() + 6) % 7; // 0 = Monday
        for (let i = 0; i < firstWeekdayMini; i++) {
            html += '<span class="calendar-day empty"></span>';
        }

        // Add days of the month
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateKey = this.formatDateKey(date);
            const isToday = date.getTime() === today.getTime();
            const isSelected = this.selectedDate && this.selectedDate.toDateString() === date.toDateString();
            const hasScheduled = this.scheduledMachines.has(dateKey);
            
            let dayClass = 'calendar-day';
            if (isToday) dayClass += ' today';
            if (isSelected) dayClass += ' selected';
            if (hasScheduled) dayClass += ' has-scheduled';
            if (date < today) dayClass += ' past-day';

            html += `
                <span class="${dayClass}" data-date="${dateKey}">
                    ${day}
                    ${hasScheduled ? '<span class="scheduled-dot"></span>' : ''}
                </span>
            `;
        }

        html += `
                </div>
            </div>
        `;

        calendarElement.innerHTML = html;
         // ===============================
// NAVEGACIÓN ENTRE MESES
// ===============================
const prevDayBtn = document.getElementById('prev-day');
const nextDayBtn = document.getElementById('next-day');

// Control de mes actual
let currentMonth = new Date();

// Listeners de navegación
if (prevDayBtn) {
    prevDayBtn.addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        renderFullCalendar(currentMonth);
    });
}

if (nextDayBtn) {
    nextDayBtn.addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        renderFullCalendar(currentMonth);
    });
}

        // Add event listeners
        this.addCalendarEventListeners();
    }

    addCalendarEventListeners() {
        // Day selection
        document.querySelectorAll('.calendar-day:not(.empty)').forEach(day => {
            day.addEventListener('click', () => {
                const dateString = day.dataset.date;
                this.selectDate(this.parseDateKey(dateString));
            });
        });

        // Month navigation
        document.querySelector('.prev-month')?.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.loadScheduledMachines();
        });

        document.querySelector('.next-month')?.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.loadScheduledMachines();
        });

        // Full calendar month nav
        document.getElementById('full-prev-month')?.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.loadScheduledMachines();
            this.renderFullCalendar();
        });
        document.getElementById('full-next-month')?.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.loadScheduledMachines();
            this.renderFullCalendar();
        });
    }

    selectDate(date) {
        this.selectedDate = date;
        this.renderMiniCalendar();
        
        // Show scheduled machines for selected date
        this.showScheduledMachines(date);
    }

    showScheduledMachines(date) {
        const dateKey = date.toISOString().split('T')[0];
        const scheduled = this.scheduledMachines.get(dateKey) || [];
        
        // You could display this in a tooltip or separate section
        if (scheduled.length > 0) {
            const machineNames = scheduled.map(item => item.machines?.name).filter(Boolean).join(', ');
            window.uiManager.showNotification(
                `Máquinas programadas para ${date.toLocaleDateString()}: ${machineNames}`,
                'info'
            );
        }
    }

    // Custom day view rendering
    renderDayView() {
        const dateEl = document.getElementById('day-view-date');
        const listEl = document.getElementById('day-machines-list');
        if (!dateEl || !listEl) return;
        const dateKey = this.formatDateKey(this.dayViewDate);
        dateEl.textContent = this.dayViewDate.toLocaleDateString();
        const scheduled = this.scheduledMachines.get(dateKey) || [];
        if (scheduled.length === 0) {
            listEl.innerHTML = '<div class="empty-sessions"><p>No hay máquinas programadas para este día</p></div>';
            return;
        }
        listEl.innerHTML = scheduled.map(item => {
            const m = item.machines || {};
            return `
                <div class="day-machine-item">
                    <div class="day-machine-name">${m.name || 'Desconocida'}</div>
                    <div class="day-machine-meta">
                        <span>${m.difficulty || 'N/A'}</span>
                        <span>${m.os || 'N/A'}</span>
                    </div>
                    <div style="display:flex;gap:0.5rem;">
                        <button class="btn-secondary" data-view-machine="${m.id || ''}">Ver</button>
                        <button class="btn-secondary" data-unschedule-id="${item.id}">Quitar</button>
                    </div>
                </div>
            `;
        }).join('');
        // Attach view handlers
        listEl.querySelectorAll('[data-view-machine]').forEach(btn => {
            btn.addEventListener('click', () => {
                const mid = btn.getAttribute('data-view-machine');
                if (mid) window.uiManager.openMachineModal(mid);
            });
        });
        // Attach unschedule handlers
        listEl.querySelectorAll('[data-unschedule-id]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const entryId = btn.getAttribute('data-unschedule-id');
                await this.unscheduleMachineById(entryId);
            });
        });
    }

    async scheduleMachine() {
        if (!this.selectedDate) {
            window.uiManager.showNotification('Selecciona una fecha primero', 'warning');
            return;
        }

        if (!window.uiManager.currentMachine) {
            window.uiManager.showNotification('No hay máquina seleccionada', 'error');
            return;
        }

        const user = window.authManager.getCurrentUser();
        if (!user) return;

        try {
            const result = await window.dataManager.scheduleMachine(
                user.id,
                window.uiManager.currentMachine.id,
                this.formatDateKey(this.selectedDate)
            );

            if (result.success) {
                window.uiManager.showNotification(
                    `Máquina programada para ${this.selectedDate.toLocaleDateString()}`,
                    'success'
                );
                
                // Reload scheduled machines y auto-seleccionar el día programado
                await this.loadScheduledMachines();
                const scheduledKey = this.formatDateKey(this.selectedDate);
                const d = this.parseDateKey(scheduledKey);
                this.dayViewDate = d;
                this.selectedDate = d;
                this.renderMiniCalendar();
                this.renderFullCalendar();
                this.renderDayView();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error scheduling machine:', error);
            window.uiManager.showNotification('Error programando máquina', 'error');
        }
    }

    // Get scheduled machines for a date range
    async getScheduledMachinesRange(startDate, endDate) {
        const user = window.authManager.getCurrentUser();
        if (!user) return [];

        try {
            const result = await window.dataManager.getScheduledMachines(
                user.id,
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            );

            return result.success ? result.data : [];
        } catch (error) {
            console.error('Error getting scheduled machines:', error);
            return [];
        }
    }

    // Remove machine from schedule
    async unscheduleMachine(machineId, date) {
        const user = window.authManager.getCurrentUser();
        if (!user) return;

        // This would require a new method in dataManager to delete calendar entries
        // For now, we'll just show a message
        window.uiManager.showNotification('Funcionalidad de desprogramar no implementada', 'info');
    }

    // Export schedule to CSV
    exportSchedule() {
        const scheduleData = [];
        
        this.scheduledMachines.forEach((machines, date) => {
            machines.forEach(item => {
                scheduleData.push({
                    date: date,
                    machine: item.machines?.name || 'Unknown',
                    difficulty: item.machines?.difficulty || 'Unknown',
                    os: item.machines?.os || 'Unknown'
                });
            });
        });

        if (scheduleData.length === 0) {
            window.uiManager.showNotification('No hay máquinas programadas para exportar', 'warning');
            return;
        }

        const csvContent = this.convertToCSV(scheduleData);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `hacklearn-schedule-${new Date().toISOString().split('T')[0]}.csv`);
        link.click();
    }

    convertToCSV(data) {
        const headers = ['Fecha', 'Máquina', 'Dificultad', 'Sistema Operativo'];
        const rows = data.map(item => [
            item.date,
            `"${item.machine}"`,
            item.difficulty,
            item.os
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
}
// ===============================
// CALENDARIO FUNCIONAL MENSUAL
// ===============================

// Contenedor del calendario
const calendarContainer = document.getElementById('full-calendar');
const monthLabel = document.createElement('h2');
monthLabel.classList.add('month-label');

// Estado del mes actual
let currentMonth = new Date();

// Función para renderizar el calendario completo
function renderFullCalendar(date) {
    if (!calendarContainer) return;

    // Limpiar contenido anterior
    calendarContainer.innerHTML = '';
    calendarContainer.appendChild(monthLabel);

    // Calcular datos del mes
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayIndex = firstDay.getDay(); // 0 = domingo
    const totalDays = lastDay.getDate();

    // Mostrar mes/año actual
    monthLabel.textContent = `${date.toLocaleString('es-ES', { month: 'long' }).toUpperCase()} ${year}`;

    // Crear cuadrícula
    const grid = document.createElement('div');
    grid.classList.add('calendar-grid');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
    grid.style.gap = '6px';

    // Nombres de los días
    const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    daysOfWeek.forEach(day => {
        const header = document.createElement('div');
        header.textContent = day;
        header.classList.add('calendar-header-cell');
        header.style.fontWeight = '600';
        header.style.textAlign = 'center';
        grid.appendChild(header);
    });

    // Días vacíos antes del inicio del mes
    const blanks = (firstDayIndex === 0 ? 6 : firstDayIndex - 1);
    for (let i = 0; i < blanks; i++) {
        const empty = document.createElement('div');
        empty.classList.add('calendar-empty');
        grid.appendChild(empty);
    }

    // Días del mes
    for (let day = 1; day <= totalDays; day++) {
        const cell = document.createElement('div');
        cell.classList.add('calendar-cell');
        cell.textContent = day;
        cell.style.textAlign = 'center';
        cell.style.padding = '8px 0';
        cell.style.borderRadius = '6px';
        cell.style.cursor = 'pointer';
        cell.style.transition = '0.2s';

        cell.addEventListener('mouseenter', () => cell.style.background = '#f0f0f0');
        cell.addEventListener('mouseleave', () => cell.style.background = '');

        grid.appendChild(cell);
    }

    calendarContainer.appendChild(grid);
}

// Render inicial
renderFullCalendar(currentMonth);

// Botones de navegación
const prevBtn = document.getElementById('prev-day');
const nextBtn = document.getElementById('next-day');

if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        renderFullCalendar(currentMonth);
    });
}

if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        renderFullCalendar(currentMonth);
    });
}


// Initialize Calendar Manager
window.calendarManager = new CalendarManager();