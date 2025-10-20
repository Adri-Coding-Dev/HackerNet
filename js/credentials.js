// Configuración de Supabase
const SUPABASE_URL = 'https://awsxwnyyixqdqoknkwkq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3c3h3bnl5aXhxZHFva25rd2txIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NzgxNTAsImV4cCI6MjA3NjM1NDE1MH0.ImozZnTN1ElStczIDzEVu2LLc81A3uYI-Y75g9IrVpA';

// Exportar configuración
window.SUPABASE_CONFIG = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY
};