// Pomodoro Timer Manager
class PomodoroManager {
    constructor() {
        this.timer = null;
        this.timeLeft = 25 * 60; // 25 minutes in seconds
        this.isRunning = false;
        this.currentSession = 'focus'; // focus, shortBreak, longBreak
        this.sessionCount = 0;
        
        this.sessions = {
            focus: 25 * 60,
            shortBreak: 5 * 60,
            longBreak: 15 * 60
        };
        
        this.init();
    }

    init() {
        this.updateDisplay();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const startBtn = document.getElementById('pomodoro-start');
        const pauseBtn = document.getElementById('pomodoro-pause');
        const resetBtn = document.getElementById('pomodoro-reset');

        if (startBtn) {
            startBtn.addEventListener('click', () => this.start());
        }

        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.pause());
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();
            
            if (this.timeLeft <= 0) {
                this.sessionComplete();
            }
        }, 1000);

        this.updateButtons();
        this.showNotification('Pomodoro iniciado!', 'success');
    }

    pause() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        clearInterval(this.timer);
        this.updateButtons();
        this.showNotification('Pomodoro pausado', 'warning');
    }

    reset() {
        this.isRunning = false;
        clearInterval(this.timer);
        this.timeLeft = this.sessions[this.currentSession];
        this.updateDisplay();
        this.updateButtons();
        this.showNotification('Pomodoro reiniciado', 'info');
    }

    sessionComplete() {
        this.isRunning = false;
        clearInterval(this.timer);
        
        // Play notification sound
        this.playNotificationSound();
        
        // Show completion notification
        this.showNotification(
            `Sesión ${this.currentSession === 'focus' ? 'de focus' : 'de descanso'} completada!`, 
            'success'
        );

        // Move to next session
        if (this.currentSession === 'focus') {
            this.sessionCount++;
            
            if (this.sessionCount % 4 === 0) {
                this.currentSession = 'longBreak';
            } else {
                this.currentSession = 'shortBreak';
            }
        } else {
            this.currentSession = 'focus';
        }

        this.timeLeft = this.sessions[this.currentSession];
        this.updateDisplay();
        this.updateSessionInfo();
        this.updateButtons();
    }

    updateDisplay() {
        const timerElement = document.getElementById('pomodoro-timer');
        if (timerElement) {
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = this.timeLeft % 60;
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Change color based on time
            if (this.timeLeft < 60) { // Less than 1 minute
                timerElement.style.color = 'var(--htb-danger)';
            } else if (this.timeLeft < 300) { // Less than 5 minutes
                timerElement.style.color = 'var(--htb-warning)';
            } else {
                timerElement.style.color = 'var(--htb-primary)';
            }
        }
    }

    updateButtons() {
        const startBtn = document.getElementById('pomodoro-start');
        const pauseBtn = document.getElementById('pomodoro-pause');
        const resetBtn = document.getElementById('pomodoro-reset');

        if (startBtn) {
            startBtn.disabled = this.isRunning;
            startBtn.textContent = this.isRunning ? 'Ejecutando...' : 'Iniciar';
        }

        if (pauseBtn) {
            pauseBtn.disabled = !this.isRunning;
        }

        if (resetBtn) {
            resetBtn.disabled = this.isRunning;
        }
    }

    updateSessionInfo() {
        const sessionElement = document.getElementById('pomodoro-session-type');
        if (sessionElement) {
            const sessionNames = {
                focus: 'Focus 🎯',
                shortBreak: 'Descanso Corto ☕',
                longBreak: 'Descanso Largo 🌴'
            };
            sessionElement.textContent = sessionNames[this.currentSession];
            sessionElement.className = `session-${this.currentSession}`;
        }
    }

    playNotificationSound() {
        // Create a simple notification sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 1);
        } catch (error) {
            console.log('Audio context not supported');
        }
    }

    showNotification(message, type) {
        if (window.uiManager && window.uiManager.showNotification) {
            window.uiManager.showNotification(message, type);
        } else {
            // Fallback notification
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Method to set custom times
    setCustomTimes(focusMinutes, shortBreakMinutes, longBreakMinutes) {
        this.sessions.focus = focusMinutes * 60;
        this.sessions.shortBreak = shortBreakMinutes * 60;
        this.sessions.longBreak = longBreakMinutes * 60;
        
        if (!this.isRunning) {
            this.timeLeft = this.sessions[this.currentSession];
            this.updateDisplay();
        }
    }

    // Get current session progress
    getProgress() {
        const totalTime = this.sessions[this.currentSession];
        return ((totalTime - this.timeLeft) / totalTime) * 100;
    }
}

// Initialize Pomodoro Manager
window.pomodoroManager = new PomodoroManager();