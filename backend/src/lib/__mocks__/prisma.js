import { vi } from 'vitest';

export const prisma = {
    user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    session: {
        create: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn(),
        delete: vi.fn().mockResolvedValue({}),
    },
    paper: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        deleteMany: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
    },
    userStorage: {
        update: vi.fn(),
    },
    citationCache: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
    },
    paperConnection: {
        createMany: vi.fn(),
        findMany: vi.fn(),
    },
    networkGraph: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
    },
    collection: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        deleteMany: vi.fn(),
    },
    annotation: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        deleteMany: vi.fn(),
    },
    syncLog: {
        create: vi.fn(),
        findFirst: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
};
