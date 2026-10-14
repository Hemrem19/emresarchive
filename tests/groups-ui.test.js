import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config.js', async (importOriginal) => ({
    ...(await importOriginal()),
    isCloudSyncEnabled: vi.fn(() => true),
}));
vi.mock('../api/auth.js', () => ({
    isAuthenticated: vi.fn(() => true),
    getUser: vi.fn(() => ({ id: 1 })),
}));
vi.mock('../api/groups.js', () => ({
    listGroups: vi.fn(),
    createGroup: vi.fn(),
    copyPapers: vi.fn(),
    getGroup: vi.fn(),
    listMembers: vi.fn(),
    listInvites: vi.fn(),
    removeMember: vi.fn(async () => ({})),
    renameGroup: vi.fn(async () => ({})),
    cancelInvite: vi.fn(async () => ({})),
    deleteGroup: vi.fn(),
    setMemberRole: vi.fn(),
    inviteMember: vi.fn(),
    acceptInvite: vi.fn(),
    declineInvite: vi.fn(),
}));
vi.mock('../ui.js', async (importOriginal) => ({
    ...(await importOriginal()),
    showToast: vi.fn(),
}));
vi.mock('../core/library.js', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, openLibrary: vi.fn() };
});

const { switcherHtml, renderLibrarySwitcher } = await import('../components/librarySwitcher.js');
const { copyTargets, describeResults, openCopyDialog } = await import('../components/copyToLibrary.js');
const { memberRowHtml, groupPageView } = await import('../group.view.js');
const groupsApi = await import('../api/groups.js');
const { listGroups, copyPapers } = groupsApi;
const { openLibrary } = await import('../core/library.js');
const { showToast } = await import('../ui.js');

const GROUPS = [
    { id: 7, name: 'Lab <b>', role: 'owner', memberCount: 3 },
    { id: 9, name: 'Reading club', role: 'member', memberCount: 5 },
];
const setLibrary = (value) => (value ? localStorage.setItem('citavers:library', value) : localStorage.removeItem('citavers:library'));

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.body.innerHTML = '<div id="library-switcher"></div><div id="mobile-library-switcher"></div>';
});

describe('library switcher', () => {
    it('names the open library and lists every library with roles, escaped', () => {
        const html = switcherHtml({ groups: GROUPS, invites: [] }, 9);
        document.body.innerHTML = html;
        expect(document.querySelector('summary').textContent).toContain('Reading club');
        expect(document.querySelector('[aria-current="true"]').dataset.library).toBe('9');
        expect(document.querySelectorAll('[data-library]')).toHaveLength(3);
        expect(document.querySelector('a[href="#/group/9"]')).not.toBeNull();
        expect(document.querySelector('b')).toBeNull(); // the name was escaped, not parsed
        expect(document.body.textContent).toContain('Lab <b>');
    });

    it('shows My Library and a badge for pending invitations', () => {
        document.body.innerHTML = switcherHtml({ groups: [], invites: [{ id: 1 }, { id: 2 }] }, null);
        expect(document.querySelector('summary').textContent).toContain('My Library');
        expect(document.querySelector('a[href="#/invites"]')).not.toBeNull();
        expect(document.querySelector('[aria-label="2 pending invitations"]')).not.toBeNull();
        expect(document.querySelector('a[href^="#/group/"]')).toBeNull();
    });

    it('opens the chosen library', async () => {
        vi.mocked(listGroups).mockResolvedValue({ groups: GROUPS, invites: [] });
        await renderLibrarySwitcher();
        document.querySelector('#library-switcher [data-library="7"]').click();
        expect(openLibrary).toHaveBeenCalledWith(7);
    });

    it('returns to the personal library when the open group is gone', async () => {
        setLibrary('group:42');
        vi.mocked(listGroups).mockResolvedValue({ groups: GROUPS, invites: [] });
        await renderLibrarySwitcher();
        expect(openLibrary).toHaveBeenCalledWith('personal');
        expect(showToast).toHaveBeenCalledWith(expect.stringContaining('no longer a member'), 'warning', expect.anything());
    });
});

