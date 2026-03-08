#!/usr/bin/env node

const { execSync } = require('child_process');

function checkJavaVersion() {
  try {
    // Get Java version
    const javaVersionOutput = execSync('java -version 2>&1', { encoding: 'utf-8' });

    // Parse version from output (handles both Oracle and OpenJDK formats)
    // Example outputs:
    // openjdk version "17.0.1" 2021-10-19
    // java version "17.0.1" 2021-10-19 LTS
    const versionMatch = javaVersionOutput.match(/version "(\d+)\.(\d+)\.(\d+)/);

    if (!versionMatch) {
      console.warn('\n⚠️  WARNING: Could not parse Java version from output:');
      console.warn(javaVersionOutput);
      console.warn('Please ensure Java 17 is installed for Android builds.\n');
      return;
    }

    const majorVersion = parseInt(versionMatch[1], 10);

    if (majorVersion === 17) {
      console.log('✅ Java version check passed: Java 17 detected');
    } else {
      console.error('\n❌ ERROR: Java version mismatch!');
      console.error(`   Found: Java ${majorVersion}`);
      console.error('   Required: Java 17');
      console.error('\nThis project requires Java 17 for Android builds.');
      console.error('Please install Java 17 and set it as your active Java version.\n');
      console.error('Download Java 17:');
      console.error('  • Homebrew: brew install openjdk@17');
      console.error('  • Or visit: https://adoptium.net/\n');
      process.exit(1);
    }
  } catch (error) {
    console.warn('\n⚠️  WARNING: Could not detect Java installation');
    console.warn('Java is required for Android builds.');
    console.warn('Please install Java 17: https://adoptium.net/\n');
    console.warn(`Error: ${error.message}\n`);
    // Don't exit with error - user might only be doing iOS development
  }
}

checkJavaVersion();
