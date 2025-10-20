// Roadmap Manager
class RoadmapManager {
    constructor() {
        this.certifications = [];
        this.selectedCertification = null;
        this.init();
    }

    async init() {
        await this.loadCertifications();
        this.setupEventListeners();
        this.renderCertificationSelector();
    }

    async loadCertifications() {
        // Mock data - in real implementation, this would come from Supabase
        this.certifications = [
            {
                id: 1,
                name: 'OSCP (Offensive Security Certified Professional)',
                provider: 'Offensive Security',
                description: 'Certificación de pentesting práctico reconocida mundialmente',
                difficulty: 'Avanzado',
                estimatedTime: '2-3 meses',
                machinesRequired: 40,
                machines: this.generateOSCPMachines()
            },
            {
                id: 2,
                name: 'CEH (Certified Ethical Hacker)',
                provider: 'EC-Council',
                description: 'Certificación fundamental en hacking ético',
                difficulty: 'Intermedio',
                estimatedTime: '1-2 meses',
                machinesRequired: 25,
                machines: this.generateCEHMachines()
            },
            {
                id: 3,
                name: 'eJPT (eLearnSecurity Junior Penetration Tester)',
                provider: 'eLearnSecurity',
                description: 'Certificación inicial perfecta para empezar en pentesting',
                difficulty: 'Principiante',
                estimatedTime: '1 mes',
                machinesRequired: 15,
                machines: this.generateEJPTMachines()
            }
        ];
    }

