/* ============ CONSTANTS & STATE ============ */
const COLORS = ['#7c5cff','#22d3ee','#f59e0b','#34d399','#ef4444','#a78bfa','#f472b6','#60a5fa','#facc15','#10b981','#fb7185','#818cf8','#fbbf24','#14b8a6'];
const STORAGE_KEY = 'juninhos.assignments.v1';

let charts = {};
let allRows = [];
let allIdeas = [];
let selectedIdeaId = null;

const COL = {
  ts:'Carimbo de data/hora',
  email:'Nome de usuário',
  name:'Qual é o seu nome?',
  level:'Qual é o seu nível?',
  areas:'Em qual(is) área(s) você atua ou está aprendendo?  ',
  techs:'Quais tecnologias / linguagens você usa no dia a dia?',
  github:'Qual é o seu nível de experiência com GitHub?  ',
  hours:'Quantas horas por semana você consegue dedicar a um projeto atualmente?',
  ideaTitle:'Qual é o nome ou título da sua ideia?',
  ideaDesc:'Descreva a ideia em até 3 frases. Que problema ela resolve?',
  stage:'Qual é o estágio atual da ideia?',
  workMode:'Como você prefere trabalhar em grupo?',
  helpOthers:'Você toparia ajudar outros membros com as ideias deles?',
  identifyAuthor:'Você gostaria de se identificar como autor(a) de alguma ideia do projeto?',
  contact:null,
  availMay:'Tem disponibilidade para realizar trabalho em grupo no mês de maio?'
};

const TECH_ALIASES = {
  'js':'JavaScript','javascript':'JavaScript','typescript':'TypeScript','ts':'TypeScript',
  'node':'Node.js','nodejs':'Node.js','node js':'Node.js','reactjs':'React','react':'React','react native':'React Native',
  'next':'Next.js','nextjs':'Next.js','next js':'Next.js','nuxtjs':'Nuxt.js',
  'vue':'Vue','vuejs':'Vue','angular':'Angular','svelte':'Svelte',
  'python':'Python','java':'Java','c#':'C#','c++':'C++','c':'C','golang':'Go','go':'Go','rust':'Rust','ruby':'Ruby','php':'PHP','kotlin':'Kotlin','dart':'Dart','flutter':'Flutter',
  'spring':'Spring','springboot':'Spring Boot','spring boot':'Spring Boot','django':'Django','flask':'Flask','fastapi':'FastAPI','laravel':'Laravel','nestjs':'NestJS','nest':'NestJS','express':'Express','rails':'Rails',
  'sql':'SQL','mysql':'MySQL','postgres':'PostgreSQL','postgresql':'PostgreSQL','postgre':'PostgreSQL','mongodb':'MongoDB','mongo':'MongoDB','sqlite':'SQLite','oracle':'Oracle',
  'docker':'Docker','kubernetes':'Kubernetes','k8s':'Kubernetes','aws':'AWS','azure':'Azure','gcp':'GCP','terraform':'Terraform','linux':'Linux',
  'html':'HTML','html5':'HTML','css':'CSS','css3':'CSS','tailwind':'Tailwind','tailwindcss':'Tailwind','sass':'Sass',
  'figma':'Figma','git':'Git','github':'GitHub','gitlab':'GitLab','bitbucket':'Bitbucket',
  'pandas':'Pandas','numpy':'NumPy','sklearn':'scikit-learn','spark':'Spark','databricks':'Databricks',
  'redis':'Redis','rabbitmq':'RabbitMQ','grafana':'Grafana','prometheus':'Prometheus','jenkins':'Jenkins',
  'wordpress':'WordPress','elementor':'Elementor','unity':'Unity','net':'.NET','aspnet':'ASP.NET','asp net':'ASP.NET','dotnet':'.NET','supabase':'Supabase','supabae':'Supabase',
  'haskell':'Haskell','lua':'Lua','delphi':'Delphi','bash':'Bash','shell script':'Shell Script','shell':'Shell',
  'cypress':'Cypress','k6':'k6','postman':'Postman','junit':'JUnit','mockito':'Mockito',
  'canva':'Canva','solid':'SolidJS','solidjs':'SolidJS','jsp':'JSP','primefaces':'PrimeFaces','prime faces':'PrimeFaces',
  'powerbi':'Power BI','power bi':'Power BI','excel':'Excel','looker studio':'Looker Studio','power automate':'Power Automate','powerautomate':'Power Automate',
  'mikrotik':'Mikrotik','advpl':'ADVPL'
};

