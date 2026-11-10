// A deliberately small Markdown renderer. All agreement text is handled as text,
// and external links are constructed only after HTTPS validation.
export function renderAgreementMarkdown({document,markdown}) {
 const root=document.createElement('div');root.className='tu-agreement-content';
 root.style.cssText='min-width:0!important;max-width:100%!important;overflow-wrap:anywhere!important;white-space:normal!important;';
 function inline(parent,value){
  const pattern=/\[([^\]\n]+)\]\(([^\s)]+)\)|\*\*([^*]+)\*\*/g;let cursor=0,match;
  while((match=pattern.exec(value))){parent.append(document.createTextNode(value.slice(cursor,match.index)));let node;
   if(match[3]){node=document.createElement('strong');node.textContent=match[3];}
   else{let url;try{url=new URL(match[2]);}catch{}if(url?.protocol==='https:'){node=document.createElement('a');node.href=url.href;node.target='_blank';node.rel='noopener noreferrer';node.textContent=match[1];node.style.cssText='color:#f1ce72!important;overflow-wrap:anywhere!important;white-space:normal!important;';}else node=document.createTextNode(match[0]);}
   parent.append(node);cursor=pattern.lastIndex;
  }parent.append(document.createTextNode(value.slice(cursor)));
 }
 const lines=String(markdown||'').replace(/\r\n?/g,'\n').split('\n');let index=0;
 const textStyle='display:block!important;position:static!important;margin:0 0 12px!important;padding:0!important;font:400 14px/1.65 system-ui!important;color:#e3e8ec!important;white-space:normal!important;overflow-wrap:anywhere!important;min-width:0!important;max-width:100%!important;';
 while(index<lines.length){const line=lines[index].trim();if(!line){index++;continue;}
  const heading=/^(#{1,3})\s+(.+)$/.exec(line);
  if(heading){const node=document.createElement(heading[1].length===1?'h2':heading[1].length===2?'h3':'h4');inline(node,heading[2]);node.style.cssText=textStyle+'margin:18px 0 10px!important;font-weight:700!important;font-size:'+(heading[1].length===1?'19':'15')+'px!important;';root.append(node);index++;continue;}
  if(line.startsWith('|')){
   const rows=[];while(index<lines.length&&lines[index].trim().startsWith('|')){const cells=lines[index].trim().replace(/^\||\|$/g,'').split('|').map(cell=>cell.trim());if(!cells.every(cell=>/^:?-+:?$/.test(cell)))rows.push(cells);index++;}
   if(!rows.length)continue;const table=document.createElement('table');table.style.cssText='display:table!important;position:static!important;width:100%!important;max-width:100%!important;table-layout:fixed!important;border-collapse:collapse!important;margin:8px 0 20px!important;color:#e3e8ec!important;font:400 13px/1.55 system-ui!important;';
   const head=document.createElement('thead'),body=document.createElement('tbody');head.style.cssText='display:table-header-group!important;';body.style.cssText='display:table-row-group!important;';
   rows.forEach((values,rowIndex)=>{const tr=document.createElement('tr');tr.style.cssText='display:table-row!important;';values.forEach((value,column)=>{const th=rowIndex===0||column===0;const cell=document.createElement(th?'th':'td');if(th)cell.scope=rowIndex===0?'col':'row';inline(cell,value);cell.style.cssText='display:table-cell!important;position:static!important;float:none!important;box-sizing:border-box!important;padding:9px!important;border:1px solid #806a3e!important;vertical-align:top!important;text-align:left!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important;color:#e3e8ec!important;font:400 13px/1.55 system-ui!important;'+(th?'background:#253039!important;font-weight:600!important;':'background:#182026!important;')+(values.length===2?'width:'+(column===0?'29':'71')+'%!important;':'');tr.append(cell);});(rowIndex===0?head:body).append(tr);});table.append(head,body);root.append(table);continue;
  }
  if(line.startsWith('- ')){const list=document.createElement('ul');list.style.cssText=textStyle+'padding-left:22px!important;';while(index<lines.length&&lines[index].trim().startsWith('- ')){let value=lines[index++].trim().slice(2);while(index<lines.length&&/^\s{2,}\S/.test(lines[index]))value+=' '+lines[index++].trim();const item=document.createElement('li');item.style.cssText='display:list-item!important;white-space:normal!important;overflow-wrap:anywhere!important;margin:0 0 8px!important;';inline(item,value);list.append(item);}root.append(list);continue;}
  const paragraph=[line];index++;while(index<lines.length&&lines[index].trim()&&!/^(#{1,3}\s|\||- )/.test(lines[index].trim()))paragraph.push(lines[index++].trim());const node=document.createElement('p');node.style.cssText=textStyle;inline(node,paragraph.join(' '));root.append(node);
 }return root;
}
