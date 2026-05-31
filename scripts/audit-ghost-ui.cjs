#!/usr/bin/env node

/**
 * Ghost UI Audit Script
 * 
 * This script identifies potential dead UI elements in the codebase.
 * It searches for interactive elements that may not have proper handlers.
 * 
 * Usage: npm run audit:ghost
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

// Configuration
const CONFIG = {
  // File patterns to scan
  filePatterns: [
    '**/*.tsx',
    '**/*.jsx',
    '**/*.vue',
    '**/*.svelte'
  ],
  
  // Interactive element patterns to detect
  patterns: {
    // onClick handlers that are empty or undefined
    emptyOnClick: [
      /onClick=\{\(\) => \{\}\}/g,
      /onClick=\{\(\) => \{\s*\}\}/g,
      /onClick=\{\(\) => undefined\}/g,
      /onClick=\{\(\) => null\}/g,
      /onClick=\{\(\) => void 0\}/g,
    ],
    
    // Common interactive elements without handlers
    interactiveWithoutHandlers: [
      /<button(?![^>]*onClick)/g,
      /<a(?![^>]*onClick)(?![^>]*href)/g,
      /<input(?![^>]*onClick)(?![^>]*onChange)/g,
      /<select(?![^>]*onClick)(?![^>]*onChange)/g,
      /<textarea(?![^>]*onClick)(?![^>]*onChange)/g,
    ],
    
    // Incomplete-task comments indicating unfinished implementation
    incompleteMarkers: [
      /\/\/\s*(TODO|FIXME|HACK|XXX|NOT_IMPLEMENTED)/gi,
      /\/\*\s*(TODO|FIXME|HACK|XXX|NOT_IMPLEMENTED)/gi,
      /<!--\s*(TODO|FIXME|HACK|XXX|NOT_IMPLEMENTED)/gi,
    ],
    
    // Placeholder text indicating incomplete features
    placeholderText: [
      /placeholder\s*=\s*["'].*["']/gi,
      /"Click me"/gi,
      /"Button"/gi,
      /"Link"/gi,
      /"Action"/gi,
      /"Submit"/gi,
      /"Save"/gi,
    ]
  },
  
  // Directories to exclude from scanning
  excludeDirs: [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.next',
    '.vite',
    '.svelte-kit'
  ]
};

class GhostUIAuditor {
  constructor() {
    this.results = {
      filesScanned: 0,
      issuesFound: 0,
      criticalIssues: [],
      warnings: [],
      suggestions: []
    };
  }