/* ============ ASSIGNMENTS (localStorage) ============ */
function loadAssignments(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');}catch(e){return {}} }
function saveAssignments(a){ localStorage.setItem(STORAGE_KEY, JSON.stringify(a)); }
function getAssigned(ideaId){ const a=loadAssignments(); return a[ideaId]||[]; }
function setAssigned(ideaId, emails){
  const a = loadAssignments();
  if(emails && emails.length) a[ideaId]=emails; else delete a[ideaId];
  saveAssignments(a);
}
function assignTo(ideaId, email){
  const list = getAssigned(ideaId);
  if(!list.includes(email)) list.push(email);
  setAssigned(ideaId, list);
}
function unassign(ideaId, email){
  setAssigned(ideaId, getAssigned(ideaId).filter(e => e!==email));
}
function ideasForEmail(email){
  const a = loadAssignments();
  return Object.keys(a).filter(k => (a[k]||[]).includes(email));
}

/* ============ DATA NORMALIZATION ============ */
function findColKey(headers, target){
  return headers.find(h => h && h.trim().replace(/\s+/g,' ').toLowerCase() === target.trim().replace(/\s+/g,' ').toLowerCase());
}
function normalizeRows(rows){
  if(!rows.length) return [];
  const headers = Object.keys(rows[0]);
  const map = {};
  for(const k of Object.keys(COL)){ if(!COL[k]) continue; map[k] = findColKey(headers, COL[k]); }
  const contactKey = headers.find(h => /informe seu nome e n.mero de telefone/i.test(h)) || null;
  return rows.map(r => {
    const o = {};
    for(const k of Object.keys(map)) o[k] = (r[map[k]] || '').toString().trim();
    o.contact = contactKey ? (r[contactKey] || '').trim() : '';
    return o;
  }).filter(r => r.name || r.email);
}
function isPlaceholderIdea(title, desc){
  const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
  const t = norm(title);
  const d = norm(desc);
  if(!t) return true;
  if(/^n\/?a$/i.test(t) || t==='.' || t==='..' || t==='...') return true;
  const placeholderRe = /^(sem ide[ia]s?|nao tenho|nao pensei|estou me disponibilizando|apenas quero|quero apenas|quero ajudar|gostaria de ajudar|nada ainda$)/;
  if(placeholderRe.test(t)) return true;
  if(t === d && /^(sem ide|nao tenho|nao pensei|estou me|gostaria)/.test(t)) return true;
  return false;
}
function buildIdeas(rows){
  return rows
    .filter(r => r.ideaTitle && r.ideaTitle.length>2 && !isPlaceholderIdea(r.ideaTitle, r.ideaDesc))
    .map((r,i) => ({
      id: `${r.email||'noemail'}__${i}`,
      title: r.ideaTitle,
      desc: r.ideaDesc,
      stage: r.stage,
      name: r.name,
      email: r.email,
      level: r.level,
      contact: r.contact,
      areas: r.areas,
      techs: r.techs
    }));
}

/* ============ TALLIES ============ */
function tally(values, splitBy=null, limit=null){
  const map = new Map();
  for(const v of values){
    if(!v) continue;
    const items = splitBy ? v.split(splitBy).map(s=>s.trim()).filter(Boolean) : [v.trim()];
    for(const it of items) map.set(it, (map.get(it)||0)+1);
  }
  let arr = [...map.entries()].sort((a,b)=>b[1]-a[1]);
  if(limit) arr = arr.slice(0, limit);
  return {labels:arr.map(x=>x[0]), data:arr.map(x=>x[1])};
}
function tallyTechs(values){
  const map = new Map();
  const norm = s => s.toLowerCase().replace(/\./g,'').replace(/\(.*?\)/g,'').replace(/etc/g,'').trim();
  for(const v of values){
    if(!v) continue;
    const parts = v.split(/[,;\/|]| e |\.\s|\n|\(|\)|–|—/g).map(p => p.trim()).filter(Boolean);
    const seen = new Set();
    for(let p of parts){
      let n = norm(p).replace(/[\.,;]+$/,'');
      if(!n || n.length>30) continue;
      const a = TECH_ALIASES[n] || TECH_ALIASES[n.replace(/\s+/g,'')];
      const key = a || (n.length<=2 ? null : (n.charAt(0).toUpperCase()+n.slice(1)));
      if(!key) continue;
      if(seen.has(key.toLowerCase())) continue;
      seen.add(key.toLowerCase());
      map.set(key, (map.get(key)||0)+1);
    }
  }
  const arr = [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,15);
  return {labels:arr.map(x=>x[0]), data:arr.map(x=>x[1])};
}

/* ============ CHARTS ============ */
function makeChart(id, type, labels, data, opts={}){
  if(charts[id]) charts[id].destroy();
  const ctx = document.getElementById(id);
  if(!ctx) return;
  const isPie = type==='pie' || type==='doughnut';
  charts[id] = new Chart(ctx, {
    type, data:{labels, datasets:[{label:opts.label||'', data, backgroundColor: isPie? labels.map((_,i)=>COLORS[i%COLORS.length]) : 'rgba(124,92,255,.7)', borderColor:'#7c5cff', borderWidth: isPie?0:1, borderRadius:6}]},
    options:{
      indexAxis: opts.horizontal? 'y':'x',
      plugins:{legend:{display:isPie, position:'right', labels:{color:'#cdd5ff', boxWidth:12, font:{size:11}}}, tooltip:{enabled:true}},
      scales: isPie? {} : {
        x:{ticks:{color:'#8a94c7', font:{size:11}}, grid:{color:'rgba(255,255,255,.05)'}},
        y:{ticks:{color:'#8a94c7', font:{size:11}}, grid:{color:'rgba(255,255,255,.05)'}}
      },
      responsive:true, maintainAspectRatio:false
    }
  });
}

/* ============ HELPERS ============ */
function levelTagClass(lvl){
  if(/Iniciante/i.test(lvl)) return 'lvl-iniciante';
  if(/J.nior/i.test(lvl)) return 'lvl-junior';
  if(/Pleno/i.test(lvl)) return 'lvl-pleno';
  if(/S.nior/i.test(lvl)) return 'lvl-senior';
  return '';
}
function escapeHtml(s){return (s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function populateSelect(id, values, splitBy=null){
  const sel = document.getElementById(id); if(!sel) return;
  const current = sel.value;
  const seen = new Set();
  values.forEach(v => {
    if(!v) return;
    const items = splitBy ? v.split(splitBy) : [v];
    items.forEach(x => { x=x.trim(); if(x) seen.add(x); });
  });
  while(sel.options.length>1) sel.remove(1);
  [...seen].sort().forEach(v => { const o=document.createElement('option'); o.value=v; o.textContent=v; sel.appendChild(o); });
  sel.value = current;
}
function rowMatchesTech(row, query){
  if(!query) return true;
  const q = query.toLowerCase().trim();
  return (row.techs||'').toLowerCase().includes(q);
}

/* ============ TAB: OVERVIEW ============ */
function renderOverview(){
  const rows = allRows;
  const total = rows.length;
  const withIdea = allIdeas.length;
  const availMay = rows.filter(r => r.availMay==='Sim').length;
  const willHelp = rows.filter(r => /Sim/i.test(r.helpOthers)).length;
  const inDev = rows.filter(r => /desenvolvimento|prot.tipo|MVP/i.test(r.stage)).length;
  const totalAssignments = Object.values(loadAssignments()).reduce((s,arr)=>s+arr.length,0);
  const cards = [
    {label:'Respostas', value:total, sub:'no censo'},
    {label:'Ideias propostas', value:withIdea, sub:`${total? Math.round(100*withIdea/total):0}% dos respondentes`},
    {label:'Disponíveis em maio', value:availMay, sub:`${total? Math.round(100*availMay/total):0}% do total`},
    {label:'Toparia ajudar', value:willHelp, sub:'sempre que possível'},
    {label:'Ideias em MVP/dev', value:inDev, sub:'já saíram do papel'},
    {label:'Alocações feitas', value:totalAssignments, sub:`em ${Object.keys(loadAssignments()).length} ideias`},
  ];
  document.getElementById('cards').innerHTML = cards.map(c=>`
    <div class="card"><div class="label">${c.label}</div><div class="value">${c.value}</div><div class="sub">${c.sub}</div></div>
  `).join('');

  const lvl = tally(rows.map(r=>r.level)); makeChart('chartLevel','doughnut', lvl.labels, lvl.data);
  const hr = tally(rows.map(r=>r.hours)); makeChart('chartHours','bar', hr.labels, hr.data, {label:'Pessoas'});
  const gh = tally(rows.map(r=>r.github)); makeChart('chartGithub','doughnut', gh.labels, gh.data);
  const ar = tally(rows.map(r=>r.areas), ';', 12); makeChart('chartAreas','bar', ar.labels, ar.data, {horizontal:true, label:'Pessoas'});
  const tc = tallyTechs(rows.map(r=>r.techs)); makeChart('chartTechs','bar', tc.labels, tc.data, {horizontal:true, label:'Menções'});
  const st = tally(rows.map(r=>r.stage)); makeChart('chartStage','bar', st.labels, st.data, {label:'Ideias'});
  const wk = tally(rows.map(r=>r.workMode)); makeChart('chartWork','doughnut', wk.labels, wk.data);

  document.getElementById('footer').textContent = `${total} respostas. ${allIdeas.length} ideias no banco. Última atualização: ${new Date().toLocaleString('pt-BR')}.`;
}

/* ============ TAB: PEOPLE ============ */
function applyPeopleFilters(){
  const q = document.getElementById('pSearch').value.toLowerCase().trim();
  const lvl = document.getElementById('pLevel').value;
  const area = document.getElementById('pArea').value;
  const tech = document.getElementById('pTech').value;
  const hours = document.getElementById('pHours').value;
  const gh = document.getElementById('pGithub').value;
  const wk = document.getElementById('pWork').value;
  const av = document.getElementById('pAvail').value;
  return allRows.filter(r => {
    if(lvl && r.level !== lvl) return false;
    if(area && !(r.areas||'').split(';').map(s=>s.trim()).includes(area)) return false;
    if(hours && r.hours !== hours) return false;
    if(gh && r.github !== gh) return false;
    if(wk && r.workMode !== wk) return false;
    if(av && r.availMay !== av) return false;
    if(!rowMatchesTech(r, tech)) return false;
    if(q){
      const blob = [r.name,r.email,r.areas,r.techs,r.ideaTitle,r.ideaDesc,r.contact].join(' ').toLowerCase();
      if(!blob.includes(q)) return false;
    }
    return true;
  });
}
function renderPeople(){
  const filtered = applyPeopleFilters();
  document.getElementById('pSummary').innerHTML =
    `<span><b>${filtered.length}</b> de ${allRows.length} pessoas</span>` +
    `<span>· <b>${filtered.filter(r=>r.availMay==='Sim').length}</b> disponíveis em maio</span>` +
    `<span>· <b>${filtered.filter(r=>/Sim/i.test(r.helpOthers)).length}</b> querem ajudar</span>`;
  const tbody = document.querySelector('#peopleTable tbody');
  tbody.innerHTML = filtered.map(r => {
    const inIdeas = ideasForEmail(r.email);
    const ideaTags = inIdeas.map(id => {
      const idea = allIdeas.find(i => i.id===id);
      return idea ? `<span class="tag">${escapeHtml(idea.title)}</span>` : '';
    }).join('');
    return `
    <tr>
      <td>${escapeHtml(r.name)}</td>
      <td><a style="color:var(--accent-2)" href="mailto:${escapeHtml(r.email)}">${escapeHtml(r.email)}</a></td>
      <td><span class="tag ${levelTagClass(r.level)}">${escapeHtml(r.level||'')}</span></td>
      <td>${(r.areas||'').split(';').map(a=>a.trim()).filter(Boolean).map(a=>`<span class="tag">${escapeHtml(a)}</span>`).join('')}</td>
      <td style="max-width:280px">${escapeHtml(r.techs)}</td>
      <td>${escapeHtml(r.github)}</td>
      <td>${escapeHtml(r.hours)}</td>
      <td>${escapeHtml(r.ideaTitle)}</td>
      <td>${escapeHtml(r.workMode)}</td>
      <td>${r.availMay==='Sim' ? '<span class="tag good">Sim</span>' : (r.availMay==='Não' ? '<span class="tag bad">Não</span>' : '')}</td>
      <td>${ideaTags || '<span style="color:var(--muted);font-size:11px">—</span>'}</td>
    </tr>`;
  }).join('');
}

/* ============ TAB: BANCO DE IDEIAS ============ */
function renderIdeasBank(){
  const q = (document.getElementById('bSearch')?.value||'').toLowerCase().trim();
  const stage = document.getElementById('bStage')?.value || '';
  const lvl = document.getElementById('bLevel')?.value || '';
  const area = document.getElementById('bArea')?.value || '';
  const filtered = allIdeas.filter(i => {
    if(stage && i.stage!==stage) return false;
    if(lvl && i.level!==lvl) return false;
    if(area && !(i.areas||'').split(';').map(s=>s.trim()).includes(area)) return false;
    if(q){
      const blob = [i.title,i.desc,i.name,i.email,i.areas,i.techs,i.stage].join(' ').toLowerCase();
      if(!blob.includes(q)) return false;
    }
    return true;
  });
  const inDev = filtered.filter(i => /desenvolvimento|prot.tipo|MVP/i.test(i.stage)).length;
  document.getElementById('bSummary').innerHTML =
    `<span><b>${filtered.length}</b> de ${allIdeas.length} ideias</span>` +
    `<span>· <b>${inDev}</b> em MVP/desenvolvimento</span>` +
    `<span>· <b>${filtered.filter(i => getAssigned(i.id).length>0).length}</b> com equipe iniciada</span>`;
  const grid = document.getElementById('bankGrid');
  grid.innerHTML = filtered.length ? filtered.map(i => {
    const count = getAssigned(i.id).length;
    const areaTags = (i.areas||'').split(';').map(a=>a.trim()).filter(Boolean).map(a=>`<span class="tag">${escapeHtml(a)}</span>`).join('');
    return `
      <div class="bank-card">
        <div class="bank-card-head">
          <h3>${escapeHtml(i.title)}</h3>
          <span class="tag">${escapeHtml(i.stage||'sem estágio')}</span>
        </div>
        <div class="meta">por <b>${escapeHtml(i.name)}</b> · <span class="tag ${levelTagClass(i.level)}">${escapeHtml(i.level||'?')}</span></div>
        <p>${escapeHtml(i.desc||'(sem descrição)')}</p>
        <div class="pills">${areaTags}</div>
        <div class="bank-card-foot">
          <span class="count"><b>${count}</b> ${count===1?'membro alocado':'membros alocados'}</span>
          <button class="btn tiny" data-allocate="${escapeHtml(i.id)}">Alocar equipe →</button>
        </div>
      </div>`;
  }).join('') : '<div class="empty-mini">Nenhuma ideia para os filtros atuais.</div>';
  grid.querySelectorAll('[data-allocate]').forEach(b => {
    b.onclick = () => {
      selectedIdeaId = b.dataset.allocate;
      const tabBtn = document.querySelector('nav.tabs button[data-tab="ideas"]');
      if(tabBtn) tabBtn.click();
      window.scrollTo({top:0, behavior:'smooth'});
    };
  });
}

/* ============ TAB: IDEAS & EQUIPES ============ */
function renderIdeaList(){
  const q = (document.getElementById('iSearch').value||'').toLowerCase().trim();
  const list = document.getElementById('ideaList');
  const filtered = allIdeas.filter(i => {
    if(!q) return true;
    return (i.title+' '+i.desc+' '+i.name).toLowerCase().includes(q);
  });
  list.innerHTML = filtered.map(i => {
    const count = getAssigned(i.id).length;
    return `
      <div class="idea-item ${i.id===selectedIdeaId?'active':''}" data-id="${i.id}">
        <h4>${escapeHtml(i.title)} ${count? `<span class="count">${count}</span>`:''}</h4>
        <div class="author">por ${escapeHtml(i.name)} · ${escapeHtml(i.stage||'sem estágio')}</div>
      </div>`;
  }).join('') || '<div class="empty-mini">Nenhuma ideia encontrada.</div>';
  list.querySelectorAll('.idea-item').forEach(el => {
    el.onclick = () => { selectedIdeaId = el.dataset.id; renderIdeaList(); renderIdeaDetail(); };
  });
}

function applyCandidateFilters(){
  const q = (document.getElementById('cSearch')?.value||'').toLowerCase().trim();
  const lvl = document.getElementById('cLevel')?.value;
  const area = document.getElementById('cArea')?.value;
  const tech = document.getElementById('cTech')?.value;
  const hours = document.getElementById('cHours')?.value;
  const gh = document.getElementById('cGithub')?.value;
  const wk = document.getElementById('cWork')?.value;
  const av = document.getElementById('cAvail')?.value;
  const onlyHelp = document.getElementById('cOnlyHelp')?.checked;
  const onlyFree = document.getElementById('cOnlyFree')?.checked;
  const assigned = getAssigned(selectedIdeaId);
  return allRows.filter(r => {
    if(assigned.includes(r.email)) return false;
    if(lvl && r.level !== lvl) return false;
    if(area && !(r.areas||'').split(';').map(s=>s.trim()).includes(area)) return false;
    if(hours && r.hours !== hours) return false;
    if(gh && r.github !== gh) return false;
    if(wk && r.workMode !== wk) return false;
    if(av && r.availMay !== av) return false;
    if(!rowMatchesTech(r, tech)) return false;
    if(onlyHelp && !/Sim/i.test(r.helpOthers)) return false;
    if(onlyFree && ideasForEmail(r.email).length>0) return false;
    if(q){
      const blob = [r.name,r.email,r.areas,r.techs,r.ideaTitle].join(' ').toLowerCase();
      if(!blob.includes(q)) return false;
    }
    return true;
  });
}

function personCard(r, action){
  const otherIdeas = ideasForEmail(r.email).filter(id => id!==selectedIdeaId);
  const otherTags = otherIdeas.map(id => {
    const i = allIdeas.find(x => x.id===id);
    return i ? `<span class="tag">${escapeHtml(i.title)}</span>` : '';
  }).join('');
  const areaTags = (r.areas||'').split(';').map(a=>a.trim()).filter(Boolean).map(a=>`<span class="tag">${escapeHtml(a)}</span>`).join('');
  return `
    <div class="person ${action==='remove'?'assigned':''}">
      <div class="row1">
        <div>
          <div class="name">${escapeHtml(r.name)} <span class="tag ${levelTagClass(r.level)}">${escapeHtml(r.level||'')}</span></div>
          <div class="email">${escapeHtml(r.email)}${r.contact? ' · '+escapeHtml(r.contact):''}</div>
        </div>
        ${action==='add'
          ? `<button class="btn tiny" data-add="${escapeHtml(r.email)}">+ Adicionar</button>`
          : `<button class="btn tiny danger" data-remove="${escapeHtml(r.email)}">Remover</button>`}
      </div>
      <div class="meta">
        ${escapeHtml(r.github||'?')} · ${escapeHtml(r.hours||'?')} · ${escapeHtml(r.workMode||'?')} ·
        ${r.availMay==='Sim' ? '<span style="color:var(--good)">disponível em maio</span>' : (r.availMay==='Não' ? '<span style="color:var(--bad)">indisponível em maio</span>' : '')}
      </div>
      <div class="pills">${areaTags}</div>
      <div class="techs">${escapeHtml(r.techs||'')}</div>
      ${otherTags? `<div class="meta" style="margin-top:6px">também em: ${otherTags}</div>` : ''}
    </div>`;
}

function renderIdeaDetail(){
  const detail = document.getElementById('ideaDetail');
  if(!selectedIdeaId){ detail.innerHTML = '<div class="empty-mini">Selecione uma ideia à esquerda para começar a montar a equipe.</div>'; return; }
  const idea = allIdeas.find(i => i.id===selectedIdeaId);
  if(!idea){ detail.innerHTML = '<div class="empty-mini">Ideia não encontrada.</div>'; return; }
  const assignedEmails = getAssigned(idea.id);
  const assignedRows = assignedEmails.map(e => allRows.find(r => r.email===e)).filter(Boolean);
  const author = allRows.find(r => r.email===idea.email);

  detail.innerHTML = `
    <div class="idea-hero">
      <h2>${escapeHtml(idea.title)}</h2>
      <div class="meta">
        Autor(a): <b>${escapeHtml(idea.name)}</b> ·
        <span class="tag ${levelTagClass(idea.level)}">${escapeHtml(idea.level||'?')}</span> ·
        Estágio: <b>${escapeHtml(idea.stage||'não informado')}</b>
        ${idea.contact? ' · contato: '+escapeHtml(idea.contact):''}
      </div>
      <p>${escapeHtml(idea.desc||'(sem descrição)')}</p>
      ${idea.areas? `<div style="margin-top:10px">${(idea.areas||'').split(';').map(a=>a.trim()).filter(Boolean).map(a=>`<span class="tag">${escapeHtml(a)}</span>`).join('')}</div>`:''}
    </div>

    <div class="columns">
      <div class="column">
        <h3>Equipe (${assignedEmails.length}) ${author && !assignedEmails.includes(author.email) ? `<button class="btn tiny secondary" id="addAuthorBtn">+ Adicionar autor(a)</button>`:''}</h3>
        <div id="teamList">
          ${assignedRows.length
            ? assignedRows.map(r => personCard(r,'remove')).join('')
            : '<div class="empty-mini">Nenhum membro alocado ainda. Use o painel ao lado para adicionar pessoas.</div>'}
        </div>
      </div>

      <div class="column">
        <h3>Adicionar membros <span style="color:var(--muted);font-weight:400;font-size:12px" id="cCount"></span></h3>
        <div class="filters">
          <input id="cSearch" placeholder="Buscar..." />
          <select id="cLevel"><option value="">Nível</option></select>
          <select id="cArea"><option value="">Área</option></select>
          <input id="cTech" placeholder="Tecnologia (ex: react, java)" />
          <select id="cHours"><option value="">Horas/semana</option></select>
          <select id="cGithub"><option value="">GitHub</option></select>
          <select id="cWork"><option value="">Preferência de trabalho</option></select>
          <select id="cAvail"><option value="">Disponível em maio?</option><option>Sim</option><option>Não</option></select>
          <label class="check"><input type="checkbox" id="cOnlyHelp" /> Só "topa ajudar"</label>
          <label class="check"><input type="checkbox" id="cOnlyFree" /> Só sem alocação</label>
        </div>
        <div id="candidateList" style="max-height:560px;overflow:auto;padding-right:4px"></div>
      </div>
    </div>
  `;

  populateSelect('cLevel', allRows.map(r=>r.level));
  populateSelect('cArea', allRows.map(r=>r.areas), ';');
  populateSelect('cHours', allRows.map(r=>r.hours));
  populateSelect('cGithub', allRows.map(r=>r.github));
  populateSelect('cWork', allRows.map(r=>r.workMode));

  ['cSearch','cLevel','cArea','cTech','cHours','cGithub','cWork','cAvail','cOnlyHelp','cOnlyFree'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    el.addEventListener('input', renderCandidates);
    el.addEventListener('change', renderCandidates);
  });

  if(document.getElementById('addAuthorBtn')){
    document.getElementById('addAuthorBtn').onclick = () => {
      assignTo(selectedIdeaId, author.email);
      renderIdeaList(); renderIdeaDetail();
    };
  }

  detail.querySelectorAll('[data-remove]').forEach(b => {
    b.onclick = () => { unassign(selectedIdeaId, b.dataset.remove); renderIdeaList(); renderIdeaDetail(); };
  });

  renderCandidates();
}

function renderCandidates(){
  const list = document.getElementById('candidateList'); if(!list) return;
  const filtered = applyCandidateFilters();
  document.getElementById('cCount').textContent = `(${filtered.length} candidatos)`;
  list.innerHTML = filtered.length
    ? filtered.map(r => personCard(r,'add')).join('')
    : '<div class="empty-mini">Nenhuma pessoa para os filtros atuais.</div>';
  list.querySelectorAll('[data-add]').forEach(b => {
    b.onclick = () => { assignTo(selectedIdeaId, b.dataset.add); renderIdeaList(); renderIdeaDetail(); };
  });
}

/* ============ FILE LOADING / EXPORT / IMPORT ============ */
function handleFileLoad(file){
  Papa.parse(file, {header:true, skipEmptyLines:true, complete: r => render(r.data)});
}

function exportAssignments(){
  const a = loadAssignments();
  if(!Object.keys(a).length){ alert('Nenhuma alocação para exportar ainda.'); return; }
  const expanded = {};
  for(const id of Object.keys(a)){
    const idea = allIdeas.find(i => i.id===id);
    expanded[id] = {
      ideia: idea? idea.title : id,
      autor: idea? idea.name : '',
      membros: a[id].map(em => {
        const p = allRows.find(r => r.email===em);
        return p? {nome:p.name, email:p.email, telefone:p.contact} : {email:em};
      })
    };
  }
  const blob = new Blob([JSON.stringify(expanded,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a2 = document.createElement('a');
  a2.href = url;
  a2.download = 'alocacoes-juninhos.json';
  a2.click();
  URL.revokeObjectURL(url);
}

function importAssignments(file){
  const reader = new FileReader();
  reader.onload = e => {
    let data;
    try { data = JSON.parse(e.target.result); }
    catch(err){ alert('JSON inválido: ' + err.message); return; }

    // Aceita formato exportado ({id: {ideia, autor, membros:[{email}]}}) ou formato puro ({id: [emails]})
    const incoming = {};
    for(const id of Object.keys(data)){
      const v = data[id];
      if(Array.isArray(v)){
        incoming[id] = v.filter(Boolean);
      } else if(v && Array.isArray(v.membros)){
        incoming[id] = v.membros.map(m => m.email).filter(Boolean);
      }
    }
    const incomingCount = Object.keys(incoming).length;
    if(!incomingCount){ alert('Nenhuma alocação encontrada no arquivo.'); return; }

    const current = loadAssignments();
    let final;
    if(Object.keys(current).length){
      const replace = confirm(
        `Já existem alocações salvas (${Object.keys(current).length} ideias).\n\n` +
        `OK = SUBSTITUIR pelas do arquivo (${incomingCount} ideias)\n` +
        `Cancelar = MESCLAR (mantém as atuais e adiciona as novas)`
      );
      if(replace){
        final = incoming;
      } else {
        final = {...current};
        for(const id of Object.keys(incoming)){
          const merged = new Set([...(final[id]||[]), ...incoming[id]]);
          final[id] = [...merged];
        }
      }
    } else {
      final = incoming;
    }
    saveAssignments(final);

    // Re-renderiza tudo
    if(allRows.length){
      renderOverview();
      renderPeople();
      renderIdeasBank();
      renderIdeaList();
      renderIdeaDetail();
    }
    alert(`Importação concluída: ${incomingCount} ideias com alocações.`);
  };
  reader.readAsText(file);
}

/* ============ TABS WIRING ============ */
function setupTabs(){
  document.querySelectorAll('nav.tabs button[data-tab]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('nav.tabs button[data-tab]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-panel').forEach(p => {
        const match = p.dataset.tab===tab;
        p.style.display = match? '':'none';
        p.classList.toggle('active', match);
      });
      if(tab==='overview') renderOverview();
      if(tab==='bank') renderIdeasBank();
      if(tab==='ideas'){ renderIdeaList(); renderIdeaDetail(); }
    };
  });
}

/* ============ MAIN RENDER ============ */
function render(rawRows){
  allRows = normalizeRows(rawRows);
  if(!allRows.length){ alert('CSV sem dados reconhecidos.'); return; }
  allIdeas = buildIdeas(allRows);

  document.getElementById('empty').style.display = 'none';
  document.getElementById('tabs').style.display = '';
  document.querySelectorAll('.tab-panel').forEach(p => p.style.display = p.classList.contains('active') ? '' : 'none');
  document.getElementById('countPill').style.display = '';
  document.getElementById('countPill').textContent = `${allRows.length} respostas · ${allIdeas.length} ideias`;
  document.getElementById('subtitle').textContent = 'Visão geral interativa do censo e do banco de ideias.';

  populateSelect('pLevel', allRows.map(r=>r.level));
  populateSelect('pArea', allRows.map(r=>r.areas), ';');
  populateSelect('pHours', allRows.map(r=>r.hours));
  populateSelect('pGithub', allRows.map(r=>r.github));
  populateSelect('pWork', allRows.map(r=>r.workMode));

  ['pSearch','pLevel','pArea','pTech','pHours','pGithub','pWork','pAvail'].forEach(id=>{
    document.getElementById(id).addEventListener('input', renderPeople);
    document.getElementById(id).addEventListener('change', renderPeople);
  });
  document.getElementById('iSearch').addEventListener('input', renderIdeaList);

  populateSelect('bStage', allIdeas.map(i=>i.stage));
  populateSelect('bLevel', allIdeas.map(i=>i.level));
  populateSelect('bArea', allIdeas.map(i=>i.areas), ';');
  ['bSearch','bStage','bLevel','bArea'].forEach(id=>{
    document.getElementById(id).addEventListener('input', renderIdeasBank);
    document.getElementById(id).addEventListener('change', renderIdeasBank);
  });

  renderOverview();
  renderPeople();
  renderIdeasBank();
  renderIdeaList();
  renderIdeaDetail();
}

/* ============ INIT ============ */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loadBtn').onclick = () => document.getElementById('fileInput').click();
  document.getElementById('fileInput').addEventListener('change', e => {
    const f = e.target.files[0]; if(f) handleFileLoad(f);
  });
  document.getElementById('importBtn').onclick = () => document.getElementById('importInput').click();
  document.getElementById('importInput').addEventListener('change', e => {
    const f = e.target.files[0];
    if(f){ importAssignments(f); e.target.value = ''; }
  });
  document.getElementById('exportBtn').onclick = exportAssignments;
  setupTabs();
});
