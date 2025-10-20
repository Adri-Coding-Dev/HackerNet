// Sistema de autenticación
class AuthManager {
    constructor() {
        this.supabase = window.supabaseClient.getClient();
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Señal global para saber cuando se ha comprobado sesión inicialmente
        if (!window.__authReadyResolver) {
            window.authReadyPromise = new Promise((res) => { window.__authReadyResolver = res; });
        }
        if (!this.supabase) {
            // Intentar inicializar y reobtener el cliente
            try { window.supabaseClient.init(); } catch (e) {}
            this.supabase = window.supabaseClient.getClient();
            if (!this.supabase) {
                return; // Esperará a que esté listo; la instancia ya existe y escuchará cambios más tarde
            }
        }

        // Verificar sesión existente
        const { data: { session }, error } = await this.supabase.auth.getSession();
        if (session) {
            this.currentUser = session.user;
            this.onAuthStateChange(true);
        }
        // Resolver promesa de listo tras la primera comprobación de sesión
        try { window.__authReadyResolver && window.__authReadyResolver(); } catch (e) {}

        // Escuchar cambios de autenticación
        this.supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                this.currentUser = session.user;
                this.onAuthStateChange(true);
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                // No redirigir automáticamente aquí para evitar bucles; main.js lo gestiona
                this.onAuthStateChange(false);
            }
        });

        try { window.dispatchEvent(new Event('auth-ready')); } catch (e) {}
    }

    onAuthStateChange(isAuthenticated) {
        // Redirigir según el estado de autenticación
        const currentPage = window.location.pathname.split('/').pop();
        
        if (isAuthenticated) {
            if (currentPage === 'login.html') {
                try { sessionStorage.setItem('justSignedInAt', String(Date.now())); } catch (e) {}
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 300);
            }
        }
    }

    async login(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error en login:', error);
            return { success: false, error: error.message };
        }
    }

    async register(email, password, userData = {}) {
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: userData
                }
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error en registro:', error);
            return { success: false, error: error.message };
        }
    }

    async logout() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error en logout:', error);
            return { success: false, error: error.message };
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }
}

// Inicializar manager de autenticación cuando Supabase esté listo
(function initAuthWhenReady(){
    function create() { if (!window.authManager) { window.authManager = new AuthManager(); } }
    if (window.supabaseClient && window.supabaseClient.getClient()) {
        create();
    } else {
        window.addEventListener('supabase-ready', create, { once: true });
    }
})();