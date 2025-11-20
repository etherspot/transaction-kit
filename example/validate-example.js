// Simple validation script to demonstrate the example structure
const fs = require('fs');
const path = require('path');

console.log('✓ Validating signMessage-example.ts structure...\n');

const exampleFile = path.join(__dirname, 'src', 'signMessage-example.ts');
const content = fs.readFileSync(exampleFile, 'utf8');

// Check for key components
const checks = [
  { name: 'EIP-6492 format verification function', pattern: /function verifyEIP6492Format/ },
  { name: 'Signature component extraction', pattern: /function extractSignatureComponents/ },
  { name: 'Example 1: Non-Delegated EOA', pattern: /async function example1_NonDelegatedEOA/ },
  { name: 'Example 2: Delegated EOA', pattern: /async function example2_DelegatedEOA/ },
  { name: 'Example 3: Compare Signatures', pattern: /async function example3_CompareSignatures/ },
  { name: 'Example 4: Different Message Types', pattern: /async function example4_DifferentMessageTypes/ },
  { name: 'Main function', pattern: /async function main/ },
  { name: 'TransactionKit import', pattern: /import.*TransactionKit.*from.*@etherspot\/transaction-kit/ },
  { name: 'signMessage usage', pattern: /signMessage\(/ },
  { name: 'EIP-6492 magic prefix check', pattern: /0x6492/ },
];

let passed = 0;
let failed = 0;

checks.forEach(check => {
  if (check.pattern.test(content)) {
    console.log(`✓ ${check.name}`);
    passed++;
  } else {
    console.log(`✗ ${check.name}`);
    failed++;
  }
});

console.log(`\n${'='.repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(60)}\n`);

if (failed === 0) {
  console.log('✅ All structure checks passed!');
  console.log('\nThe example file is properly structured and ready to use.');
  console.log('\nTo run the example:');
  console.log('  1. Install dependencies: npm install');
  console.log('  2. Set up .env file with your configuration');
  console.log('  3. Run: npx ts-node src/signMessage-example.ts\n');
  process.exit(0);
} else {
  console.log('❌ Some checks failed. Please review the example file.');
  process.exit(1);
}
