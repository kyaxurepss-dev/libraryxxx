import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { writeFileSync, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const brainDir = 'C:\\Users\\darir\\.gemini\\antigravity\\brain\\123cc4d6-e2f8-4641-98b3-17b715e4a368';
const buildDir = path.join(__dirname, 'build');

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

async function main() {
    console.log('Regenerating BMP files...');

    // 1. Convert sidebar PNG to BMP (164x314)
    const sidebarSrc = path.join(brainDir, 'installer_sidebar_1773158132754.png');
    const sidebarData = await sharp(sidebarSrc)
        .resize(164, 314, { fit: 'cover' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const sidebarBmp = createBMP(sidebarData.data, sidebarData.info.width, sidebarData.info.height);
    writeFileSync(path.join(buildDir, 'installerSidebar.bmp'), sidebarBmp);
    console.log('Created installerSidebar.bmp (24-bit BMP array)');

    // 2. Convert header PNG to BMP (150x57)
    const headerSrc = path.join(brainDir, 'installer_header_1773158150599.png');
    const headerData = await sharp(headerSrc)
        .resize(150, 57, { fit: 'cover' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const headerBmp = createBMP(headerData.data, headerData.info.width, headerData.info.height);
    writeFileSync(path.join(buildDir, 'installerHeader.bmp'), headerBmp);
    console.log('Created installerHeader.bmp (24-bit BMP array)');

    console.log('BMP assets fixed successfully!');
}

main().catch(err => { console.error(err); process.exit(1); });
