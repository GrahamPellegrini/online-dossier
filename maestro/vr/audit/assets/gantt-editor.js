(() => {
  const chart = document.querySelector('.gantt-chart');
  if (!chart) return;
  const DAY = 86400000, FIRST = Date.UTC(2026,9,5), LAST = Date.UTC(2027,1,1), DAYS = (LAST-FIRST)/DAY;
  const STORAGE = 'maestro-audit-gantt-v1';
  const originals = [...chart.querySelectorAll('.gantt-entry')];
  const defaults = Object.fromEntries(originals.map(row => [row.id, {start:row.dataset.start, end:row.dataset.end}]));
  const kinds = Object.fromEntries(originals.map(row => [row.id, row.dataset.kind]));
  let dates = structuredClone(defaults), active = null, history = [];
  const rows = new Map();
  const iso = number => new Date(number).toISOString().slice(0,10);
  const parse = value => /^\d{4}-\d{2}-\d{2}$/.test(value) ? Date.parse(`${value}T00:00:00Z`) : NaN;
  const format = value => new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(parse(value));
  function validate(input) {
    if (!input || input.version !== 1 || !input.tasks || typeof input.tasks !== 'object' || Array.isArray(input.tasks)) throw Error('Choose a Maestro Gantt export (version 1).');
    const next = structuredClone(defaults);
    for (const [id, value] of Object.entries(input.tasks)) {
      if (!Object.hasOwn(defaults,id) || !value || typeof value !== 'object') throw Error('The schedule contains an unknown task.');
      const {start,end} = value;
      if (start === '' && end === '') next[id] = {start,end};
      else {
        const a=parse(start), b=parse(end);
        if (!Number.isFinite(a) || !Number.isFinite(b) || iso(a)!==start || iso(b)!==end || a<FIRST || b>=LAST || a>b) throw Error('Dates must be valid and ordered, within 5 October 2026–31 January 2027.');
        next[id]={start,end};
      }
      if (kinds[id]==='fixed' && JSON.stringify(next[id])!==JSON.stringify(defaults[id])) throw Error('The confirmed EEAI conference dates cannot be moved.');
    }
    return next;
  }
  const tools = document.querySelector('#gantt-tools');
  tools.innerHTML = '<div class="gantt-toolbar"><button type="button" data-action="undo">Undo</button><button type="button" data-action="export">Export schedule</button><button type="button" data-action="import">Import schedule</button><button type="button" data-action="reset">Restore published dates</button><button type="button" data-action="print">Print current chart</button><input type="file" accept="application/json,.json" hidden><span class="gantt-save-status" role="status" aria-live="polite"></span></div><p class="gantt-save-note">Autosaved in this browser. Export to back up or share; import to use the same schedule on another device. The published schedule stays unchanged. EEAI conference dates are fixed.</p>';
  const status = tools.querySelector('.gantt-save-status');
  function report(text) { status.textContent=text; }
  try {
    const stored = localStorage.getItem(STORAGE);
    if (stored) { dates=validate(JSON.parse(stored)); report('Saved schedule restored.'); }
    else report('Published dates loaded.');
  } catch (error) { report(`Saved schedule could not be loaded: ${error.message}`); }
  function save() {
    try { localStorage.setItem(STORAGE,JSON.stringify({version:1,tasks:dates}));report('Saved in this browser.'); }
    catch (_) { report('Browser saving is unavailable. Export your schedule to keep it.'); }
  }
  function close() {
    if (!active) return;
    const row = rows.get(active);
    row.classList.remove('gantt-expanded'); row.querySelector('.gantt-detail').hidden=true;
    row.querySelector('.gantt-control').setAttribute('aria-expanded','false'); active=null;
  }
  function open(id) {
    const row=rows.get(id);
    if (active===id) {close();return;}
    close(); active=id;row.classList.add('gantt-expanded');row.querySelector('.gantt-detail').hidden=false;
    row.querySelector('.gantt-control').setAttribute('aria-expanded','true');
    const {start,end}=dates[id];row.querySelector('[name="start"]').value=start;row.querySelector('[name="end"]').value=end;
  }
  function label(id) {
    const {start,end}=dates[id];return start ? (start===end ? format(start) : `${format(start)} – ${format(end)}`) : 'Date to agree';
  }
  function render(id) {
    const row=rows.get(id), value=dates[id], button=row.querySelector('.gantt-control'), fixed=kinds[id]==='fixed';
    row.querySelector('.gantt-task small').textContent=label(id);
    button.className=`gantt-control ${value.start ? 'gantt-bar' : 'gantt-unscheduled'} ${kinds[id]}`;
    button.title=`${row.dataset.title}: ${label(id)}. ${fixed?'Fixed event. Click for details.':'Click for details; drag to move. Arrow keys move one day, Shift+arrow one week.'}`;
    button.setAttribute('aria-label',button.title);
    if (value.start) {
      button.style.left=`${(parse(value.start)-FIRST)/DAY/DAYS*100}%`;
      button.style.width=`${((parse(value.end)-parse(value.start))/DAY+1)/DAYS*100}%`;
      button.textContent='';
      if (!fixed) ['start','end'].forEach(edge => {const handle=document.createElement('span');handle.className=`gantt-handle handle-${edge}`;handle.dataset.edge=edge;handle.setAttribute('aria-hidden','true');button.append(handle);});
    } else {button.style.left='';button.style.width='';button.textContent='Set dates';}
    const printRow = document.querySelector(`.gantt-print-notes .gantt-entry[data-key="${id}"]`);
    if (printRow) printRow.querySelector('.gantt-task small').textContent=label(id);
  }
  function renderAll() {for (const id of rows.keys()) render(id);tools.querySelector('[data-action="undo"]').disabled=!history.length;}
  function commit(next) {
    if (JSON.stringify(next)===JSON.stringify(dates)) return;
    history.push(structuredClone(dates));if(history.length>50)history.shift();dates=next;renderAll();save();
  }
  originals.forEach(original => {
    const id=original.id, row=document.createElement('article'), summary=original.querySelector('summary');
    row.className='gantt-entry gantt-editable';row.id=id;row.dataset.title=summary.querySelector('strong').textContent;
    const main=document.createElement('div');main.className='gantt-row';
    main.append(summary.querySelector('.gantt-task'));
    const track=document.createElement('div');track.className='gantt-track';
    let suppressClick=false;
    const button=document.createElement('button');button.type='button';button.className='gantt-control';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',`${id}-details`);track.append(button);main.append(track);row.append(main);
    const detail=original.querySelector('.gantt-detail');detail.id=`${id}-details`;detail.hidden=true;
    const heading=document.createElement('div');heading.className='gantt-panel-heading';
    const name=document.createElement('strong');name.textContent=row.dataset.title;heading.append(name);
    const exit=document.createElement('button');exit.type='button';exit.textContent='×';exit.setAttribute('aria-label','Close task details');exit.addEventListener('click',()=>{close();button.focus();});heading.append(exit);detail.prepend(heading);
    const form=document.createElement('form');form.className='gantt-date-form';
    form.innerHTML='<label>Start <input name="start" type="date" min="2026-10-05" max="2027-01-31" required></label><label>End <input name="end" type="date" min="2026-10-05" max="2027-01-31" required></label><button type="submit">Save dates</button><button type="button" data-unschedule>Clear dates</button><p class="gantt-date-error" role="alert"></p>';
    const fixed=kinds[id]==='fixed';
    if (fixed) form.querySelectorAll('input,button').forEach(element=>element.disabled=true);
    form.addEventListener('submit',event=>{event.preventDefault();try{const next=structuredClone(dates);next[id]={start:form.elements.start.value,end:form.elements.end.value};commit(validate({version:1,tasks:next}));form.querySelector('.gantt-date-error').textContent='';}catch(error){form.querySelector('.gantt-date-error').textContent=error.message;}});
    form.querySelector('[data-unschedule]').addEventListener('click',()=>{const next=structuredClone(dates);next[id]={start:'',end:''};commit(next);form.elements.start.value='';form.elements.end.value='';});
    detail.append(form);row.append(detail);original.replaceWith(row);rows.set(id,row);
    const index=originals.indexOf(original);const printRow=document.querySelectorAll('.gantt-print-notes .gantt-entry')[index];if(printRow)printRow.dataset.key=id;
    button.addEventListener('click',()=>{if(suppressClick){suppressClick=false;return;}open(id);});
    button.addEventListener('keydown',event=>{
      if (event.key==='Escape') {close();return;}
      if (!['ArrowLeft','ArrowRight'].includes(event.key)||fixed||!dates[id].start) return;
      event.preventDefault();const step=(event.key==='ArrowRight'?1:-1)*(event.shiftKey?7:1);
      const a=parse(dates[id].start),b=parse(dates[id].end),delta=Math.max((FIRST-a)/DAY,Math.min(step,(LAST-DAY-b)/DAY));
      const next=structuredClone(dates);next[id]={start:iso(a+delta*DAY),end:iso(b+delta*DAY)};commit(next);
    });
    button.addEventListener('pointerdown',event=>{
      if(fixed||!dates[id].start||event.button!==0)return;
      const before=structuredClone(dates), initial=before[id], a=parse(initial.start),b=parse(initial.end),x=event.clientX;
      const edge=event.target.dataset.edge, scale=track.getBoundingClientRect().width/DAYS;
      let moved=false;
      button.setPointerCapture(event.pointerId);
      function move(e) {
        if(e.pointerId!==event.pointerId)return;
        if(!moved&&Math.abs(e.clientX-x)<5)return;
        if(!moved){moved=true;close();row.classList.add('gantt-dragging');}
        const delta=Math.round((e.clientX-x)/scale);let left=a,right=b;
        if(edge==='start')left=Math.max(FIRST,Math.min(b,a+delta*DAY));
        else if(edge==='end')right=Math.min(LAST-DAY,Math.max(a,b+delta*DAY));
        else {const bounded=Math.max((FIRST-a)/DAY,Math.min(delta,(LAST-DAY-b)/DAY));left=a+bounded*DAY;right=b+bounded*DAY;}
        dates[id]={start:iso(left),end:iso(right)};
        // Keep the captured button and handle in place during a gesture.
        button.style.left=`${(left-FIRST)/DAY/DAYS*100}%`;button.style.width=`${((right-left)/DAY+1)/DAYS*100}%`;row.querySelector('.gantt-task small').textContent=label(id);
      }
      function finish(e) {
        if(e.pointerId!==event.pointerId)return;
        button.removeEventListener('pointermove',move);button.removeEventListener('pointerup',finish);button.removeEventListener('pointercancel',cancel);
        row.classList.remove('gantt-dragging');
        const next=structuredClone(dates);dates=before;
        if(moved){suppressClick=true;commit(next);setTimeout(()=>suppressClick=false,100);}else render(id);
      }
      function cancel(e){if(e.pointerId!==event.pointerId)return;dates=before;finish(e);renderAll();}
      button.addEventListener('pointermove',move);button.addEventListener('pointerup',finish);button.addEventListener('pointercancel',cancel);
    });
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
  document.addEventListener('click',event=>{if(active&&!rows.get(active).contains(event.target)&&!tools.contains(event.target))close();});
  tools.querySelector('[data-action="undo"]').addEventListener('click',()=>{if(!history.length)return;close();dates=history.pop();renderAll();save();});
  tools.querySelector('[data-action="reset"]').addEventListener('click',()=>{close();commit(structuredClone(defaults));});
  tools.querySelector('[data-action="export"]').addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify({version:1,exported_at:new Date().toISOString(),tasks:dates},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob), link=document.createElement('a');link.href=url;link.download='maestro-gantt-schedule.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);report('Schedule exported.');
  });
  const file=tools.querySelector('input[type="file"]');
  tools.querySelector('[data-action="import"]').addEventListener('click',()=>file.click());
  file.addEventListener('change',async()=>{try{if(!file.files.length)return;if(file.files[0].size>100000)throw Error('Schedule file is too large.');const next=validate(JSON.parse(await file.files[0].text()));close();commit(next);report('Schedule imported and saved in this browser.');}catch(error){report(`Import failed: ${error.message}`);}finally{file.value='';}});
  tools.querySelector('[data-action="print"]').addEventListener('click',()=>{close();window.print();});
  renderAll();chart.classList.add('gantt-editor-ready');
})();
