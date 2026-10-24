// Build a review-only production candidate from the verified DEV manager.
// Never deploy this artifact without backend production readiness approval.
import fs from 'node:fs';
const source=fs.readFileSync('torn-utilities/core/pda/torn-utilities.user.js','utf8');
const start=source.indexOf("      if(settingsPage==='diagnostics'){");
const end=source.indexOf("      if(settingsPage==='time'){",start);
if(start<0||end<0||end<=start)throw Error('Diagnostic section boundaries changed; aborting');
let output=source.slice(0,start)+source.slice(end);
output=output.replace("          ['diagnostics','Diagnostics','Manager and module diagnostic information']","          // DEV diagnostics intentionally omitted");
output=output.replace("content.append(makeButton('Module diagnostics',()=>{diagnosticModule=m.id;settingsPage='diagnostics';render('settings')}));","");
// Refuse any DEV endpoint or session storage in a production candidate.
if(output.includes('tu-multiplayer-server-dev.tuserver.workers.dev'))throw Error('Production backend URL has not been integrated. Candidate blocked.');
if(output.includes('dev/agreement-lifecycle-integration'))throw Error('DEV update URL still present. Candidate blocked.');
fs.mkdirSync('dist',{recursive:true});
fs.writeFileSync('dist/torn-utilities.production.user.js',output);
