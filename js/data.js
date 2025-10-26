// Gestión de datos con Supabase
const DEMO_MACHINES = [
  {
    id: 1,
    name: 'Injection',
    difficulty: 'Muy Fácil',
    ip: '10.88.0.2',
    os: 'Linux',
    techniques: ['SSH','SQLi','DockerLabs'],
    certifications: ['OSCP'],
    tags: ['Beginner','SSH'],
    video: 'NmDQvmCgkv8',
    download_ova: '',
    download_docker: 'https://mega.nz/file/rZlAERjY#152uP-zS7pTC0hbPaZB7aO6_puij633u4pW-jpMuctk'
  },
  {
    id: 2,
    name: 'ICA_1',
    difficulty: 'Fácil',
    ip: '192.168.1.152',
    os: 'Linux',
    techniques: ['MYSQL','Hydra', 'VulnHub'],
    certifications: ['OSCP'],
    tags: ['Beginner','SSH'],
    video: '',
    download_ova: '',
    download_docker: ''
  }
];

// Expose for other modules that need name->id mapping
try { window.DEMO_MACHINES = DEMO_MACHINES; } catch (e) {}
class DataManager {
    constructor() {
        this.supabase = window.supabaseClient.getClient();
    }

    async getMachineByName(name) {
        try {
            const client = await this.ensureClient();
            if (!client) throw new Error('Supabase client no disponible');
            const { data, error } = await client
                .from('machines')
                .select('*')
                .ilike('name', name)
                .limit(1);
            if (error) throw error;
            if (data && data.length > 0) return { success: true, data: data[0] };
            throw new Error('No machine found by name');
        } catch (error) {
            // Fallback demo/local: case-insensitive contains
            try {
                const n = (name || '').toLowerCase();
                const found = (window.DEMO_MACHINES || DEMO_MACHINES).find(m => (m.name || '').toLowerCase().includes(n));
                if (found) return { success: true, data: found };
            } catch {}
            return { success: false, error: error.message };
        }
    }

    // STATS BY DIFFICULTY
    async getSolvedByDifficulty(userId) {
        try {
            const client = await this.ensureClient();
            if (!client) throw new Error('Supabase client no disponible');
            // First get solved machine ids
            const { data: solved, error } = await client
                .from('user_machines')
                .select('machine_id')
                .eq('user_id', userId)
                .eq('status', 'resuelta');
            if (error) throw error;
            const ids = (solved || []).map(r => r.machine_id);
            if (ids.length === 0) return { success: true, data: { Facil: 0, Media: 0, Dificil: 0, Insane: 0 } };
            // Fetch machines for those ids
            const { data: machines, error: mErr } = await client
                .from('machines')
                .select('id,difficulty')
                .in('id', ids);
            if (mErr) throw mErr;
            const counts = { Facil: 0, Media: 0, Dificil: 0, Insane: 0 };
            (machines || []).forEach(m => {
                const d = (m.difficulty || '').toLowerCase();
                if (d.includes('fácil') || d.includes('facil')) counts.Facil++;
                else if (d.includes('media')) counts.Media++;
                else if (d.includes('difícil') || d.includes('dificil')) counts.Dificil++;
                else if (d.includes('insane')) counts.Insane++;
            });
            return { success: true, data: counts };
        } catch (error) {
            console.error('Error obteniendo estadísticas por dificultad:', error);
            // Fallback localStorage using DEMO_MACHINES
            try {
                const key = `user_machines:${userId}`;
                const map = JSON.parse(localStorage.getItem(key) || '{}');
                const counts = { Facil: 0, Media: 0, Dificil: 0, Insane: 0 };
                const solvedIds = Object.entries(map)
                    .filter(([, status]) => status === 'resuelta')
                    .map(([mid]) => Number(mid));
                const all = (window.DEMO_MACHINES || DEMO_MACHINES);
                all.forEach(m => {
                    if (solvedIds.includes(m.id)) {
                        const d = (m.difficulty || '').toLowerCase();
                        if (d.includes('fácil') || d.includes('facil')) counts.Facil++;
                        else if (d.includes('media')) counts.Media++;
                        else if (d.includes('difícil') || d.includes('dificil')) counts.Dificil++;
                        else if (d.includes('insane')) counts.Insane++;
                    }
                });
                return { success: true, data: counts };
            } catch (e) {
                return { success: false, error: error.message };
            }
        }
    }

