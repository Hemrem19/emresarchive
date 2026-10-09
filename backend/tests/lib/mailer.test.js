import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateVerificationToken, sendVerificationEmail } from '../../src/lib/mailer.js';

const fetchMock = vi.fn();

describe('mailer', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', fetchMock);
        fetchMock.mockReset();
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('generates 64-char hex tokens', () => {
        const token = generateVerificationToken();
        expect(token).toMatch(/^[0-9a-f]{64}$/);
        expect(generateVerificationToken()).not.toBe(token);
    });

    it('only logs when RESEND_API_KEY is missing', async () => {
        const result = await sendVerificationEmail({}, { email: 'a@b.c', token: 't' });
        expect(result).toEqual({ sent: false });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sends through Resend with the verification link', async () => {
        fetchMock.mockResolvedValue({ ok: true, status: 200 });
        const env = { RESEND_API_KEY: 'key', EMAIL_FROM: 'noreply@citavers.com', FRONTEND_URL: 'https://citavers.com/' };

        const result = await sendVerificationEmail(env, { email: 'a@b.c', token: 'abc', name: 'Ada' });

        expect(result).toEqual({ sent: true });
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('https://api.resend.com/emails');
        expect(init.headers.Authorization).toBe('Bearer key');
        const body = JSON.parse(init.body);
        expect(body.from).toBe('Citavers <noreply@citavers.com>');
        expect(body.to).toBe('a@b.c');
        expect(body.text).toContain('https://citavers.com/#/verify-email?token=abc');
    });

    it('throws when Resend rejects', async () => {
        fetchMock.mockResolvedValue({ ok: false, status: 422, text: async () => 'bad from' });
        await expect(sendVerificationEmail({ RESEND_API_KEY: 'k' }, { email: 'a@b.c', token: 't' }))
            .rejects.toThrow('Resend API error 422');
    });
});