  /**
   * Main execution method
   */
  async run() {
    console.log('🔍 Starting Ghost UI Audit...\n');
    
    try {
      const files = this.getFilesToScan();
      console.log(`📁 Found ${files.length} files to scan\n`);
      
      for (const filePath of files) {
        this.scanFile(filePath);
      }
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Audit failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Get all files that match our patterns
   */
  getFilesToScan() {
    if (this.isRipgrepAvailable()) {
      const rgCommand = 'rg -l --type tsx --type jsx --type vue --type svelte .';
      const output = execSync(rgCommand, { encoding: 'utf8', cwd: process.cwd() });
      return output.trim().split('\n').filter(Boolean);
    }

    return this.findFilesRecursively(process.cwd(), CONFIG.filePatterns);
  }

  /**
   * Check whether ripgrep can be used for fast project scans.
   */
  isRipgrepAvailable() {
    try {
      execSync('rg --version', { encoding: 'utf8', stdio: 'ignore' });
      return true;
    } catch (error) {
      console.warn(`⚠️  ripgrep unavailable; using recursive scan fallback: ${error.message}`);
      return false;
    }
  }

  /**
   * Recursively find files matching patterns
   */
  findFilesRecursively(dir, patterns) {
    const files = [];
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // Skip excluded directories
        if (entry.isDirectory() && CONFIG.excludeDirs.includes(entry.name)) {
          continue;
        }
        
        if (entry.isDirectory()) {
          files.push(...this.findFilesRecursively(fullPath, patterns));
        } else {
          // Check if file matches any pattern
          const relativePath = path.relative(process.cwd(), fullPath);
          if (this.matchesPattern(relativePath, patterns)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  Skipping unreadable directory ${dir}: ${error.message}`);
    }
    
    return files;
  }

  /**
   * Check if file path matches any pattern
   */
  matchesPattern(filePath, patterns) {
    return patterns.some(pattern => new RegExp(pattern.replaceAll('**', '.*')).test(filePath));
  }

  /**
   * Scan a single file for ghost UI issues
   */
  scanFile(filePath) {
    this.results.filesScanned++;
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Check for empty onClick handlers
      this.checkEmptyOnClick(filePath, lines);
      
      // Check for interactive elements without handlers
      this.checkInteractiveWithoutHandlers(filePath, lines);
      
      // Check for incomplete markers
      this.checkIncompleteMarkers(filePath, lines);
      
      // Check for placeholder text
      this.checkPlaceholderText(filePath, lines);
      
    } catch (error) {
      console.warn(`⚠️  Skipping unreadable file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Check for empty onClick handlers
   */
  checkEmptyOnClick(filePath, lines) {
    lines.forEach((line, lineNumber) => {
      CONFIG.patterns.emptyOnClick.forEach(pattern => {
        if (pattern.test(line)) {
          this.addIssue(filePath, lineNumber + 1, 'CRITICAL', 'Empty onClick handler detected', line.trim());
        }
      });
    });
  }

  /**
   * Check for interactive elements without handlers
   */
  checkInteractiveWithoutHandlers(filePath, lines) {
    lines.forEach((line, lineNumber) => {
      CONFIG.patterns.interactiveWithoutHandlers.forEach(pattern => {
        if (pattern.test(line)) {
          this.addIssue(filePath, lineNumber + 1, 'WARNING', 'Interactive element without handler', line.trim());
        }
      });
    });
  }

  /**
   * Check for incomplete markers
   */
  checkIncompleteMarkers(filePath, lines) {
    lines.forEach((line, lineNumber) => {
      CONFIG.patterns.incompleteMarkers.forEach(pattern => {
        const matches = line.match(pattern);
        if (matches) {
          this.addIssue(filePath, lineNumber + 1, 'WARNING', `Incomplete implementation marker: ${matches[0]}`, line.trim());
        }
      });
    });
  }

  /**
   * Check for placeholder text
   */
  checkPlaceholderText(filePath, lines) {
    lines.forEach((line, lineNumber) => {
      CONFIG.patterns.placeholderText.forEach(pattern => {
        if (pattern.test(line)) {
          this.addIssue(filePath, lineNumber + 1, 'SUGGESTION', 'Potential placeholder text', line.trim());
        }
      });
    });
  }

  /**
   * Add an issue to results
   */
  addIssue(filePath, lineNumber, severity, message, code) {
    const issue = {
      file: filePath,
      line: lineNumber,
      severity,
      message,
      code
    };
    
    this.results.issuesFound++;
    
    switch (severity) {
      case 'CRITICAL':
        this.results.criticalIssues.push(issue);
        break;
      case 'WARNING':
        this.results.warnings.push(issue);
        break;
      case 'SUGGESTION':
        this.results.suggestions.push(issue);
        break;
    }
  }

  /**
   * Generate and display audit report
   */
  generateReport() {
    console.log('\n📊 Audit Results:');
    console.log('='.repeat(50));
    
    console.log(`\n📁 Files Scanned: ${this.results.filesScanned}`);
    console.log(`🚨 Issues Found: ${this.results.issuesFound}`);
    
    if (this.results.criticalIssues.length > 0) {
      console.log(`\n🔴 Critical Issues (${this.results.criticalIssues.length}):`);
      this.results.criticalIssues.forEach(issue => {
        console.log(`  ${issue.file}:${issue.line} - ${issue.message}`);
        console.log(`    ${issue.code}`);
      });
    }
    
    if (this.results.warnings.length > 0) {
      console.log(`\n🟡 Warnings (${this.results.warnings.length}):`);
      this.results.warnings.slice(0, 10).forEach(issue => {
        console.log(`  ${issue.file}:${issue.line} - ${issue.message}`);
      });
      if (this.results.warnings.length > 10) {
        console.log(`  ... and ${this.results.warnings.length - 10} more`);
      }
    }
    
    if (this.results.suggestions.length > 0) {
      console.log(`\n💡 Suggestions (${this.results.suggestions.length}):`);
      this.results.suggestions.slice(0, 5).forEach(issue => {
        console.log(`  ${issue.file}:${issue.line} - ${issue.message}`);
      });
      if (this.results.suggestions.length > 5) {
        console.log(`  ... and ${this.results.suggestions.length - 5} more`);
      }
    }
    
    // Summary and recommendations
    console.log('\n' + '='.repeat(50));
    console.log('📋 Summary:');
    
    if (this.results.criticalIssues.length > 0) {
      console.log('❌ CRITICAL: Found empty onClick handlers. These will cause dead UI.');
      console.log('   Action required: Implement proper handlers or use LockedAction component.');
    }
    
    if (this.results.warnings.length > 0) {
      console.log('⚠️  WARNING: Found potential interactive elements without handlers.');
      console.log('   Review these elements to ensure they have proper functionality.');
    }
    
    if (this.results.suggestions.length > 0) {
      console.log('💡 TIP: Consider replacing placeholder text with real content.');
    }
    
    if (this.results.issuesFound === 0) {
      console.log('✅ No ghost UI issues detected!');
    }
    
    // Exit with appropriate code
    const exitCode = this.results.criticalIssues.length > 0 ? 1 : 0;
    console.log(`\n${exitCode === 0 ? '✅' : '❌'} Audit completed with exit code ${exitCode}`);
    process.exit(exitCode);
  }
}

// Run the audit
if (require.main === module) {
  const auditor = new GhostUIAuditor();
  auditor.run();
}

module.exports = GhostUIAuditor;