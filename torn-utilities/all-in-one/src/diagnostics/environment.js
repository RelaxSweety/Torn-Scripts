// No network probes: report only browser/host metadata actually exposed to this script.
export function detectTestEnvironment({userAgent='',platform='',maxTouchPoints=0,uaData=null,gmInfo=null,pdaBridge=false}={}) {
 const ua=String(userAgent),version=v=>typeof v==='string'&&/^\d+(?:[._]\d+)*(?:[-+][\w.-]+)?$/.test(v)?v.replaceAll('_','.'):null;
 const match=re=>version(re.exec(ua)?.[1]);
 let os={name:'Unknown OS',version:null,source:'unavailable'},device={type:'unknown',model:null,source:'unavailable'};
 const desktopIPad=/Mac/i.test(platform)&&maxTouchPoints>1;
 if(/Android/i.test(ua)){os={name:'Android',version:match(/Android\s+([\d.]+)/i),source:'user-agent'};device={type:/Mobile/i.test(ua)?'phone':'tablet',model:null,source:'user-agent'};const model=/Android[^;)]*;\s*(?:[A-Za-z]{2}[-_][A-Za-z]{2};\s*)?([^;)]+)/.exec(ua)?.[1]?.replace(/\s+Build\/.*$/,'').trim();if(model&&!/^(K|wv|Linux|Mobile)$/i.test(model))device.model=model;}
 else if(/iPhone|iPad|iPod/i.test(ua)||desktopIPad){const tablet=/iPad/i.test(ua)||desktopIPad;os={name:tablet?'iPadOS':'iOS',version:desktopIPad?null:match(/(?:CPU (?:iPhone )?OS|iPhone OS)\s+([\d_]+)/i),source:'user-agent'};device={type:tablet?'tablet':'phone',model:tablet?'iPad family':'iPhone/iPod family',source:desktopIPad?'desktop-mode touch signals':'user-agent'};}
 else if(/Windows NT/i.test(ua)){const nt=match(/Windows NT ([\d.]+)/);os={name:nt==='10.0'?'Windows 10/11':'Windows',version:nt==='10.0'?null:nt,source:'user-agent'};device={type:'desktop',model:null,source:'user-agent'};}
 else if(/Mac OS X/i.test(ua)){os={name:'macOS',version:match(/Mac OS X\s+([\d_]+)/),source:'user-agent'};device={type:'desktop',model:null,source:'user-agent'};}
 else if(/CrOS/i.test(ua)){os={name:'ChromeOS',version:match(/CrOS \S+ ([\d.]+)/),source:'user-agent'};device={type:'desktop',model:null,source:'user-agent'};}
 else if(/Linux/i.test(ua)){os={name:'Linux',version:null,source:'user-agent'};device={type:'desktop',model:null,source:'user-agent'};}
 let browser={name:'Unknown browser',version:null,source:'unavailable'};
 for(const [name,re] of [['Edge',/(?:Edg|EdgA|EdgiOS)\/([\d.]+)/],['Opera',/(?:OPR|OPiOS)\/([\d.]+)/],['Samsung Internet',/SamsungBrowser\/([\d.]+)/],['Firefox',/(?:Firefox|FxiOS)\/([\d.]+)/],['Chrome',/(?:Chrome|CriOS)\/([\d.]+)/],['Safari',/Version\/([\d.]+).*Safari\//]]){const v=match(re);if(v){browser={name,version:v,source:'user-agent'};break;}}
 if(/Android/i.test(ua)&&/; wv\)/.test(ua)&&browser.name==='Chrome')browser.name='Android WebView (Chromium)';
 if(browser.name==='Unknown browser'&&/AppleWebKit\//.test(ua))browser={name:'WebKit webview',version:match(/AppleWebKit\/([\d.]+)/),source:'user-agent engine version'};
 if(uaData&&typeof uaData==='object'){
  if(typeof uaData.model==='string'&&uaData.model.trim())device={...device,model:uaData.model.trim(),source:'client-hints'};
  if(!desktopIPad&&typeof uaData.platform==='string'&&uaData.platform.trim()){
   os={name:uaData.platform,version:version(uaData.platformVersion),source:uaData.platformVersion?'client-hints platform version':'client-hints'};
   if(uaData.platform==='Windows'&&!os.version)os.name='Windows (version unavailable)';
  }
  const brands=Array.isArray(uaData.fullVersionList)?uaData.fullVersionList:uaData.brands;
  if(Array.isArray(brands))for(const [brand,name] of [['Microsoft Edge','Edge'],['Opera','Opera'],['Google Chrome','Chrome'],['Chromium','Chromium']]){
   const found=brands.find(b=>b?.brand===brand&&version(b.version));
   if(found){if(browser.name==='Unknown browser'||browser.name===name||(name==='Chromium'&&browser.name==='Android WebView (Chromium)'))browser={...browser,name:browser.name==='Android WebView (Chromium)'?browser.name:name,version:version(found.version),source:Array.isArray(uaData.fullVersionList)?'client-hints full version':'client-hints major version'};break;}
  }
 }
 const pdaVersion=match(/Torn[ _-]?PDA[\s/:;-]+v?([\d.]+)/i);
 const isPda=!!pdaBridge||/Torn[ _-]?PDA/i.test(ua);
 let host={id:'unknown',name:'Unknown host',version:null,source:'unavailable'};
 if(isPda)host={id:'pda',name:'Torn PDA',version:pdaVersion,source:pdaVersion?'user-agent app token':pdaBridge?'PDA bridge (version unavailable)':'user-agent (version unavailable)'};
 else if(/tampermonkey/i.test(gmInfo?.scriptHandler||''))host={id:'tampermonkey',name:'Tampermonkey',version:version(gmInfo.version),source:gmInfo.version?'GM_info.version':'GM_info.scriptHandler (version unavailable)'};
 return {device,os,browser,host};
}
