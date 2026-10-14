/**
 * Group page (#/group/:id): name, storage, members and roles, invitations,
 * and leaving or deleting the group. Invitations page (#/invites): accept
 * or decline invites addressed to the signed-in user.
 *
 * What each control may do is enforced by the backend; the page only hides
 * controls the user's role cannot use.
 */
import {
    getGroup, renameGroup, deleteGroup, listMembers, setMemberRole, removeMember,
    listInvites, inviteMember, cancelInvite, listGroups, acceptInvite, declineInvite,
} from './api/groups.js';
import { getUser } from './api/auth.js';
import { currentGroupId, openLibrary } from './core/library.js';
import { renderLibrarySwitcher } from './components/librarySwitcher.js';
import { showToast, escapeHtml } from './ui.js';

const ROLE_LABELS = { owner: 'Owner', admin: 'Admin', member: 'Member' };
const isManager = (role) => role === 'owner' || role === 'admin';

const button = (extra = '') => `rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${extra}`;
const section = (icon, title, body) => `
    <section class="border-t border-white/5 pt-6 first:border-0 first:pt-0">
        <h3 class="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <span class="material-symbols-outlined text-xl text-primary">${icon}</span>${title}
        </h3>
        <div class="mt-4">${body}</div>
    </section>`;

function formatBytes(bytes) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

/** Leaves the page for the personal library when the open group is gone. */
function afterLosingGroup(groupId) {
    if (currentGroupId() === groupId) {
        openLibrary('personal');
    } else {
        window.location.hash = '#/app';
        renderLibrarySwitcher();
    }
}

