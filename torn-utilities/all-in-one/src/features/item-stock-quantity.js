// Existing Item Monitor stock reader, also used by Market Price Auto Fill.
export function readItemStockQuantity(row,{text=e=>e?.innerText||e?.textContent||'',exclude=null}={}){
 if(!row)return NaN;
 for(const e of row.querySelectorAll('[data-stock],[data-quantity],[class*=stock],[class*=Stock],[class*=quantity],[class*=available]')){
  if(exclude&&e.closest(exclude))continue;
  const raw=e.getAttribute('data-stock')||e.getAttribute('data-quantity')||text(e);
  const m=raw.match(/(?:stock|quantity|available|remaining|in stock)?\s*:?\s*([\d,]+)/i);
  if(m)return Number(m[1].replaceAll(',',''));
 }
 const m=text(row).match(/(?:stock|quantity|available|remaining)\s*:?\s*([\d,]+)/i);
 return m?Number(m[1].replaceAll(',','')):NaN;
}