    async ensureClient() {
        if (this.supabase) return this.supabase;
        try { window.supabaseClient.init?.(); } catch (e) {}
        this.supabase = window.supabaseClient.getClient();
        if (this.supabase) return this.supabase;
        // Esperar evento si aún no está listo
        const client = await new Promise((resolve) => {
            const handler = () => {
                try {
                    const c = window.supabaseClient.getClient();
                    if (c) resolve(c);
                    else resolve(null);
                } catch { resolve(null); }
            };
            window.addEventListener('supabase-ready', () => {
                handler();
            }, { once: true });
            // Fallback timeout
            setTimeout(handler, 800);
        });
        this.supabase = client;
        return this.supabase;
    }

    // MÁQUINAS
    async getMachines(filters = {}, page = 1, pageSize = 12) {
        try {
            const client = await this.ensureClient();
            if (!client) throw new Error('Supabase client no disponible');
            let query = client
                .from('machines')
                .select('*', { count: 'exact' });

            // Aplicar filtros
            if (filters.difficulty) {
                query = query.eq('difficulty', filters.difficulty);
            }
            if (filters.os) {
                query = query.eq('os', filters.os);
            }
            if (filters.techniques) {
                query = query.contains('techniques', [filters.techniques]);
            }
            if (filters.tags) {
                query = query.contains('tags', [filters.tags]);
            }
            if (filters.search) {
                query = query.ilike('name', `%${filters.search}%`);
            }

            // Paginación
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;
            if (!data || data.length === 0) {
                const demo = DEMO_MACHINES;
                console.warn('No hay máquinas en la BD. Mostrando datos de demostración. Ejecuta database_setup.sql para poblarla.');
                return { success: true, data: demo, totalCount: demo.length };
            }
            return { success: true, data, totalCount: count };
        } catch (error) {
            console.error('Error obteniendo máquinas:', error);
            // Fallback si la tabla no existe o hay error de PostgREST
            const msg = (error && (error.message || error.code || '')) + '';
            const looksLikeMissingTable = msg.includes('42P01') || msg.toLowerCase().includes('relation') || msg.toLowerCase().includes('table');
            if (looksLikeMissingTable) {
                const demo = DEMO_MACHINES;
                console.warn('Usando datos de demostración porque la tabla machines no existe en la base de datos. Ejecuta database_setup.sql en tu proyecto de Supabase.');
                return { success: true, data: demo, totalCount: demo.length };
            }
            return { success: false, error: error.message };
        }
    }

    async getMachineById(id) {
        try {
            const client = await this.ensureClient();
            if (!client) throw new Error('Supabase client no disponible');
            const { data, error } = await client
                .from('machines')
                .select('*')
                .eq('id', Number(id))
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error obteniendo máquina:', error);
            // Fallback a demo por id
            const demo = DEMO_MACHINES.find(m => m.id === Number(id));
            if (demo) {
                return { success: true, data: demo };
            }
            return { success: false, error: error.message };
        }
    }

    // USER_MACHINES (progreso del usuario)
    async getUserMachineStatus(userId, machineId) {
        try {
            const client = await this.ensureClient();
            if (!client) throw new Error('Supabase client no disponible');
            const { data, error } = await client
                .from('user_machines')
                .select('*')
                .eq('user_id', userId)
                .eq('machine_id', Number(machineId))
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no results
            return { success: true, data: data || null };
        } catch (error) {
            console.error('Error obteniendo estado de máquina:', error);
            // Fallback localStorage
            try {
                const key = `user_machines:${userId}`;
                const map = JSON.parse(localStorage.getItem(key) || '{}');
                const status = map[String(machineId)] || null;
                return { success: true, data: status ? { status, user_id: userId, machine_id: Number(machineId) } : null };
            } catch (e) {
                return { success: false, error: error.message };
            }
        }
    }

