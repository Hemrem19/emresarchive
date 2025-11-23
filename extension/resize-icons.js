import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.join(__dirname, 'icons');

// Read the source image (assuming icon128.png is the largest original)
const sourceIcon = path.join(iconsDir, 'icon128.png');

async function resizeIcons() {
    console.log('Resizing icons...');

    const sizes = [16, 48, 128];

    for (const size of sizes) {
        const outputPath = path.join(iconsDir, `icon${size}.png`);
        await sharp(sourceIcon)
            .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .toFile(outputPath + '.tmp');

        // Replace original
        fs.renameSync(outputPath + '.tmp', outputPath);
        console.log(`Created icon${size}.png (${size}x${size})`);
    }

    console.log('Icons resized successfully!');
}

resizeIcons().catch(console.error);
