// DEV-only diagnostic markers. Run against a production candidate before release.
// This script intentionally does not remove code: it fails closed.
import fs from 'node:fs';
const path=process.argv[2];
if(!path)throw Error('Usage: node scripts/check-tu-production.mjs <candidate.user.js>');
const code=fs.readFileSync(path,'utf8');
const forbidden=[
 'Test Development Authorization',
 'Test Agreement Cancellation Revocation',
 'Development Sessions',
 'Module diagnostics',
 "settingsPage==='diagnostics'",
 "['diagnostics','Diagnostics'",
 'devProbeAuthStatus(',
 'dev/agreement-lifecycle-integration'
];
const present=forbidden.filter(marker=>code.includes(marker));
if(present.length){
 console.error('PRODUCTION RELEASE BLOCKED: DEV diagnostics detected: '+present.join(', '));
 process.exitCode=1;
}else{
 console.log('PASS: No known DEV diagnostic markers in production candidate');
}
