const card = 'rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-xl shadow-2xl shadow-black/30 p-6 sm:p-8';

export const groupView = `
        <div class="flex flex-1 items-start justify-center py-8 sm:py-12 px-4 sm:px-6">
            <div class="w-full max-w-3xl ${card}">
                <div id="group-page" class="space-y-8">
                    <p class="text-slate-400 text-sm">Loading group…</p>
                </div>
            </div>
        </div>
    `;

export const invitesView = `
        <div class="flex flex-1 items-start justify-center py-8 sm:py-12 px-4 sm:px-6">
            <div class="w-full max-w-2xl ${card}">
                <h2 class="text-2xl sm:text-3xl font-bold text-slate-100">Invitations</h2>
                <p class="mt-2 text-sm text-slate-400">Groups you have been invited to. Joining gives you access to the group's shared library.</p>
                <ul id="invites-list" class="mt-6 flex flex-col gap-3">
                    <li class="text-slate-400 text-sm">Loading invitations…</li>
                </ul>
            </div>
        </div>
    `;
