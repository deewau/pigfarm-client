import { convert } from 'tgs2lottie';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const giftsDir = path.join(__dirname, 'assets', 'gifts');
const files = fs.readdirSync(giftsDir);

const tgsFiles = files.filter(f => f.endsWith('.tgs'));

console.log('Found TGS files:', tgsFiles);

for (const tgsFile of tgsFiles) {
  const tgsPath = path.join(giftsDir, tgsFile);
  const jsonName = tgsFile.replace('.tgs', '.json');
  const jsonPath = path.join(giftsDir, jsonName);

  if (fs.existsSync(jsonPath)) {
    console.log(`Skipping ${tgsFile} - JSON already exists`);
    continue;
  }

  try {
    const tgsBuffer = fs.readFileSync(tgsPath);
    const lottieJson = convert(tgsBuffer);

    fs.writeFileSync(jsonPath, lottieJson);
    console.log(`Converted: ${tgsFile} -> ${jsonName}`);
  } catch (error) {
    console.error(`Error converting ${tgsFile}:`, error.message);
  }
}

console.log('Done!');
