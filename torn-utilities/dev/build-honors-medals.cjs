// Generate isolated DEV installers; canonical production URLs remain unchanged in source.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const destination=path.resolve(process.argv[2]||'/tmp/tu-honors-medals-dev');
if(destination===root||destination.startsWith(root+path.sep))throw Error('Choose an output directory outside the source tree');
fs.mkdirSync(destination,{recursive:true});
const branch='dev/honors-medals';
const base='https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/';
for(const platform of ['cross-platform','pda']){
 const relative=`core/${platform}/torn-utilities.user.js`;
 let text=fs.readFileSync(path.join(root,relative),'utf8');
 text=text.replace(/(@name\s+)(.*)/,'$1$2 — Honors & Medals DEV');
 // Disable automatic updates; a DEV install must never overwrite itself with production.
 text=text.replace(/^\/\/ @(?:updateURL|downloadURL).*\n/gm,'');
 // Pin the catalog to the DEV branch. Existing module install URLs still point at production.
 text=text.replace(`const REGISTRY_URL='${base}main/torn-utilities/modules.json'`,
   `const REGISTRY_URL='${base}${branch}/torn-utilities/modules.json'`);
 text=text.replaceAll('contents/torn-utilities/modules.json?ref=main&','contents/torn-utilities/modules.json?ref='+encodeURIComponent(branch)+'&');
 // Keep the production catalog URL validator: only the new module's canonical URL is
 // redirected when presenting its install link. Other modules keep their original URLs.
 const renderAt=text.indexOf('  function render(');
 if(renderAt<0)throw Error('Manager render entrypoint changed; review DEV generator');
 text=text.slice(0,renderAt)+text.slice(renderAt).replaceAll('m.scriptUrl',`(m.id==='honors-medals'?'${base}${branch}/torn-utilities/modules/honors-medals.user.js':m.scriptUrl)`);
 fs.writeFileSync(path.join(destination,`tu-manager-${platform}-DEV.user.js`),text);
}
fs.copyFileSync(path.join(root,'modules/honors-medals.user.js'),path.join(destination,'honors-medals-DEV.user.js'));
console.log('DEV installers: '+destination);