describe('copy to library', () => {
    it('offers every library except the open one', async () => {
        vi.mocked(listGroups).mockResolvedValue({ groups: GROUPS, invites: [] });
        expect((await copyTargets()).map((t) => t.value)).toEqual(['group:7', 'group:9']);

        setLibrary('group:7');
        expect((await copyTargets()).map((t) => t.value)).toEqual(['personal', 'group:9']);
    });

    it('summarises results, including PDFs left behind', () => {
        const text = describeResults([
            { success: true, pdfCopied: true },
            { success: true, pdfSkipped: 'Not enough cloud storage' },
            { success: false, error: 'Paper not found' },
        ], 'Lab');
        expect(text).toBe('Copied 2 papers to Lab. 1 PDF was not copied: Not enough cloud storage 1 could not be copied.');
    });

    it('copies the papers to the chosen library', async () => {
        vi.mocked(listGroups).mockResolvedValue({ groups: GROUPS, invites: [] });
        vi.mocked(copyPapers).mockResolvedValue([{ success: true, pdfCopied: true }]);
        await openCopyDialog([5]);

        document.querySelector('button[data-target="group:9"]').click();
        await new Promise((r) => setTimeout(r, 0));
        expect(copyPapers).toHaveBeenCalledWith([5], 'group:9');
        expect(showToast).toHaveBeenCalledWith('Copied 1 paper to Reading club.', 'success', expect.anything());
        expect(document.getElementById('copy-to-library-dialog')).toBeNull();
    });
});

describe('group page member rows', () => {
    const row = (member, myRole, me = 1) => {
        document.body.innerHTML = `<ul>${memberRowHtml(member, { me, myRole })}</ul>`;
        return {
            roleSelect: document.querySelector('select[data-role-for]'),
            remove: document.querySelector('[data-remove]'),
        };
    };

    it('lets the owner change roles and remove anyone but themself', () => {
        expect(row({ userId: 2, role: 'admin', email: 'a@x' }, 'owner')).toMatchObject({ roleSelect: expect.anything(), remove: expect.anything() });
        expect(row({ userId: 1, role: 'owner', email: 'me@x' }, 'owner')).toEqual({ roleSelect: null, remove: null });
    });

    it('lets admins remove members only, without changing roles', () => {
        expect(row({ userId: 3, role: 'member', email: 'm@x' }, 'admin')).toMatchObject({ roleSelect: null, remove: expect.anything() });
        expect(row({ userId: 2, role: 'admin', email: 'a@x' }, 'admin', 5)).toEqual({ roleSelect: null, remove: null });
    });

    it('gives members no controls', () => {
        expect(row({ userId: 3, role: 'member', email: 'm@x' }, 'member', 4)).toEqual({ roleSelect: null, remove: null });
    });
});

describe('group page actions', () => {
    const flush = () => new Promise((r) => setTimeout(r, 0));

    beforeEach(async () => {
        vi.mocked(groupsApi.getGroup).mockResolvedValue({ id: 7, name: 'Lab', role: 'owner', storage: { usedBytes: 0, limitBytes: 100 } });
        vi.mocked(groupsApi.listMembers).mockResolvedValue([
            { userId: 1, role: 'owner', email: 'me@x' },
            { userId: 3, role: 'member', email: 'm@x' },
        ]);
        vi.mocked(groupsApi.listInvites).mockResolvedValue([{ id: 11, email: 'new@x', role: 'member' }]);
        vi.stubGlobal('confirm', vi.fn(() => true));
        vi.stubGlobal('prompt', vi.fn(() => 'Lab 2'));
        document.body.innerHTML = '<div id="group-page"></div>';
        await groupPageView.mount(7);
    });

    it('removes a member when Remove is clicked and confirmed', async () => {
        document.querySelector('[data-remove="3"]').click();
        await flush();
        expect(groupsApi.removeMember).toHaveBeenCalledWith(7, 3);
    });

    it('renames and cancels invites from their buttons', async () => {
        document.querySelector('[data-rename]').click();
        await flush();
        expect(groupsApi.renameGroup).toHaveBeenCalledWith(7, 'Lab 2');

        document.querySelector('[data-cancel-invite="11"]').click();
        await flush();
        expect(groupsApi.cancelInvite).toHaveBeenCalledWith(7, 11);
    });

    it('sends invites from the form, not from the click handler', async () => {
        vi.mocked(groupsApi.inviteMember).mockResolvedValue({});
        const form = document.getElementById('group-invite-form');
        form.email.value = 'friend@x.dev';
        form.querySelector('[type="submit"]').click();
        await flush();
        expect(groupsApi.inviteMember).toHaveBeenCalledTimes(1);
        expect(groupsApi.inviteMember).toHaveBeenCalledWith(7, 'friend@x.dev', 'member');
    });
});
