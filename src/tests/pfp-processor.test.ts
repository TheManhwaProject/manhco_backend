import { ProfilePictureProcessor } from '../services/ProfilePictureProcessor';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const processor = new ProfilePictureProcessor();
const TEST_IMAGES_DIR = path.join(__dirname, 'test-images'); // Adjust if your images are elsewhere
const OUTPUT_DIR = path.join(__dirname, 'processed-output');

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

async function testImage(imageFileName: string) {
  const imagePath = path.join(TEST_IMAGES_DIR, imageFileName);
  let inputBuffer: Buffer;

  try {
    inputBuffer = fs.readFileSync(imagePath);
  } catch (error) {
    console.error(`Error reading file ${imageFileName}:`, (error as Error).message);
    return;
  }

  console.log(`\n--- Testing: ${imageFileName} ---`);
  try {
    const processedBuffer = await processor.process(inputBuffer);
    const outputPath = path.join(OUTPUT_DIR, `processed_${imageFileName}`);
    fs.writeFileSync(outputPath, processedBuffer);
    console.log(`SUCCESS: ${imageFileName} processed and saved to ${outputPath}`);
    console.log(`  Output size: ${processedBuffer.length / 1024} KB`);

    // Optional: Verify output dimensions if you want to be extra thorough
    const outputImage = sharp(processedBuffer);
    const metadata = await outputImage.metadata();
    console.log(`  Output dimensions: ${metadata.width}x${metadata.height}`);
  } catch (error) {
    console.error(`FAILURE: ${imageFileName} -`, (error as Error).message);
  }
}

async function runTests() {
  // Test valid images
  await testImage('valid_small.png'); // 128x128
  await testImage('valid_large.jpg'); // => 2096x2096
  await testImage('valid_webp.webp'); // 

  // Test invalid images (expected to fail)
  await testImage('too_large.png'); // Create a large dummy file: head -c 4M /dev/urandom > test-images/too_large.png
  await testImage('unsupported.gif'); // Use any gif file
  await testImage('transparent.png'); // Create a PNG with partial transparency
  await testImage('too_small.jpg'); // Create a 100x100 jpg
  await testImage('dimensions_exceed_max.png'); // Create a 2500x2500 PNG
  await testImage('corrupted.jpg'); // Find or create a corrupted jpg
}

runTests();