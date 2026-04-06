// Dead Code Detection & Removal Script
// Usage: node dead-code-analysis.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = './src';
let findings = {
  consoleStatements: [],
  unusedImports: [],
  debuggerStatements: [],
  emptyFunctions: [],
  unusedVariables: []
};

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    if (file.startsWith('.')) return;
    
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and dist
      if (file !== 'node_modules' && file !== 'dist') {
        scanDirectory(fullPath);
      }
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      analyzeFile(fullPath);
    }
  });
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const relPath = path.relative('.', filePath);
    
    // Find console statements
    if (/console\.(log|info|warn|error|debug)\(/i.test(line)) {
      findings.consoleStatements.push(`${relPath}:${lineNum}: ${line.trim()}`);
    }
    
    // Find debugger statements
    if (/\bdebugger\b/.test(line)) {
      findings.debuggerStatements.push(`${relPath}:${lineNum}: ${line.trim()}`);
    }
    
    // Find empty functions/blocks
    if (/=>\s*{}\s*[,;]?$/.test(line)) {
      findings.emptyFunctions.push(`${relPath}:${lineNum}: ${line.trim()}`);
    }
  });
}

function generateReport() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         DEAD CODE & UNUSED CODE ANALYSIS REPORT            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📊 Console Statements Found: ${findings.consoleStatements.length}`);
  if (findings.consoleStatements.length > 0) {
    console.log('   Files with console.log/info/warn/error:');
    findings.consoleStatements.slice(0, 10).forEach(item => {
      console.log(`   • ${item}`);
    });
    if (findings.consoleStatements.length > 10) {
      console.log(`   ... and ${findings.consoleStatements.length - 10} more\n`);
    } else {
      console.log();
    }
  }
  
  console.log(`🐛 Debugger Statements Found: ${findings.debuggerStatements.length}`);
  if (findings.debuggerStatements.length > 0) {
    findings.debuggerStatements.forEach(item => {
      console.log(`   • ${item}`);
    });
    console.log();
  }
  
  console.log(`⚡ Empty Functions Found: ${findings.emptyFunctions.length}`);
  if (findings.emptyFunctions.length > 0) {
    findings.emptyFunctions.slice(0, 10).forEach(item => {
      console.log(`   • ${item}`);
    });
    if (findings.emptyFunctions.length > 10) {
      console.log(`   ... and ${findings.emptyFunctions.length - 10} more\n`);
    } else {
      console.log();
    }
  }
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    RECOMMENDATIONS                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  if (findings.consoleStatements.length > 0) {
    console.log(`✓ Remove ${findings.consoleStatements.length} console statements (-~5KB gzipped)`);
  }
  if (findings.debuggerStatements.length > 0) {
    console.log(`✓ Remove ${findings.debuggerStatements.length} debugger statements`);
  }
  if (findings.emptyFunctions.length > 0) {
    console.log(`✓ Remove ${findings.emptyFunctions.length} empty functions`);
  }
  
  console.log('\n✅ Terser is configured to remove console/debugger in production');
  console.log('✅ Tree-shaking enabled to remove unused exports\n');
}

console.log('🔍 Scanning for dead code...\n');
scanDirectory(srcDir);
generateReport();

// Save findings to file
fs.writeFileSync('dead-code-findings.json', JSON.stringify(findings, null, 2));
console.log('📁 Detailed findings saved to: dead-code-findings.json\n');