export function memberRowHtml(m, { me, myRole }) {
    const self = m.userId === me;
    const canChangeRole = myRole === 'owner' && m.role !== 'owner';
    const canRemove = !self && m.role !== 'owner' && (myRole === 'owner' || (myRole === 'admin' && m.role === 'member'));
    const name = m.name ? `${escapeHtml(m.name)} <span class="text-slate-500">${escapeHtml(m.email)}</span>` : escapeHtml(m.email);
    return `
        <li class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-800/50 px-4 py-3">
            <p class="min-w-0 text-sm text-slate-200 truncate">${name}${self ? ' <span class="ml-1 text-xs font-semibold text-primary">You</span>' : ''}</p>
            <div class="flex items-center gap-2">
                ${canChangeRole ? `
                <select data-role-for="${m.userId}" aria-label="Role" class="h-8 rounded-lg border border-slate-600 bg-slate-800 px-2 text-xs text-white">
                    <option value="member" ${m.role === 'member' ? 'selected' : ''}>Member</option>
                    <option value="admin" ${m.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>` : `<span class="text-xs text-slate-400">${ROLE_LABELS[m.role] || escapeHtml(m.role)}</span>`}
                ${canRemove ? `<button type="button" data-remove="${m.userId}" class="${button('text-red-400 hover:bg-red-500/10')}">Remove</button>` : ''}
            </div>
        </li>`;
}

export const groupPageView = {
    groupId: null,

    async mount(groupId) {
        this.groupId = groupId;
        const page = document.getElementById('group-page');
        if (!page) return;
        page.onclick = (event) => this.onClick(event);
        page.onchange = (event) => this.onChange(event);
        page.onsubmit = (event) => this.onSubmit(event);
        await this.render();
    },

    unmount() {
        this.groupId = null;
    },

    async render() {
        const page = document.getElementById('group-page');
        const id = this.groupId;
        let group, members, invites = [];
        try {
            [group, members] = await Promise.all([getGroup(id), listMembers(id)]);
            if (isManager(group.role)) invites = await listInvites(id);
        } catch (error) {
            page.innerHTML = `<p class="text-sm text-red-400">${error.status === 404 ? 'This group does not exist, or you are not a member.' : `Could not load the group: ${escapeHtml(error.message)}`}</p>`;
            return;
        }
        if (this.groupId !== id) return; // navigated away meanwhile
        this.group = group;

        const me = getUser()?.id;
        const { usedBytes, limitBytes } = group.storage;
        const percent = limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : 0;
        const barColor = percent >= 90 ? 'bg-red-500' : percent >= 75 ? 'bg-yellow-500' : 'bg-primary';
        const opened = currentGroupId() === id;

        page.innerHTML = `
            <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="min-w-0">
                    <h2 class="text-2xl sm:text-3xl font-bold text-slate-100 break-words">${escapeHtml(group.name)}</h2>
                    <p class="mt-1 text-sm text-slate-400">Private group · you are ${ROLE_LABELS[group.role]?.toLowerCase() || escapeHtml(group.role)}</p>
                </div>
                <div class="flex gap-2">
                    ${isManager(group.role) ? `<button type="button" data-rename class="${button('border border-white/10 text-slate-200 hover:bg-white/5')}">Rename</button>` : ''}
                    ${opened ? '' : `<button type="button" data-open class="${button('bg-primary text-white hover:bg-primary/90')}">Open library</button>`}
                </div>
            </div>

            ${section('cloud', 'Storage', `
                <p class="text-sm text-slate-200">${formatBytes(usedBytes)} of ${formatBytes(limitBytes)} used by the group's PDFs</p>
                <div class="mt-2 h-2 w-full rounded-full bg-slate-700" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(percent)}">
                    <div class="h-2 rounded-full ${barColor}" style="width: ${percent.toFixed(1)}%"></div>
                </div>
                <p class="mt-2 text-xs text-slate-400">Every member's uploads count toward this shared limit, not toward their own storage.</p>`)}

            ${section('group', `Members (${members.length})`, `
                <ul id="group-members" class="flex flex-col gap-2">${members.map((m) => memberRowHtml(m, { me, myRole: group.role })).join('')}</ul>`)}

            ${isManager(group.role) ? section('mail', 'Invite people', `
                <form id="group-invite-form" class="flex flex-col sm:flex-row gap-2">
                    <input type="email" name="email" required placeholder="name@university.edu" aria-label="Email address"
                        class="h-10 flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 text-sm text-white placeholder:text-slate-500">
                    ${group.role === 'owner' ? `
                    <select name="role" aria-label="Role" class="h-10 rounded-lg border border-slate-600 bg-slate-800 px-2 text-sm text-white">
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                    </select>` : ''}
                    <button type="submit" class="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50">Send invite</button>
                </form>
                <p class="mt-2 text-xs text-slate-400">They get an email and join after signing in with that address. Invitations expire after 14 days.</p>
                <ul id="group-invites" class="mt-4 flex flex-col gap-2">
                    ${invites.map((i) => `
                    <li class="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-800/30 px-4 py-2">
                        <p class="min-w-0 text-sm text-slate-300 truncate">${escapeHtml(i.email)} <span class="text-xs text-slate-500">· ${ROLE_LABELS[i.role] || ''} · pending</span></p>
                        <button type="button" data-cancel-invite="${i.id}" class="${button('text-slate-400 hover:text-white hover:bg-white/5')}">Cancel</button>
                    </li>`).join('')}
                </ul>`) : ''}

            ${section('logout', group.role === 'owner' ? 'Delete group' : 'Leave group', group.role === 'owner'
                ? `<p class="text-sm text-slate-400">Deletes the group's library for every member: its papers, folders and PDFs. This cannot be undone. Copy papers you want to keep into your own library first.</p>
                   <button type="button" data-delete class="mt-3 ${button('border border-red-500/40 text-red-400 hover:bg-red-500/10')}">Delete group</button>`
                : `<p class="text-sm text-slate-400">You lose access to the group's library. Papers you copied into your own library stay there.</p>
                   <button type="button" data-leave class="mt-3 ${button('border border-red-500/40 text-red-400 hover:bg-red-500/10')}">Leave group</button>`)}
        `;
    },

    async run(action, success) {
        try {
            await action();
            if (success) showToast(success, 'success');
        } catch (error) {
            showToast(error.message, 'error', { duration: 6000 });
        }
    },

    async onClick(event) {
        // The invite form's own button is handled by onSubmit
        const target = event.target.closest('button');
        if (!target || target.closest('form')) return;
        const id = this.groupId;
        const me = getUser()?.id;

        if (target.matches('[data-open]')) {
            openLibrary(id);
        } else if (target.matches('[data-rename]')) {
            const name = window.prompt('New name for the group', this.group?.name || '');
            if (!name || !name.trim()) return;
            await this.run(() => renameGroup(id, name.trim()), 'Group renamed.');
            await this.render();
            renderLibrarySwitcher();
        } else if (target.dataset.remove) {
            if (!window.confirm('Remove this member? They lose access to the group\'s library right away.')) return;
            target.disabled = true;
            await this.run(() => removeMember(id, Number(target.dataset.remove)), 'Member removed.');
            await this.render();
        } else if (target.dataset.cancelInvite) {
            target.disabled = true;
            await this.run(() => cancelInvite(id, Number(target.dataset.cancelInvite)), 'Invitation cancelled.');
            await this.render();
        } else if (target.matches('[data-leave]')) {
            if (!window.confirm(`Leave "${this.group?.name}"? You will need a new invitation to come back.`)) return;
            try {
                await removeMember(id, me);
                showToast('You left the group.', 'success');
                afterLosingGroup(id);
            } catch (error) {
                showToast(error.message, 'error', { duration: 6000 });
            }
        } else if (target.matches('[data-delete]')) {
            const typed = window.prompt(`This deletes "${this.group?.name}" and everything in it for all members. Type the group name to confirm.`);
            if (typed === null) return;
            if (typed.trim() !== this.group?.name) {
                showToast('The name did not match; nothing was deleted.', 'info');
                return;
            }
            try {
                await deleteGroup(id);
                showToast('Group deleted.', 'success');
                afterLosingGroup(id);
            } catch (error) {
                showToast(error.message, 'error', { duration: 6000 });
            }
        }
    },

    async onChange(event) {
        const select = event.target.closest('select[data-role-for]');
        if (!select) return;
        select.disabled = true;
        await this.run(() => setMemberRole(this.groupId, Number(select.dataset.roleFor), select.value), 'Role updated.');
        await this.render();
    },

    async onSubmit(event) {
        if (event.target.id !== 'group-invite-form') return;
        event.preventDefault();
        const form = event.target;
        const submit = form.querySelector('[type="submit"]');
        submit.disabled = true;
        const email = form.email.value.trim();
        const role = form.role?.value || 'member';
        try {
            await inviteMember(this.groupId, email, role);
            showToast(`Invitation sent to ${email}.`, 'success');
            await this.render();
        } catch (error) {
            showToast(error.message, 'error', { duration: 6000 });
            submit.disabled = false;
        }
    },
};

export const invitesPageView = {
    async mount() {
        const list = document.getElementById('invites-list');
        if (!list) return;
        list.onclick = (event) => this.onClick(event);
        await this.render();
    },

    unmount() {},

    async render() {
        const list = document.getElementById('invites-list');
        let invites;
        try {
            ({ invites } = await listGroups());
        } catch (error) {
            list.innerHTML = `<li class="text-sm text-red-400">Could not load invitations: ${escapeHtml(error.message)}</li>`;
            return;
        }
        list.innerHTML = invites.length ? invites.map((i) => `
            <li class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-800/50 px-4 py-3">
                <div class="min-w-0">
                    <p class="text-sm font-medium text-slate-200 truncate">${escapeHtml(i.groupName)}</p>
                    <p class="text-xs text-slate-400">Invited by ${escapeHtml(i.invitedBy || i.invitedByEmail || 'a member')} as ${ROLE_LABELS[i.role]?.toLowerCase() || 'member'}</p>
                </div>
                <div class="flex gap-2">
                    <button type="button" data-decline="${i.id}" class="${button('text-slate-400 hover:text-white hover:bg-white/5')}">Decline</button>
                    <button type="button" data-accept="${i.id}" data-group="${i.groupId}" class="${button('bg-primary text-white hover:bg-primary/90')}">Join</button>
                </div>
            </li>`).join('')
            : '<li class="text-sm text-slate-400">No pending invitations. If you expected one, make sure you signed in with the address it was sent to, and that the address is verified.</li>';
    },

    async onClick(event) {
        const target = event.target.closest('button');
        if (!target) return;
        target.disabled = true;
        try {
            if (target.dataset.accept) {
                await acceptInvite(Number(target.dataset.accept));
                showToast('You joined the group.', 'success');
                openLibrary(Number(target.dataset.group));
                return;
            }
            if (target.dataset.decline) {
                await declineInvite(Number(target.dataset.decline));
                showToast('Invitation declined.', 'info');
                renderLibrarySwitcher();
            }
        } catch (error) {
            showToast(error.message, 'error', { duration: 6000 });
        }
        await this.render();
    },
};
