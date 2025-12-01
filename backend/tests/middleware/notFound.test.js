/**
 * Unit Tests for 404 Not Found Middleware
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { notFound } from '../../src/middleware/notFound.js';
import { mockRequest, mockResponse, mockNext } from '../helpers.js';

describe('Not Found Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = mockRequest();
        res = mockResponse();
        next = mockNext();
    });

    describe('notFound', () => {
        it('should return 404 status', () => {
            req.method = 'GET';
            req.originalUrl = '/api/nonexistent';

            notFound(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should return error message with route info', () => {
            req.method = 'GET';
            req.originalUrl = '/api/nonexistent';

            notFound(req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    message: 'Route GET /api/nonexistent not found'
                }
            });
        });

        it('should handle POST requests', () => {
            req.method = 'POST';
            req.originalUrl = '/api/unknown';

            notFound(req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    message: 'Route POST /api/unknown not found'
                }
            });
        });

        it('should handle PUT requests', () => {
            req.method = 'PUT';
            req.originalUrl = '/api/update/123';

            notFound(req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    message: 'Route PUT /api/update/123 not found'
                }
            });
        });

        it('should handle DELETE requests', () => {
            req.method = 'DELETE';
            req.originalUrl = '/api/delete/123';

            notFound(req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    message: 'Route DELETE /api/delete/123 not found'
                }
            });
        });

        it('should handle routes with query parameters', () => {
            req.method = 'GET';
            req.originalUrl = '/api/search?q=test&status=active';

            notFound(req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    message: 'Route GET /api/search?q=test&status=active not found'
                }
            });
        });

        it('should not call next middleware', () => {
            req.method = 'GET';
            req.originalUrl = '/api/nonexistent';

            notFound(req, res, next);

            expect(next).not.toHaveBeenCalled();
        });

        it('should set success to false', () => {
            req.method = 'GET';
            req.originalUrl = '/api/test';

            notFound(req, res, next);

            const jsonCall = res.json.mock.calls[0][0];
            expect(jsonCall.success).toBe(false);
        });
    });
});
