// Archivo principal - Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Inicializando HackLearn Platform...');

    function tryInit() {
        if (window.authManager && window.supabaseClient && window.supabaseClient.getClient()) {
            initializeApp();
            return true;
        }
        return false;
    }

    // Intento inmediato
    if (tryInit()) return;

    // Esperar a que auth esté listo
    const onAuthReady = () => { tryInit(); };
    window.addEventListener('auth-ready', onAuthReady, { once: true });

    // Fallback: si auth-ready no llega pero supabase sí, reintentar
    const onSupabaseReady = () => { tryInit(); };
    window.addEventListener('supabase-ready', onSupabaseReady, { once: true });

    // Retry escalonado por si eventos se pierden
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        if (tryInit() || attempts >= 10) {
            clearInterval(interval);
            if (attempts >= 10 && !window.supabaseClient?.getClient()) {
                console.error('Supabase no se inicializó correctamente');
            }
        }
    }, 500);
});

async function initializeApp() {
    // Determinar página actual
    const currentPage = window.location.pathname.split('/').pop();

    // Esperar a que auth haya terminado la comprobación inicial de sesión
    if (window.authReadyPromise && typeof window.authReadyPromise.then === 'function') {
        try { await window.authReadyPromise; } catch (e) {}
    }

    // Verificar autenticación y manejar login
    const publicPages = new Set(['trophies.html', 'roadmap.html', 'calendar.html']);
    if (!window.authManager.isAuthenticated()) {
        if (currentPage === 'login.html') {
            initializeLogin();
            return;
        }
        if (!publicPages.has(currentPage)) {
            window.location.href = 'login.html';
            return;
        }
        // Permitir páginas públicas sin autenticación: continuar hacia el switch
    }

    // Inicializar componentes según la página
    switch (currentPage) {
        case 'index.html':
        case '':
            await initializeDashboard();
            break;
        case 'profile.html':
            await initializeProfile();
            break;
        case 'roadmap.html':
            await initializeRoadmap();
            break;
        case 'trophies.html':
            await initializeTrophies();
            break;
        case 'calendar.html':
            await initializeCalendar();
            break;
        case 'login.html':
            // Si está autenticado, redirigir al dashboard
            if (window.authManager.isAuthenticated()) {
                window.location.href = 'index.html';
            } else {
                initializeLogin();
            }
            break;
    }

    // Inicializar componentes globales
    initializeGlobalComponents();
}

async function initializeDashboard() {
    console.log('Inicializando dashboard...');
    
    // Configurar UI
    window.uiManager.setupFilters();
    window.uiManager.setupSearch();
    window.uiManager.setupPagination();
    
    // Cargar máquinas iniciales
    await window.uiManager.loadMachinesWithFilters();
    
    // Actualizar estadísticas del usuario
    await window.uiManager.updateUserStats();
    
    // Configurar modal
    setupModal();
    
    console.log('Dashboard inicializado correctamente');
}

function initializeGlobalComponents() {
    // Configurar logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const result = await window.authManager.logout();
            if (result.success) {
                window.uiManager.showNotification('Sesión cerrada correctamente', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000);
            } else {
                window.uiManager.showNotification('Error cerrando sesión', 'error');
            }
        });
    }

    // Configurar navegación
    setupNavigation();
}

function setupModal() {
    const modal = document.getElementById('machine-modal');
    const closeBtn = document.getElementById('close-modal');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            window.uiManager.hideModal('machine-modal');
        });
    }
    
    // Cerrar modal al hacer click fuera
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                window.uiManager.hideModal('machine-modal');
            }
        });
    }
    
    // Configurar añadir nota
    const addNoteBtn = document.getElementById('add-note');
    if (addNoteBtn) {
        addNoteBtn.addEventListener('click', async () => {
            await addNewNote();
        });
    }

    // Marcar como deseada
    const markWantedBtn = document.getElementById('mark-wanted');
    if (markWantedBtn) {
        markWantedBtn.addEventListener('click', async () => {
            const user = window.authManager.getCurrentUser();
            const machine = window.uiManager.currentMachine;
            if (!user || !machine) return;
            const result = await window.dataManager.updateUserMachineStatus(user.id, machine.id, 'deseada');
            if (result.success) {
                window.uiManager.showNotification('Máquina marcada como deseada', 'success');
                // Sincronizar checkbox en tarjeta
                document.querySelector(`.wanted-checkbox[data-machine-id="${machine.id}"]`)?.closest('label')?.click();
                // Evitar doble toggle si ya estaba marcada
                const cb = document.querySelector(`.wanted-checkbox[data-machine-id="${machine.id}"]`);
                if (cb && !cb.checked) cb.checked = true;
            } else {
                window.uiManager.showNotification('Error al marcar como deseada', 'error');
            }
        });
    }

    // Marcar como resuelta
    const markSolvedBtn = document.getElementById('mark-solved');
    if (markSolvedBtn) {
        markSolvedBtn.addEventListener('click', async () => {
            const user = window.authManager.getCurrentUser();
            const machine = window.uiManager.currentMachine;
            if (!user || !machine) return;
            const confirmed = window.confirm('Vas a marcar esta máquina como RESUELTA. Esta acción NO se puede deshacer. ¿Confirmas?');
            if (!confirmed) return;

            const result = await window.dataManager.updateUserMachineStatus(user.id, machine.id, 'resuelta');
            if (result.success) {
                window.uiManager.showNotification('Máquina marcada como resuelta', 'success');
                const cb = document.querySelector(`.solved-checkbox[data-machine-id="${machine.id}"]`);
                if (cb) {
                    cb.checked = true;
                    cb.disabled = true;
                }
                // Actualizar estadísticas
                await window.uiManager.updateUserStats();
                // Trofeos
                try {
                    if (window.trophiesManager) {
                        const stats = await window.dataManager.getUserStats(user.id);
                        if (stats.success) {
                            window.trophiesManager.userStats = stats.data;
                            await window.trophiesManager.checkForNewTrophies({ machineId: machine.id });
                            if (document.getElementById('trophies-container')) {
                                window.trophiesManager.renderTrophies();
                            }
                        }
                    }
                } catch {}
            } else {
                window.uiManager.showNotification('Error al marcar como resuelta', 'error');
            }
        });
    }

    // Programar en calendario
    const scheduleBtn = document.getElementById('schedule-machine');
    if (scheduleBtn) {
        scheduleBtn.addEventListener('click', async () => {
            const user = window.authManager.getCurrentUser();
            const machine = window.uiManager.currentMachine;
            if (!user || !machine) return;
            // Solicitar fecha al usuario
            const date = prompt('Introduce la fecha (YYYY-MM-DD):', new Date().toISOString().slice(0,10));
            if (!date) return;
            const ok = /^\d{4}-\d{2}-\d{2}$/.test(date);
            if (!ok) {
                window.uiManager.showNotification('Formato de fecha inválido. Usa YYYY-MM-DD.', 'error');
                return;
            }
            const result = await window.dataManager.scheduleMachine(user.id, machine.id, date);
            if (result.success) {
                window.uiManager.showNotification('Máquina programada en el calendario', 'success');
            } else {
                window.uiManager.showNotification('Error al programar la máquina', 'error');
            }
        });
    }
}

