/**
 * Authentication View Module
 * Handles authentication modal UI and user login/registration
 */

import { login, register, logout, isAuthenticated, getUser } from './api/auth.js';
import { showToast } from './ui.js';
import { setCloudSyncEnabled } from './config.js';

export const authView = {
    isOpen: false,
    
    /**
     * Initializes the authentication modal and mounts it to the DOM.
     */
    async mount() {
        const container = document.getElementById('auth-modal-container');
        if (!container) {
            console.error('Auth modal container not found');
            return;
        }

        // Inject modal HTML
        const { views } = await import('./views.js');
        container.innerHTML = views.authModal;

        // Setup event listeners
        this.setupEventListeners();
        
        // Check if user is already authenticated
        if (isAuthenticated()) {
            const user = getUser();
            this.updateUIForAuthenticated(user);
        } else {
            this.updateUIForUnauthenticated();
        }
    },

    /**
     * Sets up event listeners for the authentication modal.
     */
    setupEventListeners() {
        const modal = document.getElementById('auth-modal');
        const overlay = document.getElementById('auth-modal-overlay');
        const closeBtn = document.getElementById('auth-modal-close');
        const loginTab = document.getElementById('auth-tab-login');
        const registerTab = document.getElementById('auth-tab-register');
        const loginForm = document.getElementById('auth-login-form');
        const registerForm = document.getElementById('auth-register-form');

        // Close modal
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        if (overlay) {
            overlay.addEventListener('click', () => this.close());
        }

        // Tab switching
        if (loginTab) {
            loginTab.addEventListener('click', () => this.showLoginTab());
        }
        if (registerTab) {
            registerTab.addEventListener('click', () => this.showRegisterTab());
        }

        // Form submissions
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
    },

    /**
     * Opens the authentication modal.
     * @param {string} tab - 'login' or 'register' (default: 'login')
     */
    open(tab = 'login') {
        const modal = document.getElementById('auth-modal');
        if (!modal) {
            console.error('Auth modal not found');
            return;
        }

        this.isOpen = true;
        modal.classList.remove('hidden');

        // Show appropriate tab
        if (tab === 'register') {
            this.showRegisterTab();
        } else {
            this.showLoginTab();
        }

        // Focus first input
        setTimeout(() => {
            const emailInput = document.getElementById('auth-login-email') || 
                              document.getElementById('auth-register-email');
            if (emailInput) emailInput.focus();
        }, 100);
    },

    /**
     * Closes the authentication modal.
     */
    close() {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.classList.add('hidden');
            this.isOpen = false;
        }

        // Clear forms
        this.clearForms();
        this.hideMessages();
    },

    /**
     * Shows the login tab.
     */
    showLoginTab() {
        const loginTab = document.getElementById('auth-tab-login');
        const registerTab = document.getElementById('auth-tab-register');
        const loginForm = document.getElementById('auth-login-form');
        const registerForm = document.getElementById('auth-register-form');
        const title = document.getElementById('auth-modal-title');

        if (loginTab) loginTab.classList.add('text-primary', 'border-primary');
        if (loginTab) loginTab.classList.remove('text-stone-500', 'dark:text-stone-400', 'border-transparent');
        if (registerTab) registerTab.classList.remove('text-primary', 'border-primary');
        if (registerTab) registerTab.classList.add('text-stone-500', 'dark:text-stone-400', 'border-transparent');

        if (loginForm) loginForm.classList.remove('hidden');
        if (registerForm) registerForm.classList.add('hidden');
        if (title) title.textContent = 'Login';
    },

    /**
     * Shows the register tab.
     */
    showRegisterTab() {
        const loginTab = document.getElementById('auth-tab-login');
        const registerTab = document.getElementById('auth-tab-register');
        const loginForm = document.getElementById('auth-login-form');
        const registerForm = document.getElementById('auth-register-form');
        const title = document.getElementById('auth-modal-title');

        if (registerTab) registerTab.classList.add('text-primary', 'border-primary');
        if (registerTab) registerTab.classList.remove('text-stone-500', 'dark:text-stone-400', 'border-transparent');
        if (loginTab) loginTab.classList.remove('text-primary', 'border-primary');
        if (loginTab) loginTab.classList.add('text-stone-500', 'dark:text-stone-400', 'border-transparent');

        if (registerForm) registerForm.classList.remove('hidden');
        if (loginForm) loginForm.classList.add('hidden');
        if (title) title.textContent = 'Register';
    },

    /**
     * Handles login form submission.
     * @param {Event} e - Form submission event.
     */
    async handleLogin(e) {
        e.preventDefault();
        
        const emailInput = document.getElementById('auth-login-email');
        const passwordInput = document.getElementById('auth-login-password');
        const loading = document.getElementById('auth-login-loading');
        const submitBtn = e.target.querySelector('button[type="submit"]');

        if (!emailInput || !passwordInput) return;

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            this.showError('Please fill in all fields');
            return;
        }

        // Show loading state
        if (loading) loading.classList.remove('hidden');
        if (submitBtn) submitBtn.disabled = true;
        this.hideMessages();

        try {
            const result = await login({ email, password });
            
            // Success
            this.showSuccess('Login successful!');
            setCloudSyncEnabled(true);
            
            // Update UI
            this.updateUIForAuthenticated(result.user);
            
            // Close modal after short delay
            setTimeout(() => {
                this.close();
                showToast('Welcome back! Cloud sync is now enabled.', 'success');
            }, 1000);

        } catch (error) {
            this.showError(error.message || 'Login failed. Please try again.');
        } finally {
            // Hide loading state
            if (loading) loading.classList.add('hidden');
            if (submitBtn) submitBtn.disabled = false;
        }
    },

    /**
     * Handles registration form submission.
     * @param {Event} e - Form submission event.
     */
    async handleRegister(e) {
        e.preventDefault();
        
        const nameInput = document.getElementById('auth-register-name');
        const emailInput = document.getElementById('auth-register-email');
        const passwordInput = document.getElementById('auth-register-password');
        const loading = document.getElementById('auth-register-loading');
        const submitBtn = e.target.querySelector('button[type="submit"]');

        if (!nameInput || !emailInput || !passwordInput) return;

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!name || !email || !password) {
            this.showError('Please fill in all fields');
            return;
        }

        if (password.length < 8) {
            this.showError('Password must be at least 8 characters');
            return;
        }

        // Show loading state
        if (loading) loading.classList.remove('hidden');
        if (submitBtn) submitBtn.disabled = true;
        this.hideMessages();

        try {
            const result = await register({ name, email, password });
            
            // Success
            this.showSuccess('Registration successful!');
            setCloudSyncEnabled(true);
            
            // Update UI
            this.updateUIForAuthenticated(result.user);
            
            // Switch to login tab and close after short delay
            setTimeout(() => {
                this.showLoginTab();
                this.close();
                showToast('Account created! Cloud sync is now enabled.', 'success');
            }, 1000);

        } catch (error) {
            this.showError(error.message || 'Registration failed. Please try again.');
        } finally {
            // Hide loading state
            if (loading) loading.classList.add('hidden');
            if (submitBtn) submitBtn.disabled = false;
        }
    },

    /**
     * Handles user logout.
     */
    async handleLogout() {
        try {
            await logout();
            setCloudSyncEnabled(false);
            this.updateUIForUnauthenticated();
            showToast('Logged out successfully. App is now in local-only mode.', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            // Still update UI even if API call fails
            this.updateUIForUnauthenticated();
            showToast('Logged out locally.', 'info');
        }
    },

    /**
     * Shows an error message in the modal.
     * @param {string} message - Error message to display.
     */
    showError(message) {
        const errorDiv = document.getElementById('auth-error');
        const errorMessage = document.getElementById('auth-error-message');
        
        if (errorDiv && errorMessage) {
            errorMessage.textContent = message;
            errorDiv.classList.remove('hidden');
        }
    },

    /**
     * Shows a success message in the modal.
     * @param {string} message - Success message to display.
     */
    showSuccess(message) {
        const successDiv = document.getElementById('auth-success');
        const successMessage = document.getElementById('auth-success-message');
        
        if (successDiv && successMessage) {
            successMessage.textContent = message;
            successDiv.classList.remove('hidden');
        }
    },

    /**
     * Hides all messages in the modal.
     */
    hideMessages() {
        const errorDiv = document.getElementById('auth-error');
        const successDiv = document.getElementById('auth-success');
        
        if (errorDiv) errorDiv.classList.add('hidden');
        if (successDiv) successDiv.classList.add('hidden');
    },

    /**
     * Clears all form inputs.
     */
    clearForms() {
        const loginForm = document.getElementById('auth-login-form');
        const registerForm = document.getElementById('auth-register-form');
        
        if (loginForm) loginForm.reset();
        if (registerForm) registerForm.reset();
    },

    /**
     * Updates UI to show authenticated state.
     * @param {Object} user - User data.
     */
    updateUIForAuthenticated(user) {
        // Update header with user info and logout button
        const authBtn = document.getElementById('auth-button');
        if (authBtn) {
            authBtn.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-sm">account_circle</span>
                    <span class="text-sm font-medium">${user.name || user.email}</span>
                    <button id="logout-button" class="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100">
                        Logout
                    </button>
                </div>
            `;
            
            const logoutBtn = document.getElementById('logout-button');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => this.handleLogout());
            }
        }
    },

    /**
     * Updates UI to show unauthenticated state.
     */
    updateUIForUnauthenticated() {
        // Update header with login button
        const authBtn = document.getElementById('auth-button');
        if (authBtn) {
            authBtn.innerHTML = `
                <button id="login-button" class="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors">
                    <span class="material-symbols-outlined text-sm">login</span>
                    <span>Login</span>
                </button>
            `;
            
            const loginBtn = document.getElementById('login-button');
            if (loginBtn) {
                loginBtn.addEventListener('click', () => this.open('login'));
            }
        }
    }
};

