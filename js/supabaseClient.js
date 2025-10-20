// Cliente de Supabase
let supabase;

function initSupabase() {
    if (window.SUPABASE_CONFIG) {
        if (!window.supabase || !window.supabase.createClient) {
            console.error('Librería de Supabase no cargada');
            return null;
        }
        supabase = window.supabase.createClient(
            window.SUPABASE_CONFIG.url,
            window.SUPABASE_CONFIG.anonKey
        );
        console.log('Supabase inicializado correctamente');
        try { window.dispatchEvent(new Event('supabase-ready')); } catch (e) {}
    } else {
        console.error('Configuración de Supabase no encontrada');
    }
    return supabase;
}

// Inicializar tan pronto como sea posible
(function ensureInit() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initSupabase();
        });
    } else {
        initSupabase();
    }
})();

// Exportar funciones
window.supabaseClient = {
    getClient: () => supabase,
    init: initSupabase
};