    setupEventListeners() {
        // Certification selection
        document.addEventListener('change', (e) => {
            if (e.target.id === 'certification-select') {
                this.selectCertification(parseInt(e.target.value));
            }
        });

        // Machine status toggles
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('roadmap-machine-checkbox')) {
                this.updateMachineProgress(e.target);
            }
        });
    }

    renderCertificationSelector() {
        const selector = document.getElementById('certification-select');
        if (!selector) return;

        selector.innerHTML = `
            <option value="">Selecciona una certificación...</option>
            ${this.certifications.map(cert => `
                <option value="${cert.id}">${cert.name} - ${cert.provider}</option>
            `).join('')}
        `;
    }

    selectCertification(certId) {
        this.selectedCertification = this.certifications.find(c => c.id === certId) || null;
        this.renderRoadmap();
    }

    renderRoadmap() {
        const roadmapContainer = document.getElementById('roadmap-container');
        if (!roadmapContainer) return;

        if (!this.selectedCertification) {
            roadmapContainer.innerHTML = `
                <div class="roadmap-empty">
                    <h3>Selecciona una Certificación</h3>
                    <p>Elige una certificación de la lista para ver el roadmap de preparación</p>
                    <div class="certification-cards">
                        ${this.certifications.map(cert => `
                            <div class="cert-card" data-cert-id="${cert.id}">
                                <h4>${cert.name}</h4>
                                <p class="cert-provider">${cert.provider}</p>
                                <p class="cert-desc">${cert.description}</p>
                                <div class="cert-meta">
                                    <span class="difficulty ${cert.difficulty.toLowerCase()}">${cert.difficulty}</span>
                                    <span class="time">⏱ ${cert.estimatedTime}</span>
                                    <span class="machines">🎯 ${cert.machinesRequired} máquinas</span>
                                </div>
                                <button class="btn-primary select-cert" data-cert-id="${cert.id}">Seleccionar</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            // Add event listeners to select buttons
            document.querySelectorAll('.select-cert').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const certId = parseInt(e.target.dataset.certId);
                    document.getElementById('certification-select').value = certId;
                    this.selectCertification(certId);
                });
            });

            return;
        }

        const progress = this.calculateProgress();
        
        roadmapContainer.innerHTML = `
            <div class="roadmap-header">
                <div class="roadmap-info">
                    <h2>${this.selectedCertification.name}</h2>
                    <p class="cert-provider">${this.selectedCertification.provider}</p>
                    <p class="cert-description">${this.selectedCertification.description}</p>
                </div>
                <div class="roadmap-progress">
                    <div class="progress-circle">
                        <svg width="120" height="120" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border-color)" stroke-width="8"/>
                            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--htb-primary)" stroke-width="8" 
                                    stroke-dasharray="339.292" stroke-dashoffset="${339.292 * (1 - progress.percentage / 100)}"
                                    transform="rotate(-90 60 60)"/>
                            <text x="60" y="65" text-anchor="middle" fill="var(--text-light)" font-size="16" font-weight="bold">
                                ${Math.round(progress.percentage)}%
                            </text>
                        </svg>
                    </div>
                    <div class="progress-stats">
                        <div class="stat">
                            <span class="number">${progress.completed}</span>
                            <span class="label">Completadas</span>
                        </div>
                        <div class="stat">
                            <span class="number">${this.selectedCertification.machines.length}</span>
                            <span class="label">Total</span>
                        </div>
                        <div class="stat">
                            <span class="number">${progress.remaining}</span>
                            <span class="label">Restantes</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="roadmap-content">
                <div class="roadmap-machines">
                    <h3>Máquinas de Preparación</h3>
                    <div class="machines-list">
                        ${this.selectedCertification.machines.map(machine => `
                            <div class="roadmap-machine ${machine.completed ? 'completed' : ''}" data-machine-id="${machine.id}">
                                <label class="machine-checkbox">
                                    <input type="checkbox" class="roadmap-machine-checkbox" 
                                           ${machine.completed ? 'checked' : ''}
                                           data-machine-id="${machine.id}">
                                    <span class="checkmark"></span>
                                </label>
                                <div class="machine-info">
                                    <h4>${machine.name}</h4>
                                    <div class="machine-meta">
                                        <span class="difficulty ${machine.difficulty.toLowerCase()}">${machine.difficulty}</span>
                                        <span class="platform">${machine.platform}</span>
                                        <span class="techniques">${machine.techniques.join(', ')}</span>
                                    </div>
                                </div>
                                <div class="machine-actions">
                                    <button class="btn-secondary view-machine" data-machine-id="${machine.id}">Ver</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="roadmap-sidebar">
                    <div class="sidebar-section">
                        <h4>Recursos de Estudio</h4>
                        <div class="resources-list">
                            <a href="#" class="resource-link">📚 Guía Oficial de Estudio</a>
                            <a href="#" class="resource-link">🎥 Videos de Preparación</a>
                            <a href="#" class="resource-link">📖 Laboratorios Prácticos</a>
                            <a href="#" class="resource-link">💬 Comunidad de Estudio</a>
                        </div>
                    </div>

                    <div class="sidebar-section">
                        <h4>Próximos Pasos</h4>
                        <div class="next-steps">
                            ${this.getNextSteps().map(step => `
                                <div class="next-step">
                                    <span class="step-number">${step.order}</span>
                                    <span class="step-text">${step.text}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners
        this.addRoadmapEventListeners();
    }

    addRoadmapEventListeners() {
        // View machine buttons
        document.querySelectorAll('.view-machine').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const machineId = e.target.dataset.machineId;
                this.viewMachine(machineId);
            });
        });
    }

    calculateProgress() {
        if (!this.selectedCertification) {
            return { completed: 0, total: 0, remaining: 0, percentage: 0 };
        }

        const total = this.selectedCertification.machines.length;
        const completed = this.selectedCertification.machines.filter(m => m.completed).length;
        const remaining = total - completed;
        const percentage = total > 0 ? (completed / total) * 100 : 0;

        return { completed, total, remaining, percentage };
    }

    async updateMachineProgress(checkbox) {
        const machineId = checkbox.dataset.machineId;
        const isCompleted = checkbox.checked;

        // Update UI
        const machineElement = checkbox.closest('.roadmap-machine');
        machineElement.classList.toggle('completed', isCompleted);

        // Update progress
        const progress = this.calculateProgress();
        this.updateProgressDisplay(progress);

        // Save to database
        await this.saveMachineProgress(machineId, isCompleted);

        // Check if certification is completed
        if (progress.percentage === 100) {
            this.showCertificationComplete();
        }
    }

    updateProgressDisplay(progress) {
        // Update progress circle
        const circle = document.querySelector('.progress-circle circle:nth-child(2)');
        if (circle) {
            const circumference = 2 * Math.PI * 54;
            const offset = circumference * (1 - progress.percentage / 100);
            circle.style.strokeDashoffset = offset;
        }

        // Update progress text
        const progressText = document.querySelector('.progress-circle text');
        if (progressText) {
            progressText.textContent = `${Math.round(progress.percentage)}%`;
        }

        // Update stats
        const stats = document.querySelectorAll('.progress-stats .stat .number');
        if (stats[0]) stats[0].textContent = progress.completed;
        if (stats[2]) stats[2].textContent = progress.remaining;
    }

    async saveMachineProgress(machineId, completed) {
        const user = window.authManager.getCurrentUser();
        if (!user) return;

        // This would save the progress to the database
        // Implementation depends on your database structure
        console.log(`Saving progress: Machine ${machineId} - ${completed ? 'completed' : 'incomplete'}`);
    }

    viewMachine(machineId) {
        // Open machine in modal or redirect to machine page
        if (window.uiManager && window.uiManager.openMachineModal) {
            window.uiManager.openMachineModal(machineId);
        } else {
            window.uiManager.showNotification(`Ver máquina ${machineId}`, 'info');
        }
    }

    getNextSteps() {
        if (!this.selectedCertification) return [];

        const progress = this.calculateProgress();
        
        if (progress.percentage === 0) {
            return [
                { order: 1, text: 'Comienza con las máquinas fáciles' },
                { order: 2, text: 'Establece un horario de estudio consistente' },
                { order: 3, text: 'Únete a la comunidad de estudio' }
            ];
        } else if (progress.percentage < 50) {
            return [
                { order: 1, text: 'Continúa con máquinas de dificultad media' },
                { order: 2, text: 'Practica las técnicas aprendidas' },
                { order: 3, text: 'Revisa máquinas anteriores' }
            ];
        } else if (progress.percentage < 100) {
            return [
                { order: 1, text: 'Enfócate en máquinas difíciles' },
                { order: 2, text: 'Realiza ejercicios de tiempo' },
                { order: 3, text: 'Prepara el examen final' }
            ];
        } else {
            return [
                { order: 1, text: '¡Certificación completada!' },
                { order: 2, text: 'Prepara tu examen oficial' },
                { order: 3, text: 'Comparte tu experiencia' }
            ];
        }
    }

    showCertificationComplete() {
        window.uiManager.showNotification(
            `¡Felicidades! Has completado todas las máquinas para ${this.selectedCertification.name}`,
            'success'
        );
    }

    // Mock data generators
    generateOSCPMachines() {
        return [
            {id: 1, name: 'Injection', difficulty: 'Muy Fácil', ip: '10.88.0.2', os: 'Linux', techniques: ['SSH','SQLi'], certifications: ['OSCP'], tags: ['Beginner','SSH'], video: 'NmDQvmCgkv8' }
        ];
    }

    generateCEHMachines() {
        return [
            
        ];
    }

    generateEJPTMachines() {
        return [
            {id: 1, name: 'Injection', difficulty: 'Muy Fácil', ip: '10.88.0.2', os: 'Linux', techniques: ['SSH','SQLi'], certifications: ['OSCP'], tags: ['Beginner','SSH'], video: 'NmDQvmCgkv8' }
        ];
    }
}

// Initialize Roadmap Manager when on roadmap page
if (window.location.pathname.includes('roadmap.html')) {
    window.roadmapManager = new RoadmapManager();
}