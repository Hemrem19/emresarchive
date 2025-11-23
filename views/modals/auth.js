export const authModalView = `
        <div id="auth-modal" class="fixed inset-0 z-50 hidden flex items-center justify-center p-4">
            <!-- Overlay -->
            <div id="auth-modal-overlay" class="fixed inset-0 bg-black/50 backdrop-blur-sm"></div>
            
            <!-- Modal -->
            <div class="relative bg-white dark:bg-stone-900 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-md p-6 z-10">
                <!-- Header -->
                <div class="flex items-center justify-between mb-6">
                    <h2 id="auth-modal-title" class="text-2xl font-bold text-stone-900 dark:text-white">Login</h2>
                    <button id="auth-modal-close" class="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors">
                        <span class="material-symbols-outlined text-stone-500 dark:text-stone-400">close</span>
                    </button>
                </div>
                
                <!-- Tabs (Login / Register) -->
                <div class="flex gap-2 mb-6 border-b border-stone-200 dark:border-stone-800">
                    <button id="auth-tab-login" class="px-4 py-2 text-sm font-medium text-primary border-b-2 border-primary transition-colors">
                        Login
                    </button>
                    <button id="auth-tab-register" class="px-4 py-2 text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 border-b-2 border-transparent transition-colors">
                        Register
                    </button>
                </div>
                
                <!-- Error Message -->
                <div id="auth-error" class="hidden mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p id="auth-error-message" class="text-sm text-red-700 dark:text-red-400"></p>
                </div>
                
                <!-- Success Message -->
                <div id="auth-success" class="hidden mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p id="auth-success-message" class="text-sm text-green-700 dark:text-green-400"></p>
                </div>
                
                <!-- Login Form -->
                <form id="auth-login-form" class="space-y-4">
                    <div>
                        <label for="auth-login-email" class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Email</label>
                        <input type="email" id="auth-login-email" required 
                            class="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-stone-800 dark:text-white">
                    </div>
                    <div>
                        <label for="auth-login-password" class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Password</label>
                        <input type="password" id="auth-login-password" required 
                            class="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-stone-800 dark:text-white">
                    </div>
                    <button type="submit" 
                        class="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                        <span id="auth-login-loading" class="hidden material-symbols-outlined animate-spin">refresh</span>
                        <span>Login</span>
                    </button>
                </form>
                
                <!-- Register Form -->
                <form id="auth-register-form" class="space-y-4 hidden">
                    <div>
                        <label for="auth-register-name" class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Name</label>
                        <input type="text" id="auth-register-name" required 
                            class="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-stone-800 dark:text-white">
                    </div>
                    <div>
                        <label for="auth-register-email" class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Email</label>
                        <input type="email" id="auth-register-email" required 
                            class="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-stone-800 dark:text-white">
                    </div>
                    <div>
                        <label for="auth-register-password" class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Password</label>
                        <input type="password" id="auth-register-password" required minlength="8"
                            class="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-stone-800 dark:text-white">
                        <p class="mt-1 text-xs text-stone-500 dark:text-stone-400">Minimum 8 characters</p>
                    </div>
                    <button type="submit" 
                        class="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                        <span id="auth-register-loading" class="hidden material-symbols-outlined animate-spin">refresh</span>
                        <span>Register</span>
                    </button>
                </form>
            </div>
        </div>
    `;
