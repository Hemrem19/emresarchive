/**
 * Sidebar library switcher: "My Library" and the user's groups, plus
 * creating a group, managing the open one, and pending invitations.
 * Shown when signed in with cloud sync on; otherwise the sidebar keeps its
 * plain "Library" heading.
 */
import { listGroups, createGroup } from '../api/groups.js';
import { isAuthenticated } from '../api/auth.js';
import { isCloudSyncEnabled } from '../config.js';
import { currentGroupId, openLibrary } from '../core/library.js';
import { showToast, escapeHtml } from '../ui.js';

const CONTAINERS = ['library-switcher', 'mobile-library-switcher'];

/** Fired with { groups, invites } each time the switcher loads them. */
export const GROUPS_LOADED = 'citavers:groups-loaded';

const optionClass = 'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-slate-300 hover:bg-slate-800 hover:text-white';

/** Switcher markup for the open library and the user's groups and invites. */
export function switcherHtml({ groups, invites }, here = currentGroupId()) {
    const open = groups.find((g) => g.id === here);
    const label = open ? open.name : 'My Library';
    const pending = invites.length
        ? `<span class="ml-auto rounded-full bg-primary px-1.5 text-[10px] font-bold text-white" aria-label="${invites.length} pending invitations">${invites.length}</span>`
        : '';
    const option = (value, icon, text, hint, active) => `
        <button type="button" data-library="${value}" class="${optionClass} ${active ? 'bg-slate-800 text-white' : ''}" ${active ? 'aria-current="true"' : ''}>
            <span class="material-symbols-outlined text-[18px]">${icon}</span>
            <span class="truncate">${escapeHtml(text)}</span>
            ${hint ? `<span class="ml-auto text-[11px] text-slate-500">${escapeHtml(hint)}</span>` : ''}
        </button>`;

    return `
        <details class="library-switcher mb-2">
            <summary class="list-none cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-800/60 [&::-webkit-details-marker]:hidden">
                <span class="material-symbols-outlined text-[20px] text-primary">${open ? 'groups' : 'person'}</span>
                <span class="text-sm font-semibold truncate">${escapeHtml(label)}</span>
                ${pending}
                <span class="material-symbols-outlined text-[18px] text-slate-500 ${pending ? '' : 'ml-auto'}">unfold_more</span>
            </summary>
            <div class="mt-1 rounded-xl border border-white/10 bg-slate-900/95 p-1 shadow-xl">
                ${option('personal', 'person', 'My Library', '', !open)}
                ${groups.map((g) => option(g.id, 'groups', g.name, g.role, g.id === here)).join('')}
                <div class="my-1 border-t border-white/5"></div>
                ${open ? `<a href="#/group/${open.id}" class="${optionClass}"><span class="material-symbols-outlined text-[18px]">manage_accounts</span><span>Manage group</span></a>` : ''}
                <button type="button" data-new-group class="${optionClass}"><span class="material-symbols-outlined text-[18px]">group_add</span><span>New group…</span></button>
                ${invites.length ? `<a href="#/invites" class="${optionClass}"><span class="material-symbols-outlined text-[18px]">mail</span><span>Invitations</span>${pending}</a>` : ''}
            </div>
        </details>`;
}

async function onClick(event) {
    const switcher = event.target.closest('.library-switcher');
    if (!switcher) return;

    const choice = event.target.closest('[data-library]');
    if (choice) {
        const value = choice.dataset.library;
        const target = value === 'personal' ? null : Number(value);
        if (target === currentGroupId()) {
            switcher.open = false;
            return;
        }
        openLibrary(value === 'personal' ? 'personal' : target);
        return;
    }

    if (event.target.closest('[data-new-group]')) {
        const name = window.prompt('Name of the new group');
        if (!name || !name.trim()) return;
        try {
            const group = await createGroup(name.trim());
            showToast(`Created "${group.name}". Invite members from Manage group.`, 'success');
            openLibrary(group.id);
        } catch (error) {
            showToast(`Could not create the group: ${error.message}`, 'error', { duration: 6000 });
        }
        return;
    }

    if (event.target.closest('a')) switcher.open = false;
}

let listening = false;

/**
 * Renders the switcher. If the open group is no longer one of the user's
 * (removed, left, deleted), returns to the personal library.
 */
export async function renderLibrarySwitcher() {
    if (!isAuthenticated() || !isCloudSyncEnabled()) return;
    let data;
    try {
        data = await listGroups();
    } catch (error) {
        console.warn('[Library switcher] Could not load groups:', error.message);
        return;
    }

    const here = currentGroupId();
    if (here !== null && !data.groups.some((g) => g.id === here)) {
        showToast('You are no longer a member of that group. Showing your library.', 'warning', { duration: 6000 });
        openLibrary('personal');
        return;
    }

    for (const id of CONTAINERS) {
        const container = document.getElementById(id);
        if (container) container.innerHTML = switcherHtml(data, here);
    }
    // The bell lists the same invites
    window.dispatchEvent(new CustomEvent(GROUPS_LOADED, { detail: data }));
    if (!listening) {
        document.addEventListener('click', onClick);
        listening = true;
    }
}