async function addNewNote() {
    const nameInput = document.getElementById('note-name');
    const contentInput = document.getElementById('note-content');
    const timestampInput = document.getElementById('note-timestamp');
    
    if (!nameInput || !contentInput || !window.uiManager.currentMachine) return;
    
    const user = window.authManager.getCurrentUser();
    if (!user) return;
    
    const noteData = {
        name: nameInput.value.trim(),
        content: contentInput.value.trim(),
        timestamp: timestampInput.value.trim() || '00:00'
    };
    
    if (!noteData.name || !noteData.content) {
        window.uiManager.showNotification('Nombre y contenido son requeridos', 'error');
        return;
    }
    
    const result = await window.dataManager.addNote(
        user.id, 
        window.uiManager.currentMachine.id, 
        noteData
    );
    
    if (result.success) {
        window.uiManager.showNotification('Nota añadida correctamente', 'success');
        
        // Limpiar formulario
        nameInput.value = '';
        contentInput.value = '';
        timestampInput.value = '';
        
        // Recargar notas
        await window.uiManager.loadMachineNotes(window.uiManager.currentMachine.id);
    } else {
        window.uiManager.showNotification('Error añadiendo nota', 'error');
    }
}

function setupNavigation() {
    // Navegación entre páginas
    const navLinks = document.querySelectorAll('[data-nav]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.nav;
            window.uiManager.navigateTo(page);
        });
    });
}

// Inicializar otras páginas (placeholders por ahora)
async function initializeProfile() {
    console.log('Inicializando perfil...');
    // Implementar en profile.js
}

async function initializeRoadmap() {
    console.log('Inicializando roadmap...');
    // Asegurar que el modal tenga listeners (cerrar, notas, marcar estados, calendario)
    setupModal();
    // Si existe CalendarManager, refrescar calendario mini del modal
    if (window.calendarManager && typeof window.calendarManager.renderMiniCalendar === 'function') {
        window.calendarManager.renderMiniCalendar();
        // Además cargar programadas del mes actual si hay usuario
        try { await window.calendarManager.loadScheduledMachines?.(); } catch (e) {}
    }
}

async function initializeTrophies() {
    console.log('Inicializando trofeos...');
    // Implementar en trophies.js
}

async function initializeCalendar() {
    console.log('Inicializando calendario...');
    // Asegurar recarga de datos cuando auth esté listo
    const reload = async () => {
        try {
            await window.calendarManager.loadScheduledMachines();
            window.calendarManager.renderFullCalendar();
            window.calendarManager.renderDayView();
            window.calendarManager.renderUpcomingSessions?.();
            window.calendarManager.updateMonthStats?.();
        } catch (e) {}
    };
    if (window.authManager?.isAuthenticated?.()) {
        reload();
    } else {
        try { window.addEventListener('auth-ready', reload, { once: true }); } catch (e) {}
    }
}

function initializeLogin() {
    console.log('Inicializando login...');
    // Configurar formulario de login
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const forms = document.querySelectorAll('.form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Manejo de tabs (login / register)
    if (tabButtons && tabButtons.length > 0) {
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Toggle botones
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // Toggle formularios
                forms.forEach(f => f.classList.remove('active'));
                const tab = btn.dataset.tab;
                const targetForm = document.getElementById(`${tab}-form`);
                targetForm?.classList.add('active');
            });
        });
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    const result = await window.authManager.login(email, password);
    
    if (result.success) {
        window.uiManager.showNotification('Login exitoso!', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } else {
        window.uiManager.showNotification(`Error: ${result.error}`, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    if (password !== confirmPassword) {
        window.uiManager.showNotification('Las contraseñas no coinciden', 'error');
        return;
    }
    
    const result = await window.authManager.register(email, password);
    
    if (result.success) {
        window.uiManager.showNotification('Registro exitoso! Revisa tu email para confirmar.', 'success');
        // Cambiar a pestaña de login
        document.querySelector('.tab-btn[data-tab="login"]')?.click();
    } else {
        window.uiManager.showNotification(`Error: ${result.error}`, 'error');
    }
}