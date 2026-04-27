import { convert } from 'tgs2lottie';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function convertTgsFolder(folderPath) {
  if (!fs.existsSync(folderPath)) {
    console.log(`Folder not found: ${folderPath}`);
    return;
  }

  const files = fs.readdirSync(folderPath);
  const tgsFiles = files.filter(f => f.endsWith('.tgs'));

  console.log(`Found TGS files in ${folderPath}:`, tgsFiles);

  for (const tgsFile of tgsFiles) {
    const tgsPath = path.join(folderPath, tgsFile);
    const jsonName = tgsFile.replace('.tgs', '.json');
    const jsonPath = path.join(folderPath, jsonName);

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
}

const giftsDir = path.join(__dirname, 'assets', 'gifts');
const gifts50Dir = path.join(__dirname, 'assets', 'gifts50');

convertTgsFolder(giftsDir);
convertTgsFolder(gifts50Dir);

console.log('Done!');