/**
 * Middleware to handle BigInt serialization in JSON responses
 * Prisma returns BigInt for large integers, which JSON.stringify cannot handle by default.
 */
export const bigIntJson = (req, res, next) => {
    const originalJson = res.json;
    res.json = function (data) {
        const jsonString = JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        );
        res.setHeader('Content-Type', 'application/json');
        res.send(jsonString);
    };
    next();
};
