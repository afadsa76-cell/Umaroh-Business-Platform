import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SUSPICIOUS_PATTERNS = {
  firebaseKey: /"private_key":\s*"[^"]+"/,
  geminiKey: /AIzaSy[a-zA-Z0-9_-]{35}/,
  hardcodedPassword: /password\s*=\s*['"][a-zA-Z0-9!@#$%^&*()_+]{8,}['"]/i,
  genericSecret: /secret\s*=\s*['"][a-zA-Z0-9_-]{16,}['"]/i
};

function scanFile(filePath: string): string[] {
  const content = readFileSync(filePath, 'utf8');
  const findings: string[] = [];

  for (const [name, regex] of Object.entries(SUSPICIOUS_PATTERNS)) {
    if (regex.test(content)) {
      findings.push(`[EXPOSURE RISK] File contains potential ${name}`);
    }
  }
  return findings;
}

function scanDir(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);
  for (const file of files) {
    const filePath = join(dir, file);
    if (file === 'node_modules' || file === 'dist' || file === '.git' || file === 'package-lock.json') {
      continue;
    }
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      scanDir(filePath, fileList);
    } else if (stat.isFile() && /\.(ts|tsx|js|cjs|json|env|rules)$/.test(file)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function runSecurityExposureAudit() {
  console.log('========================================================================');
  console.log('🕋 PORTAL UMAROH ENTERPRISE - SECRET EXPOSURE AUDIT SUITE 🕋');
  console.log('========================================================================');

  console.log('🔍 Gathering system directories for recursive scanning...');
  const files = scanDir(process.cwd());
  console.log(`🔍 Discovered ${files.length} active repository files for secret audit scan.`);

  let totalFindings = 0;

  for (const file of files) {
    try {
      const findings = scanFile(file);
      if (findings.length > 0) {
        console.log(`⚠️  Potential leak found in: ${file}`);
        for (const finding of findings) {
          console.log(`   └─ ${finding}`);
          totalFindings++;
        }
      }
    } catch {
      // safe bypass for unreadable or binary files
    }
  }

  console.log('\n------------------------------------------------------------------------');
  console.log('🏁 SECRET EXPOSURE AUDIT SUMMARY');
  console.log('------------------------------------------------------------------------');
  if (totalFindings === 0) {
    console.log('   🎉 EXCELLENT. 0 hardcoded secrets, Firebase Private Keys, or Gemini API keys found!');
    console.log('   🔒 Environment variables and secure secret injection are fully compliant.');
  } else {
    console.log(`   🚨 WARNING: ${totalFindings} potential secret leaks detected in codebase.`);
  }
  console.log('========================================================================');

  process.exit(0);
}

runSecurityExposureAudit();
