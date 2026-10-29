/**
 * Tests for api/network.js - Network API Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as networkApi from '../api/network.js';
import * as utilsApi from '../api/utils.js';

const apiRequest = vi.fn(async () => ({ ok: true, status: 200 }));
vi.mock('../api/sync.js', () => ({ apiRequest: (...a) => apiRequest(...a) }));

vi.mock('../api/utils.js', () => ({
    parseJsonResponse: vi.fn(),
    withRateLimitCheck: vi.fn((fn) => fn())
}));

vi.mock('../config.js', () => ({
    API_CONFIG: {
        BASE_URL: 'https://api.example.com'
    }
}));

describe('api/network.js - Network API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe.each([
        ['generateNetwork', [], 'https://api.example.com/api/networks/auto-generate', 'POST', 'Failed to generate network'],
        ['getNetwork', ['net-1'], 'https://api.example.com/api/networks/net-1', undefined, 'Failed to fetch network'],
        ['getUserNetworks', [], 'https://api.example.com/api/networks', undefined, 'Failed to fetch networks'],
    ])('%s', (name, args, url, method, failure) => {
        it('requests it through apiRequest, which names the open library', async () => {
            utilsApi.parseJsonResponse.mockResolvedValueOnce({ success: true, data: { ok: 1 } });

            const result = await networkApi[name](...args);

            expect(apiRequest).toHaveBeenCalledWith(url, expect.objectContaining({ credentials: 'include' }));
            expect(apiRequest.mock.calls[0][1].method).toBe(method);
            expect(result).toEqual({ ok: 1 });
        });

        it('throws the server\'s message, or a default one', async () => {
            utilsApi.parseJsonResponse.mockResolvedValueOnce({ success: false, error: { message: 'Library not found' } });
            await expect(networkApi[name](...args)).rejects.toThrow('Library not found');

            utilsApi.parseJsonResponse.mockResolvedValueOnce({ success: false });
            await expect(networkApi[name](...args)).rejects.toThrow(failure);
        });

        it('passes on request failures, inside the rate-limit check', async () => {
            apiRequest.mockRejectedValueOnce(new Error('Not authenticated'));
            await expect(networkApi[name](...args)).rejects.toThrow('Not authenticated');
            expect(utilsApi.withRateLimitCheck).toHaveBeenCalled();
        });
    });

    describe('getPaperConnections', () => {
        it('returns the connections', async () => {
            utilsApi.parseJsonResponse.mockResolvedValueOnce({ success: true, data: { connections: [{ paper: { id: 2 } }] } });
            expect(await networkApi.getPaperConnections(7)).toEqual([{ paper: { id: 2 } }]);
            expect(apiRequest).toHaveBeenCalledWith('https://api.example.com/api/networks/papers/7/connections', { credentials: 'include' });
        });
    });
});