    async updateUserMachineStatus(userId, machineId, status) {
        try {
            const existing = await this.getUserMachineStatus(userId, machineId);
            
            if (existing.data) {
                // Actualizar existente
                const client = await this.ensureClient();
                if (!client) throw new Error('Supabase client no disponible');
                const { data, error } = await client
                    .from('user_machines')
                    .update({
                        status: status,
                        date_resolved: status === 'resuelta' ? new Date().toISOString() : null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.data.id);

                if (error) throw error;
                return { success: true, data };
            } else {
                // Crear nuevo
                const client = await this.ensureClient();
                if (!client) throw new Error('Supabase client no disponible');
                const { data, error } = await client
                    .from('user_machines')
                    .insert({
                        user_id: userId,
                        machine_id: Number(machineId),
                        status: status,
                        date_added: new Date().toISOString(),
                        date_resolved: status === 'resuelta' ? new Date().toISOString() : null
                    });

                if (error) throw error;
                return { success: true, data };
            }
        } catch (error) {
            console.error('Error actualizando estado de máquina:', error);
            // Fallback localStorage
            try {
                const key = `user_machines:${userId}`;
                const map = JSON.parse(localStorage.getItem(key) || '{}');
                map[String(machineId)] = status;
                localStorage.setItem(key, JSON.stringify(map));
                return { success: true, data: { user_id: userId, machine_id: Number(machineId), status } };
            } catch (e) {
                return { success: false, error: error.message };
            }
        }
    }

    // NOTAS
    async getMachineNotes(userId, machineId) {
        try {
            const client = await this.ensureClient();
            if (!client) throw new Error('Supabase client no disponible');
            const { data, error } = await client
                .from('notes')
                .select('*')
                .eq('user_id', userId)
                .eq('machine_id', Number(machineId))
                .order('timestamp', { ascending: true });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error obteniendo notas:', error);
            // Fallback localStorage
            try {
                const key = `notes:${userId}:${Number(machineId)}`;
                const list = JSON.parse(localStorage.getItem(key) || '[]');
                return { success: true, data: list };
            } catch (e) {
                return { success: false, error: error.message };
            }
        }
    }

    async addNote(userId, machineId, noteData) {
        try {
            const client = await this.ensureClient();
            if (!client) throw new Error('Supabase client no disponible');
            const { data, error } = await client
                .from('notes')
                .insert({
                    user_id: userId,
                    machine_id: Number(machineId),
                    name: noteData.name,
                    content: noteData.content,
                    timestamp: noteData.timestamp,
                    created_at: new Date().toISOString()
                });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error añadiendo nota:', error);
            // Fallback localStorage
            try {
                const key = `notes:${userId}:${Number(machineId)}`;
                const list = JSON.parse(localStorage.getItem(key) || '[]');
                const id = (Date.now() + Math.random()).toString(36);
                const toSave = { id, name: noteData.name, content: noteData.content, timestamp: noteData.timestamp };
                list.push(toSave);
                localStorage.setItem(key, JSON.stringify(list));
                return { success: true, data: [toSave] };
            } catch (e) {
                return { success: false, error: error.message };
            }
        }
    }

    async deleteNote(noteId) {
        try {
            const client = await this.ensureClient();
            if (!client) throw new Error('Supabase client no disponible');
            const { error } = await client
                .from('notes')
                .delete()
                .eq('id', noteId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error eliminando nota:', error);
            // Fallback localStorage: need userId/machineId context, remove wherever it exists
            try {
                // Scan all notes:* keys and remove matching id
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith('notes:')) {
                        const list = JSON.parse(localStorage.getItem(k) || '[]');
                        const idx = list.findIndex(n => n.id === noteId);
                        if (idx >= 0) {
                            list.splice(idx, 1);
                            localStorage.setItem(k, JSON.stringify(list));
                            break;
                        }
                    }
                }
                return { success: true };
            } catch (e) {
                return { success: false, error: error.message };
            }
        }
    }

