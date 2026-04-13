const http = require('http');
const fs = require('fs');
const path = require('path');

http.createServer((req, res) => {
    // Strip query strings and hash
    let urlPath = req.url.split('?')[0].split('#')[0];
    let filePath = path.join(__dirname, urlPath === '/' ? 'index.html' : urlPath);

    fs.readFile(filePath, (err, data) => {
        if (err) {
            // Fallback to index.html for SPA routing
            fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
                if (err) {
                    res.writeHead(404);
                    res.end('Not found');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            });
            return;
        }

        let contentType = 'text/plain';
        if (filePath.endsWith('.html')) contentType = 'text/html';
        else if (filePath.endsWith('.js')) contentType = 'text/javascript';
        else if (filePath.endsWith('.css')) contentType = 'text/css';
        else if (filePath.endsWith('.json')) contentType = 'application/json';
        else if (filePath.endsWith('.png')) contentType = 'image/png';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}).listen(8081, () => console.log('Server running on 8081'));
