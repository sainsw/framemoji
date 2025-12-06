#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { fetchAndProcessAvatar, writeOutputs } = require("avatar-fetcher");

const GITHUB_USERNAME = "sainsw";
const OUTPUT_DIR = path.join(__dirname, "..", "public", "images");
const VERSION_FILE_PATH = path.join(__dirname, "..", "src", "lib", "assets.ts");

const ensureOutputDir = () => {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
};

const updateVersionFile = (avatarHash) => {
  try {
    let versionContent = "";
    if (fs.existsSync(VERSION_FILE_PATH)) {
      versionContent = fs.readFileSync(VERSION_FILE_PATH, "utf8");
    }
    if (versionContent.includes("AVATAR_VERSION")) {
      versionContent = versionContent.replace(/AVATAR_VERSION = ['\"]([^'\"]+)['\"];/, `AVATAR_VERSION = '${avatarHash}';`);
    } else {
      if (versionContent.trim().length > 0) {
        versionContent += "\n";
      }
      versionContent += `export const AVATAR_VERSION = '${avatarHash}';\n`;
    }
    fs.writeFileSync(VERSION_FILE_PATH, versionContent);
    console.log(`✅ Avatar version updated: ${avatarHash}`);
  } catch (error) {
    console.log(`⚠️  Failed to update version file: ${error.message}`);
  }
};

const getExistingAvatarHash = () => {
  if (!fs.existsSync(OUTPUT_DIR)) return null;
  const files = fs.readdirSync(OUTPUT_DIR);
  const avatarFiles = files.filter(
    (file) => file.startsWith("avatar-") && (file.endsWith(".jpg") || file.endsWith(".webp")),
  );
  const preferred = avatarFiles.find((f) => f.endsWith(".jpg")) || avatarFiles[0];
  if (!preferred) return null;
  const match = preferred.match(/avatar-([^.]+)\./);
  return match ? match[1] : null;
};

async function fetchGitHubAvatar() {
  ensureOutputDir();
  try {
    console.log(`📡 Fetching avatar for: ${GITHUB_USERNAME}`);
    const result = await fetchAndProcessAvatar({
      username: GITHUB_USERNAME,
      size: 400,
      outputs: [
        { format: "webp", width: 200, height: 200, quality: 85 },
        { format: "jpeg", width: 200, height: 200, quality: 90 },
      ],
      baseName: "avatar",
    });

    await writeOutputs(result.outputs, OUTPUT_DIR);
    await updateVersionFile(result.hash);
    console.log(`🎉 Avatar updated (hash: ${result.hash})`);
  } catch (error) {
    console.log("ℹ️  Avatar fetch failed, using existing files");
    console.log(`   Reason: ${error.message}`);

    const existingHash = getExistingAvatarHash();
    if (existingHash) {
      console.log(`📁 Using existing avatar files (hash: ${existingHash})`);
      await updateVersionFile(existingHash);
    } else {
      console.error("💥 No avatar files found! Please ensure avatar files exist in public/images/");
      process.exit(1);
    }
  }
}

fetchGitHubAvatar();
