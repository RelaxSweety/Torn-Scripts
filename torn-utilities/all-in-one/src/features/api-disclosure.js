import {renderAgreementMarkdown} from './agreement-renderer.js';
// Use the published disclosure wording, with an immediate storage-mode notice.
export function createApiDisclosure({document,storageMode='origin-local',content}) {
 const match=String(content||'').match(/^## 2\.[\s\S]*?(?=^## 3\.)/m);
 if(!match||!match[0].includes('| Disclosure |'))throw Error('Agreement disclosure tables are unavailable');
 const section=document.createElement('section');section.dataset.tuKeyDisclosure='true';section.setAttribute('aria-label','API key and data use disclosure');section.style.cssText='min-width:0;max-width:100%;overflow-wrap:anywhere;white-space:normal;';
 const notice=document.createElement('p');notice.style.cssText='font:400 14px/1.6 system-ui;white-space:normal;overflow-wrap:anywhere;';
 notice.textContent=storageMode==='userscript-private'?'This host uses unencrypted userscript-manager storage for saved credentials. Typing or revealing a key places it in the page input.':storageMode==='private-unavailable'?'Private credential storage is unavailable. TU will not silently fall back to origin storage.':'This host uses unencrypted Torn-origin storage. Other scripts on Torn may read saved keys or session credentials.';
 section.append(notice,renderAgreementMarkdown({document,markdown:match[0]}));return section;
}