    // CALENDARIO
    async scheduleMachine(userId, machineId, date) {
        try {
            const client = await this.ensureClient();
            if (!client) throw new Error('Supabase client no disponible');
            const { data, error } = await client
                .from('calendar')
                .insert({
                    user_id: userId,
                    machine_id: Number(machineId),
                    date: date,
                    created_at: new Date().toISOString()
                });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error programando máquina:', error);
            // Fallback localStorage
            try {
                const key = `calendar:${userId}`;
                const list = JSON.parse(localStorage.getItem(key) || '[]');
                const entry = { id: (Date.now()+Math.random()).toString(36), user_id: userId, machine_id: Number(machineId), date };
                list.push(entry);
                localStorage.setItem(key, JSON.stringify(list));
                return { success: true, data: [entry] };
            } catch (e) {
                return { success: false, error: error.message };
            }
        }
    }

    async getScheduledMachines(userId, startDate, endDate) {
        try {
            const client = await this.ensureClient();
            if (!client) throw new Error('Supabase client no disponible');
            const { data, error } = await client
                .from('calendar')
                .select(`
                    *,
                    machines (*)
                `)
                .eq('user_id', userId)
                .gte('date', startDate)
                .lte('date', endDate);

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error obteniendo máquinas programadas:', error);
            // Fallback localStorage
            try {
                const key = `calendar:${userId}`;
                const list = JSON.parse(localStorage.getItem(key) || '[]');
                const filtered = list.filter(e => e.date >= startDate && e.date <= endDate)
                    .map(e => ({
                        ...e,
                        machines: (window.DEMO_MACHINES || DEMO_MACHINES).find(m => m.id === Number(e.machine_id))
                    }));
                return { success: true, data: filtered };
            } catch (e) {
                return { success: false, error: error.message };
            }
        }
    }

    // ESTADÍSTICAS
    async getUserStats(userId) {
        try {
            // Máquinas resueltas
            const client = await this.ensureClient();
            if (!client) throw new Error('Supabase client no disponible');
            const { data: solved, error: solvedError } = await client
                .from('user_machines')
                .select('machine_id')
                .eq('user_id', userId)
                .eq('status', 'resuelta');

            if (solvedError) throw solvedError;

            // Máquinas deseadas
            const { data: wanted, error: wantedError } = await client
                .from('user_machines')
                .select('machine_id')
                .eq('user_id', userId)
                .eq('status', 'deseada');

            if (wantedError) throw wantedError;

            return {
                success: true,
                data: {
                    solved: solved.length,
                    wanted: wanted.length,
                    total: solved.length + wanted.length
                }
            };
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            // Fallback localStorage
            try {
                const key = `user_machines:${userId}`;
                const map = JSON.parse(localStorage.getItem(key) || '{}');
                const statuses = Object.values(map);
                const solved = statuses.filter(s => s === 'resuelta').length;
                const wanted = statuses.filter(s => s === 'deseada').length;
                return {
                    success: true,
                    data: { solved, wanted, total: solved + wanted }
                };
            } catch (e) {
                return { success: false, error: error.message };
            }
        }
    }

    // LISTA DE MÁQUINAS RESUELTAS DEL USUARIO
    async getUserSolvedMachines(userId) {
        try {
            const client = await this.ensureClient();
            if (!client) throw new Error('Supabase client no disponible');
            // Obtener IDs de máquinas resueltas
            const { data: solvedRows, error } = await client
                .from('user_machines')
                .select('machine_id')
                .eq('user_id', userId)
                .eq('status', 'resuelta');
            if (error) throw error;
            const ids = (solvedRows || []).map(r => r.machine_id);
            if (ids.length === 0) return { success: true, data: [] };
            // Obtener máquinas por IDs
            const { data: machines, error: mErr } = await client
                .from('machines')
                .select('*')
                .in('id', ids);
            if (mErr) throw mErr;
            return { success: true, data: machines || [] };
        } catch (error) {
            console.error('Error obteniendo máquinas resueltas del usuario:', error);
            // Fallback localStorage
            try {
                const key = `user_machines:${userId}`;
                const map = JSON.parse(localStorage.getItem(key) || '{}');
                const solvedIds = Object.entries(map)
                    .filter(([, status]) => status === 'resuelta')
                    .map(([mid]) => Number(mid));
                const all = (window.DEMO_MACHINES || DEMO_MACHINES);
                const list = all.filter(m => solvedIds.includes(m.id));
                return { success: true, data: list };
            } catch (e) {
                return { success: false, error: error.message };
            }
        }
    }

