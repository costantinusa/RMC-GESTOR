(()=>{
const $=id=>document.getElementById(id);
function euro(v){return v==null?'':Number(v).toFixed(2).replace('.',',')}
function parseMoney(v){if(v==null||v==='')return null;let s=String(v).replace(/[€$£\s]/g,'').replace(/[^\d,.-]/g,'');if(!s)return null;if(s.includes(',')&&s.includes('.'))s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');else if(s.includes(','))s=s.replace(',','.');const n=Number(s);return Number.isFinite(n)?n:null}
function amounts(line){return [...String(line).matchAll(/(?:^|[^\d])(-?\d{1,7}(?:[.\s]\d{3})*(?:[,.]\d{2}))(?!\d)/g)].map(m=>parseMoney(m[1])).filter(v=>v!=null)}
function normalize(text){return String(text||'').replace(/\u00a0/g,' ').replace(/[|]/g,'I').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim()}
function cleanLine(s){return String(s||'').replace(/[=_]{2,}/g,' ').replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9&.,'()\-\/ ]/g,' ').replace(/\s+/g,' ').trim()}
function validInvoiceNo(v){v=String(v||'').trim().replace(/^[.:#-]+|[.:#-]+$/g,'');return v.length>=3&&v.length<=30&&/\d/.test(v)&&/^[A-Z0-9][A-Z0-9.\-\/]*$/i.test(v)?v:''}
function invoiceNumber(lines){
 for(let i=0;i<lines.length;i++){
  const l=lines[i];
  const patterns=[/\b(?:N[º°O.]|NÚMERO|NUMERO)\s*(?:DE\s*)?FACTURA\s*[:#-]?\s*([A-Z0-9][A-Z0-9.\-\/]{2,})/i,/\bFACTURA\s*(?:N[º°O.]|NÚMERO|NUMERO|N)?\s*[:#-]\s*([A-Z0-9][A-Z0-9.\-\/]{2,})/i,/\b(?:N[º°O.]|NÚMERO|NUMERO)\s*[:#-]\s*([A-Z0-9][A-Z0-9.\-\/]{2,})/i];
  for(const r of patterns){const m=l.match(r);if(m){const n=validInvoiceNo(m[1]);if(n)return n}}
 }
 return '';
}
function findDate(lines){
 const priority=lines.filter(l=>/FECHA\s*(?:FACT|FACTURA|EMISI|EXPED)/i.test(l));
 for(const group of [priority,lines])for(const l of group){const m=l.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})\b/);if(m)return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`}
 return '';
}
function supplier(lines){
 const top=lines.slice(0,14).map(cleanLine).filter(Boolean);let best='',score=-99;
 for(const l of top){if(l.length<4||l.length>75)continue;if(/FACTURA|TICKET|FECHA|CLIENTE|NOMBRE|DNI|CIF|NIF|DOMICILIO|DIRECCI|TEL|KM|KILOMETR|VEH[IÍ]CULO|MATR[IÍ]CULA/i.test(l))continue;let s=0;if(/\b(SL|S\.L\.?|SA|S\.A\.?|SLL|SCP|COOP)\b/i.test(l))s+=8;if(/NEUMATIC|CLIMA|ELECTR|TALLER|SERVICIO|SUMINIST|FERRETER|DISTRIB|COMERCIAL|AUTOMOCI|MECANIC/i.test(l))s+=5;if(l===l.toUpperCase())s+=2;if(/[A-Za-zÁÉÍÓÚÑ]{5,}/.test(l))s+=2;s-=Math.max(0,(l.match(/\d/g)||[]).length-2);if(s>score){score=s;best=l}}
 return score>=2?best:'';
}
function tableTotals(lines){
 for(let i=0;i<lines.length;i++){
  const h=lines[i].toUpperCase();
  if(!/BASE/.test(h)||!/IVA/.test(h)||!/TOTAL/.test(h))continue;
  const rateMatch=h.match(/IVA\s*(?:AL\s*)?(21|10|4)\s*%/i)||h.match(/(21|10|4)\s*%/);
  let vals=[];
  vals.push(...amounts(lines[i]));
  for(let j=i+1;j<=Math.min(i+3,lines.length-1)&&vals.length<4;j++)vals.push(...amounts(lines[j]));
  vals=vals.filter(v=>v>=0);
  let base=null,iva=null,discount=0,total=null;
  if(vals.length>=4){[base,iva,discount,total]=vals.slice(0,4)}
  else if(vals.length===3){[base,iva,total]=vals}
  if(base!=null&&iva!=null&&total!=null){
   const d1=Math.abs(base+iva-discount-total),d2=Math.abs(base+iva-total);
   if(d1<=0.15||d2<=0.15)return {base,iva,discount:d1<=d2?discount:0,total,rate:rateMatch?Number(rateMatch[1]):null,source:'tabla'};
  }
 }
 return null;
}
function fallbackTotals(lines){
 let total=null,base=null,iva=null,rate=null;
 for(let i=lines.length-1;i>=0;i--){const l=lines[i];if(/\bTOTAL(?:\s+A\s+PAGAR|\s+FACTURA)?\b/i.test(l)&&!/SUBTOTAL/i.test(l)){let a=amounts(l);if(a.length){total=a[a.length-1];break}}}
 for(const l of lines){if(/\bBASE(?:\s+IMPONIBLE|\s+IMP\.)?\b/i.test(l)){let a=amounts(l);if(a.length)base=a[0]}}
 for(const l of lines){const rm=l.match(/\bIVA\s*(?:AL\s*)?(21|10|4)\s*%/i)||l.match(/\b(21|10|4)\s*%\s*(?:IVA)?/i);if(rm)rate=Number(rm[1]);if(/CUOTA\s*(?:DE\s*)?IVA/i.test(l)){let a=amounts(l);if(a.length)iva=a[a.length-1]}}
 if(iva==null&&base!=null&&total!=null&&total>=base)iva=Math.round((total-base)*100)/100;
 if(base==null&&iva!=null&&total!=null)base=Math.round((total-iva)*100)/100;
 if(rate==null&&base&&iva!=null){let rr=iva/base*100;for(const z of [21,10,4])if(Math.abs(rr-z)<0.8){rate=z;break}}
 return {base,iva,total,rate,discount:0,source:'general'};
}
function concepts(lines){
 let start=-1,end=lines.length;
 for(let i=0;i<lines.length;i++){if(/\b(?:CANT|CANTIDAD)\b.*\b(?:CONCEPTO|DESCRIPCI)/i.test(lines[i])){start=i+1;break}}
 for(let i=Math.max(0,start);i<lines.length;i++){if(/BASE.*IVA.*TOTAL/i.test(lines[i])){end=i;break}}
 const out=[];
 for(let i=start>=0?start:0;i<end;i++){
  const l=cleanLine(lines[i]);if(!l||/CLIENTE|DNI|NOMBRE|VEH[IÍ]CULO|MATR[IÍ]CULA|KILOMETR|COMBUSTIBLE|DIRECCI|TEL[EÉ]FONO/i.test(l))continue;
  if(amounts(l).length&&/[A-Za-zÁÉÍÓÚÑ]{3,}/.test(l)){
   let t=l.replace(/\b\d{1,4}(?:[.,]\d+)?\b/g,' ').replace(/\s+/g,' ').trim();
   t=t.replace(/^[€.,\- ]+|[€.,\- ]+$/g,'');
   if(t.length>=5&&!out.some(x=>x.toLowerCase()===t.toLowerCase()))out.push(t);
  }
 }
 return out.slice(0,8);
}
function parse(text){const raw=normalize(text),lines=raw.split('\n').map(x=>x.trim()).filter(Boolean);const tab=tableTotals(lines),tot=tab||fallbackTotals(lines);return {supplier:supplier(lines),date:findDate(lines),invoiceNo:invoiceNumber(lines),base:tot.base,iva:tot.iva,total:tot.total,rate:tot.rate,discount:tot.discount||0,source:tot.source,concepts:concepts(lines),raw}}
function ensureReview(){let box=$('ocrReview');if(box)return box;box=document.createElement('div');box.id='ocrReview';box.className='hidden';box.style='margin-top:10px;border:1px solid #ccd5e2;border-radius:10px;padding:12px;background:white';box.innerHTML=`<b style="color:var(--navy)">Revisar datos antes de aplicar</b><div class="status">Nada se copiará al gasto hasta que pulses “Aplicar a gasto”.</div><div class="formgrid" style="margin-top:8px"><div class="half"><label>Proveedor detectado</label><input id="rvSupplier"></div><div><label>Fecha</label><input id="rvDate" type="date"></div><div><label>Nº factura</label><input id="rvNo"></div><div><label>Base imponible €</label><input id="rvBase"></div><div><label>IVA %</label><input id="rvRate"></div><div><label>Cuota IVA €</label><input id="rvIva"></div><div><label>Descuento €</label><input id="rvDiscount"></div><div><label>Total factura €</label><input id="rvTotal"></div><div class="full"><label>Conceptos detectados</label><textarea id="rvConcept"></textarea></div></div><div id="rvCheck" class="status"></div><div class="actions"><button type="button" class="ghost" id="rvDiscard">Descartar lectura</button><button type="button" class="primary" id="rvApply">Aplicar a gasto</button></div>`;$('receiptBox').appendChild(box);$('rvDiscard').onclick=()=>{box.classList.add('hidden');window.lastReceiptParsed=null};$('rvApply').onclick=applyReview;['rvBase','rvRate','rvIva','rvDiscount','rvTotal'].forEach(id=>$(id).addEventListener('input',checkReview));return box}
function fill(p){ensureReview().classList.remove('hidden');$('rvSupplier').value=p.supplier||'';$('rvDate').value=p.date||'';$('rvNo').value=p.invoiceNo||'';$('rvBase').value=euro(p.base);$('rvRate').value=p.rate==null?'':String(p.rate).replace('.',',');$('rvIva').value=euro(p.iva);$('rvDiscount').value=euro(p.discount);$('rvTotal').value=euro(p.total);$('rvConcept').value=p.concepts.join(' · ');checkReview()}
function checkReview(){const b=parseMoney($('rvBase').value),i=parseMoney($('rvIva').value),d=parseMoney($('rvDiscount').value)||0,t=parseMoney($('rvTotal').value),r=parseMoney($('rvRate').value);let msg=[];if(b!=null&&i!=null&&t!=null){const dif=Math.abs(b+i-d-t);msg.push(dif<=0.05?'✓ Base + IVA − descuento coincide con el total.':`⚠ No cuadra: diferencia ${money(dif)}.`)}else msg.push('⚠ Faltan importes para comprobar matemáticamente la factura.');if(b&&i!=null&&r!=null&&Math.abs(i-b*r/100)>0.08)msg.push('⚠ La cuota de IVA no coincide con el porcentaje.');$('rvCheck').textContent=msg.join(' ')}
function applyReview(){const b=parseMoney($('rvBase').value),r=parseMoney($('rvRate').value);if($('rvSupplier').value.trim())$('party').value=fmtText($('rvSupplier').value);if($('rvDate').value)$('date').value=$('rvDate').value;if(validInvoiceNo($('rvNo').value))$('documentNo').value=validInvoiceNo($('rvNo').value).toUpperCase();if($('rvConcept').value.trim())$('concept').value=fmtText($('rvConcept').value);if(b!=null)$('base').value=euro(b);if(r!=null){$('vatTreatment').value='con_iva';if([21,10,4,0].includes(Math.round(r))&&Math.abs(r-Math.round(r))<0.01)$('vat').value=String(Math.round(r));else{$('vat').value='custom';$('customVat').value=String(r).replace('.',',');$('customVatBox').classList.remove('hidden')}}applyVatTreatment();calc();$('ocrStatus').textContent='Datos revisados aplicados al gasto. Comprueba el formulario antes de guardar.';ensureReview().classList.add('hidden')}
async function read(src){const r=await Tesseract.recognize(src,'spa+eng',{logger:q=>{if(q.status==='recognizing text')$('ocrStatus').textContent=`Leyendo factura… ${Math.round((q.progress||0)*100)} %`}});return r.data.text||''}
window.scanReceipt=async file=>{if(!file)return;window.lastReceiptFile=file;window.lastReceiptFilename=file.name||'foto';window.lastReceiptParsed=null;ensureReview().classList.add('hidden');$('ocrStatus').textContent='Leyendo e interpretando factura completa…';try{const p=parse(await read(file));window.lastReceiptText=p.raw;window.lastReceiptParsed=p;fill(p);$('ocrStatus').textContent=p.source==='tabla'?'Lectura terminada. Se ha reconocido la tabla Base / IVA / Descuento / Total. Revisa y confirma.':'Lectura terminada. Revisa los datos detectados antes de aplicarlos.'}catch(e){console.error(e);$('ocrStatus').textContent='No se pudo interpretar la imagen. Prueba con la factura completa, recta y con buena luz.'}};
const originalReset=window.resetMovementForm;if(originalReset)window.resetMovementForm=function(){originalReset();const b=$('ocrReview');if(b)b.classList.add('hidden')};
const rf=$('receiptFile');if(rf)rf.onchange=e=>window.scanReceipt(e.target.files&&e.target.files[0]);
})();