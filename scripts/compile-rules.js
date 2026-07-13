import fs from 'fs';
import path from 'path';

function compileRules() {
  const rulesDir = path.join(process.cwd(), 'rules');
  const outputFile = path.join(process.cwd(), 'firestore.rules');

  const files = [
    'helpers.rules',
    'users.rules',
    'pre_users.rules',
    'wallet.rules',
    'booking.rules',
    'tracker.rules',
    'master.rules',
    'notification.rules',
    'storage.rules'
  ];

  let rulesContent = `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n`;

  for (const file of files) {
    const filePath = path.join(rulesDir, file);
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const indentedContent = fileContent
        .split('\n')
        .map(line => '    ' + line)
        .join('\n');
      
      rulesContent += `\n    // ===============================================================\n`;
      rulesContent += `    // FROM FILE: ${file}\n`;
      rulesContent += `    // ===============================================================\n`;
      rulesContent += indentedContent + '\n';
    } else {
      console.warn(`Rules file not found: ${file}`);
    }
  }

  rulesContent += `  }\n}\n`;

  fs.writeFileSync(outputFile, rulesContent, 'utf8');
  console.log('Successfully compiled firestore.rules from /rules/!');
}

compileRules();