    // PROGRESO POR CERTIFICACIONES
    async getCertificationProgress(userId) {
        try {
            const client = await this.ensureClient();
            if (!client) throw new Error('Supabase client no disponible');
            // Obtener todas las máquinas (solo campos necesarios)
            const { data: allMachines, error: allErr } = await client
                .from('machines')
                .select('id,certifications');
            if (allErr) throw allErr;
            // IDs resueltos
            const { data: solvedRows, error: sErr } = await client
                .from('user_machines')
                .select('machine_id')
                .eq('user_id', userId)
                .eq('status', 'resuelta');
            if (sErr) throw sErr;
            const solvedIds = new Set((solvedRows || []).map(r => r.machine_id));

            const totals = new Map();
            const solved = new Map();
            (allMachines || []).forEach(m => {
                const certs = Array.isArray(m.certifications) ? m.certifications : [];
                certs.forEach(c => {
                    totals.set(c, (totals.get(c) || 0) + 1);
                    if (solvedIds.has(m.id)) solved.set(c, (solved.get(c) || 0) + 1);
                });
            });

            const result = Array.from(totals.entries()).map(([name, total]) => {
                const s = solved.get(name) || 0;
                const pct = total > 0 ? Math.round((s / total) * 100) : 0;
                return { name, total, solved: s, pct };
            });
            return { success: true, data: result };
        } catch (error) {
            console.error('Error obteniendo progreso de certificaciones:', error);
            // Fallback localStorage + DEMO_MACHINES
            try {
                const key = `user_machines:${userId}`;
                const map = JSON.parse(localStorage.getItem(key) || '{}');
                const solvedIds = new Set(Object.entries(map)
                    .filter(([, status]) => status === 'resuelta')
                    .map(([mid]) => Number(mid)));
                const all = (window.DEMO_MACHINES || DEMO_MACHINES);
                const totals = new Map();
                const solved = new Map();
                all.forEach(m => {
                    const certs = Array.isArray(m.certifications) ? m.certifications : [];
                    certs.forEach(c => {
                        totals.set(c, (totals.get(c) || 0) + 1);
                        if (solvedIds.has(m.id)) solved.set(c, (solved.get(c) || 0) + 1);
                    });
                });
                const result = Array.from(totals.entries()).map(([name, total]) => {
                    const s = solved.get(name) || 0;
                    const pct = total > 0 ? Math.round((s / total) * 100) : 0;
                    return { name, total, solved: s, pct };
                });
                return { success: true, data: result };
            } catch (e) {
                return { success: false, error: error.message };
            }
        }
    }

    // Eliminar entrada de calendario por ID
    async deleteScheduledEntry(userId, entryId) {
        try {
            const client = await this.ensureClient();
            if (!client) throw new Error('Supabase client no disponible');
            const { error } = await client
                .from('calendar')
                .delete()
                .eq('id', entryId)
                .eq('user_id', userId);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error eliminando entrada de calendario:', error);
            // Fallback localStorage
            try {
                const key = `calendar:${userId}`;
                const list = JSON.parse(localStorage.getItem(key) || '[]');
                const idx = list.findIndex(e => String(e.id) === String(entryId));
                if (idx >= 0) {
                    list.splice(idx, 1);
                    localStorage.setItem(key, JSON.stringify(list));
                }
                return { success: true };
            } catch (e) {
                return { success: false, error: error.message };
            }
        }
    }
}

// Inicializar manager de datos
window.dataManager = new DataManager();