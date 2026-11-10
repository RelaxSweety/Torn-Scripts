// Build-time presentation conversion from unchanged source baselines. No runtime
// DOM scans, zoom/transforms, window geometry, game coordinates or saved settings.
export function compactPresentation(source){
 const marker='/* TU compact presentation v1 */';if(source.includes(marker))return source;
 const scaled=(value,font=false)=>value.replace(/(-?\d*\.?\d+)(px|rem)\b/g,(_,raw,unit)=>{const n=Number(raw);if(n===0)return raw+unit;const size=font&&unit==='px'?Math.max(11,n*.75):n*.75;return Number(size.toFixed(3))+unit;});
 // CSS declarations inside stylesheets, cssText and HTML style attributes.
 // Geometry, border widths, animation timings and API/calculation values are excluded.
 source=source.replace(/\b(font-size|font|padding(?:-(?:top|right|bottom|left|inline|block))?|margin(?:-(?:top|right|bottom|left|inline|block))?|(?:row-|column-)?gap)\s*:\s*([^;{}'"`\n]+)/g,(all,key,value)=>all.slice(0,all.length-value.length)+scaled(value,key.startsWith('font')));
 // Object.assign(element.style, ...) uses camelCase keys and quoted CSS values.
 source=source.replace(/\b(fontSize|font|padding(?:Top|Right|Bottom|Left)?|margin(?:Top|Right|Bottom|Left)?|gap|rowGap|columnGap)\s*:\s*(["'])([^"'\n]+)\2/g,(all,key,quote,value)=>all.replace(quote+value+quote,quote+scaled(value,key.startsWith('font'))+quote));
 source=source.replace(/(\.style\.(fontSize|font|padding(?:Top|Right|Bottom|Left)?|margin(?:Top|Right|Bottom|Left)?|gap|rowGap|columnGap)\s*=\s*)(["'])([^"'\n]+)\3/g,(_,prefix,key,quote,value)=>prefix+quote+scaled(value,key.startsWith('font'))+quote);
 return source+'\n'+marker;
}
