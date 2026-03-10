import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { writeFileSync, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const brainDir = 'C:\\Users\\darir\\.gemini\\antigravity\\brain\\123cc4d6-e2f8-4641-98b3-17b715e4a368';
const buildDir = path.join(__dirname, 'build');

async function main() {
    // 1. Convert icon PNG to ICO (multi-size)
    const iconSrc = path.join(brainDir, 'app_icon_1773158115812.png');

    const sizes = [256, 128, 64, 48, 32, 16];
    const tempPngPaths = [];

    for (const size of sizes) {
        const tmpPath = path.join(buildDir, `icon_${size}.png`);
        await sharp(iconSrc)
            .resize(size, size, { fit: 'contain', background: { r: 10, g: 10, b: 15, alpha: 1 } })
            .png()
            .toFile(tmpPath);
        tempPngPaths.push(tmpPath);
    }

    // Convert to ICO
    const icoBuffer = await pngToIco(tempPngPaths);
    writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);
    console.log('Created icon.ico');

    // Also keep a 256px PNG as icon.png
    await sharp(iconSrc)
        .resize(256, 256, { fit: 'contain', background: { r: 10, g: 10, b: 15, alpha: 1 } })
        .png()
        .toFile(path.join(buildDir, 'icon.png'));
    console.log('Created icon.png');

    // Clean up temp PNGs
    for (const p of tempPngPaths) {
        try { unlinkSync(p); } catch { }
    }

    // 2. Convert sidebar PNG to BMP (164x314)
    const sidebarSrc = path.join(brainDir, 'installer_sidebar_1773158132754.png');
    // sharp doesn't support BMP natively, so we'll create raw pixel data approach
    // Actually, let's check if sharp supports BMP output
    try {
        await sharp(sidebarSrc)
            .resize(164, 314, { fit: 'cover' })
            .toFile(path.join(buildDir, 'installerSidebar.bmp'));
        console.log('Created installerSidebar.bmp (via sharp)');
    } catch (e) {
        console.log('Sharp BMP failed, creating raw BMP manually...');
        // Create raw BMP manually from pixel data
        const rawData = await sharp(sidebarSrc)
            .resize(164, 314, { fit: 'cover' })
            .removeAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const bmpBuffer = createBMP(rawData.data, rawData.info.width, rawData.info.height);
        writeFileSync(path.join(buildDir, 'installerSidebar.bmp'), bmpBuffer);
        console.log('Created installerSidebar.bmp (manual)');
    }

    // 3. Convert header PNG to BMP (150x57)
    const headerSrc = path.join(brainDir, 'installer_header_1773158150599.png');
    try {
        await sharp(headerSrc)
            .resize(150, 57, { fit: 'cover' })
            .toFile(path.join(buildDir, 'installerHeader.bmp'));
        console.log('Created installerHeader.bmp (via sharp)');
    } catch (e) {
        console.log('Sharp BMP failed, creating raw BMP manually...');
        const rawData = await sharp(headerSrc)
            .resize(150, 57, { fit: 'cover' })
            .removeAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const bmpBuffer = createBMP(rawData.data, rawData.info.width, rawData.info.height);
        writeFileSync(path.join(buildDir, 'installerHeader.bmp'), bmpBuffer);
        console.log('Created installerHeader.bmp (manual)');
    }

    console.log('All assets converted successfully!');
}

// Create a 24-bit BMP from raw RGB pixel data
function createBMP(rgbData, width, height) {
    const rowSize = Math.ceil((width * 3) / 4) * 4; // rows must be 4-byte aligned  
    const pixelDataSize = rowSize * height;
    const headerSize = 54; // 14 (file header) + 40 (DIB header)
    const fileSize = headerSize + pixelDataSize;

    const buf = Buffer.alloc(fileSize);

    // BMP File Header (14 bytes)
    buf.write('BM', 0);                    // signature
    buf.writeUInt32LE(fileSize, 2);         // file size
    buf.writeUInt32LE(0, 6);                // reserved
    buf.writeUInt32LE(headerSize, 10);      // pixel data offset

    // DIB Header (BITMAPINFOHEADER, 40 bytes)
    buf.writeUInt32LE(40, 14);              // header size
    buf.writeInt32LE(width, 18);            // width
    buf.writeInt32LE(height, 22);           // height (positive = bottom-up)
    buf.writeUInt16LE(1, 26);              // color planes
    buf.writeUInt16LE(24, 28);             // bits per pixel
    buf.writeUInt32LE(0, 30);              // compression (none)
    buf.writeUInt32LE(pixelDataSize, 34);  // image size
    buf.writeInt32LE(2835, 38);            // horizontal resolution (72 DPI)
    buf.writeInt32LE(2835, 42);            // vertical resolution (72 DPI)
    buf.writeUInt32LE(0, 46);              // colors in palette
    buf.writeUInt32LE(0, 50);              // important colors

    // Pixel data (BMP stores bottom-up, BGR order)
    for (let y = 0; y < height; y++) {
        const srcRow = (height - 1 - y); // flip vertically
        for (let x = 0; x < width; x++) {
            const srcIdx = (srcRow * width + x) * 3;
            const dstIdx = headerSize + y * rowSize + x * 3;
            buf[dstIdx] = rgbData[srcIdx + 2];     // B
            buf[dstIdx + 1] = rgbData[srcIdx + 1]; // G  
            buf[dstIdx + 2] = rgbData[srcIdx];     // R
        }
    }

    return buf;
}

main().catch(err => { console.error(err); process.exit(1); });
