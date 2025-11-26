/**
 * Authentication View Module
 * Handles authentication modal UI and user login/registration
 */

import { login, register, logout, isAuthenticated, getUser, verifyEmail, resendVerificationEmail } from './api/auth.js';
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
        const { views } = await import('./views/index.js');
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

            // Real-time validation feedback
            const loginEmailInput = document.getElementById('auth-login-email');
            const loginPasswordInput = document.getElementById('auth-login-password');

            if (loginEmailInput) {
                loginEmailInput.addEventListener('blur', () => {
                    const email = loginEmailInput.value.trim();
                    if (email && !this.validateEmail(email)) {
                        this.showFieldError('auth-login-email', 'Please enter a valid email address');
                    } else if (email) {
                        this.clearFieldError('auth-login-email');
                    }
                });
                loginEmailInput.addEventListener('input', () => {
                    if (loginEmailInput.classList.contains('border-red-500')) {
                        const email = loginEmailInput.value.trim();
                        if (email && this.validateEmail(email)) {
                            this.clearFieldError('auth-login-email');
                        }
                    }
                });
            }

            if (loginPasswordInput) {
                loginPasswordInput.addEventListener('blur', () => {
                    if (!loginPasswordInput.value) {
                        this.showFieldError('auth-login-password', 'Password is required');
                    } else {
                        this.clearFieldError('auth-login-password');
                    }
                });
                loginPasswordInput.addEventListener('input', () => {
                    if (loginPasswordInput.classList.contains('border-red-500') && loginPasswordInput.value) {
                        this.clearFieldError('auth-login-password');
                    }
                });
            }
        }
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));

            // Real-time validation feedback
            const registerNameInput = document.getElementById('auth-register-name');
            const registerEmailInput = document.getElementById('auth-register-email');
            const registerPasswordInput = document.getElementById('auth-register-password');

            if (registerNameInput) {
                registerNameInput.addEventListener('blur', () => {
                    const name = registerNameInput.value.trim();
                    if (!name) {
                        this.showFieldError('auth-register-name', 'Name is required');
                    } else if (name.length < 2) {
                        this.showFieldError('auth-register-name', 'Name must be at least 2 characters');
                    } else {
                        this.clearFieldError('auth-register-name');
                    }
                });
                registerNameInput.addEventListener('input', () => {
                    if (registerNameInput.classList.contains('border-red-500')) {
                        const name = registerNameInput.value.trim();
                        if (name && name.length >= 2) {
                            this.clearFieldError('auth-register-name');
                        }
                    }
                });
            }

            if (registerEmailInput) {
                registerEmailInput.addEventListener('blur', () => {
                    const email = registerEmailInput.value.trim();
                    if (!email) {
                        this.showFieldError('auth-register-email', 'Email is required');
                    } else if (!this.validateEmail(email)) {
                        this.showFieldError('auth-register-email', 'Please enter a valid email address');
                    } else {
                        this.clearFieldError('auth-register-email');
                    }
                });
                registerEmailInput.addEventListener('input', () => {
                    if (registerEmailInput.classList.contains('border-red-500')) {
                        const email = registerEmailInput.value.trim();
                        if (email && this.validateEmail(email)) {
                            this.clearFieldError('auth-register-email');
                        }
                    }
                });
            }

            if (registerPasswordInput) {
                registerPasswordInput.addEventListener('blur', () => {
                    const password = registerPasswordInput.value;
                    if (!password) {
                        this.showFieldError('auth-register-password', 'Password is required');
                    } else if (password.length < 8) {
                        this.showFieldError('auth-register-password', 'Password must be at least 8 characters');
                    } else {
                        this.clearFieldError('auth-register-password');
                    }
                });
                registerPasswordInput.addEventListener('input', () => {
                    if (registerPasswordInput.classList.contains('border-red-500')) {
                        const password = registerPasswordInput.value;
                        if (password && password.length >= 8) {
                            this.clearFieldError('auth-register-password');
                        }
                    }
                });
            }
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
     * Validates email format.
     * @param {string} email - Email address to validate.
     * @returns {boolean} True if valid, false otherwise.
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * Shows field-specific error.
     * @param {string} fieldId - Input field ID.
     * @param {string} message - Error message.
     */
    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.add('border-red-500', 'focus:ring-red-500', 'focus:border-red-500');
            field.classList.remove('border-stone-300', 'dark:border-stone-700');

            // Remove existing error message
            const existingError = field.parentElement.querySelector('.field-error');
            if (existingError) {
                existingError.remove();
            }

            // Add error message
            const errorEl = document.createElement('p');
            errorEl.className = 'field-error mt-1 text-xs text-red-600 dark:text-red-400';
            errorEl.textContent = message;
            field.parentElement.appendChild(errorEl);
        }
    },

    /**
     * Clears field-specific errors.
     * @param {string} fieldId - Input field ID (optional, clears all if not provided).
     */
    clearFieldError(fieldId) {
        if (fieldId) {
            const field = document.getElementById(fieldId);
            if (field) {
                field.classList.remove('border-red-500', 'focus:ring-red-500', 'focus:border-red-500');
                field.classList.add('border-stone-300', 'dark:border-stone-700');
                const errorEl = field.parentElement.querySelector('.field-error');
                if (errorEl) {
                    errorEl.remove();
                }
            }
        } else {
            // Clear all field errors
            document.querySelectorAll('.field-error').forEach(el => el.remove());
            document.querySelectorAll('input').forEach(input => {
                input.classList.remove('border-red-500', 'focus:ring-red-500', 'focus:border-red-500');
                input.classList.add('border-stone-300', 'dark:border-stone-700');
            });
        }
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

        // Clear previous errors
        this.clearFieldError();
        this.hideMessages();

        // Client-side validation
        let hasErrors = false;

        if (!email) {
            this.showFieldError('auth-login-email', 'Email is required');
            hasErrors = true;
        } else if (!this.validateEmail(email)) {
            this.showFieldError('auth-login-email', 'Please enter a valid email address');
            hasErrors = true;
        }

        if (!password) {
            this.showFieldError('auth-login-password', 'Password is required');
            hasErrors = true;
        }

        if (hasErrors) {
            return;
        }

        // Show loading state
        if (loading) loading.classList.remove('hidden');
        if (submitBtn) submitBtn.disabled = true;

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
            // Handle field-specific errors
            if (error.details && Array.isArray(error.details)) {
                error.details.forEach(detail => {
                    const field = detail.field || detail.path?.[0];
                    if (field === 'email') {
                        this.showFieldError('auth-login-email', detail.message || 'Invalid email');
                    } else if (field === 'password') {
                        this.showFieldError('auth-login-password', detail.message || 'Invalid password');
                    }
                });
            }

            // Show general error message
            const errorMessage = error.message || 'Login failed. Please check your credentials and try again.';
            this.showError(errorMessage);

            // Focus on first error field
            const firstErrorField = emailInput.classList.contains('border-red-500') ? emailInput :
                passwordInput.classList.contains('border-red-500') ? passwordInput : emailInput;
            firstErrorField.focus();
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

        // Clear previous errors
        this.clearFieldError();
        this.hideMessages();

        // Client-side validation
        let hasErrors = false;

        if (!name) {
            this.showFieldError('auth-register-name', 'Name is required');
            hasErrors = true;
        } else if (name.length < 2) {
            this.showFieldError('auth-register-name', 'Name must be at least 2 characters');
            hasErrors = true;
        }

        if (!email) {
            this.showFieldError('auth-register-email', 'Email is required');
            hasErrors = true;
        } else if (!this.validateEmail(email)) {
            this.showFieldError('auth-register-email', 'Please enter a valid email address');
            hasErrors = true;
        }

        if (!password) {
            this.showFieldError('auth-register-password', 'Password is required');
            hasErrors = true;
        } else if (password.length < 8) {
            this.showFieldError('auth-register-password', 'Password must be at least 8 characters');
            hasErrors = true;
        }

        if (hasErrors) {
            return;
        }

        // Show loading state
        if (loading) loading.classList.remove('hidden');
        if (submitBtn) submitBtn.disabled = true;

        try {
            const result = await register({ name, email, password });

            // Success - show verification message
            const verificationMessage = `Registration successful! Please check your email (${email}) to verify your account.`;
            this.showSuccess(verificationMessage);
            setCloudSyncEnabled(true);

            // Update UI
            this.updateUIForAuthenticated(result.user);

            // Close modal after showing message
            setTimeout(() => {
                this.close();
                showToast('Registration successful! Please check your email to verify your account.', 'info');
            }, 3000);

        } catch (error) {
            // Handle field-specific errors
            if (error.details && Array.isArray(error.details)) {
                error.details.forEach(detail => {
                    const field = detail.field || detail.path?.[0];
                    if (field === 'email' || field === 'emailAddress') {
                        this.showFieldError('auth-register-email', detail.message || 'Invalid email');
                    } else if (field === 'password') {
                        this.showFieldError('auth-register-password', detail.message || 'Invalid password');
                    } else if (field === 'name') {
                        this.showFieldError('auth-register-name', detail.message || 'Invalid name');
                    }
                });
            }

            // Show general error message
            let errorMessage = error.message || 'Registration failed. Please check your information and try again.';

            // Handle specific error cases
            if (error.message && error.message.toLowerCase().includes('already exists')) {
                errorMessage = 'An account with this email already exists. Please log in instead.';
                this.showFieldError('auth-register-email', 'This email is already registered');
            } else if (error.status === 429) {
                errorMessage = 'Too many registration attempts. Please wait a few minutes and try again.';
            } else if (error.status === 503 || error.message.includes('server error')) {
                errorMessage = 'Server is temporarily unavailable. Please try again in a few moments.';
            }

            this.showError(errorMessage);

            // Focus on first error field
            const firstErrorField = nameInput.classList.contains('border-red-500') ? nameInput :
                emailInput.classList.contains('border-red-500') ? emailInput :
                    passwordInput.classList.contains('border-red-500') ? passwordInput : emailInput;
            firstErrorField.focus();
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

        // Clear field errors
        this.clearFieldError();

        if (loginForm) loginForm.reset();
        if (registerForm) registerForm.reset();
    },

    /**
     * Shows email verification notice if user is not verified.
     * @param {Object} user - User data.
     */
    showEmailVerificationNotice(user) {
        if (user && !user.emailVerified) {
            const notice = document.getElementById('email-verification-notice');
            if (notice) {
                notice.classList.remove('hidden');
                const resendBtn = document.getElementById('resend-verification-btn');
                if (resendBtn && !resendBtn.dataset.listenerAdded) {
                    resendBtn.dataset.listenerAdded = 'true';
                    resendBtn.addEventListener('click', async () => {
                        // Store original text outside try block so it's available in catch
                        const originalText = resendBtn.textContent;
                        try {
                            resendBtn.disabled = true;
                            resendBtn.textContent = 'Sending...';
                            await resendVerificationEmail();
                            showToast('Verification email sent! Please check your inbox.', 'success');
                            resendBtn.textContent = originalText;
                        } catch (error) {
                            showToast(error.message || 'Failed to resend verification email', 'error');
                            resendBtn.textContent = originalText;
                        } finally {
                            resendBtn.disabled = false;
                        }
                    });
                }
            }
        } else {
            const notice = document.getElementById('email-verification-notice');
            if (notice) {
                notice.classList.add('hidden');
            }
        }
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

        // Show email verification notice if needed
        this.showEmailVerificationNotice(user);
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

