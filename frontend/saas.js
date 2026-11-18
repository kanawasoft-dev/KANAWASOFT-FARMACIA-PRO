/* KANAWA SOFT FARMÁCIA PRO — Central SaaS Admin
 * Dados reais via Supabase Data API; acesso validado previamente em platform_admins.
 * Não usa service_role nem dados simulados.
 */
(() => {
  "use strict";
  const sb = window.KANAWA_SUPABASE;
  const root = document.querySelector("#content");
  const nav = document.querySelector("#navigation");
  const shell = document.querySelector(".app-shell");
  if (!sb || !root || !nav) return;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const date = value => value ? new Date(value).toLocaleDateString("pt-AO") : "—";
  const toast = message => {
    const region=document.querySelector("#toastRegion");
    const el=document.createElement("div"); el.className="toast"; el.textContent=message;
    region.append(el); setTimeout(()=>el.remove(),3200);
  };
  const links = [
    ["dashboard","▦","Visão geral"],["pharmacies","▣","Farmácias"],
    ["users","♙","Utilizadores"],["members","♧","Acessos e equipas"],
    ["security","⚿","Segurança"]
  ];
  nav.innerHTML = links.map(([id,icon,label])=>`<button class="nav-item" data-page="${id}"><span class="nav-icon">${icon}</span>${label}</button>`).join("");
  const state={page:"dashboard",pharmacies:[],profiles:[],members:[],loading:false};
  const fmt = n => new Intl.NumberFormat("pt-AO").format(n||0);
  const stat = (label,value,sub,icon) => `<article class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon">${icon}</span></div><div class="stat-value">${fmt(value)}</div><div class="stat-note">${sub}</div></article>`;
  const head = (title,desc,action="") => `<div class="page-head"><div><div class="eyebrow">KANAWA SOFT · CENTRAL SAAS</div><h1>${title}</h1><p>${desc}</p></div>${action}</div>`;
  async function loadData(){
    state.loading=true;
    const [p,u,m]=await Promise.all([
      sb.from("pharmacies").select("id,name,nif,country_code,currency_code,status,created_at").order("created_at",{ascending:false}),
      sb.from("profiles").select("id,full_name,phone,preferred_locale,created_at"),
      sb.from("pharmacy_members").select("id,pharmacy_id,user_id,role,status,created_at")
    ]);
    state.loading=false;
    const err=[p,u,m].find(x=>x.error);
    if(err) throw err.error;
    state.pharmacies=p.data||[];state.profiles=u.data||[];state.members=m.data||[];
  }
  function dashboard(){
    const active=state.pharmacies.filter(x=>x.status==="active").length;
    const suspended=state.pharmacies.filter(x=>x.status!=="active").length;
    return head("Painel Central SaaS","Monitorização global da plataforma KANAWA SOFT.")+
      `<div class="stats-grid">${stat("Farmácias registadas",state.pharmacies.length,"Total de organizações","▣")}${stat("Farmácias activas",active,"Com estado active","✓")}${stat("Utilizadores",state.profiles.length,"Perfis registados","♙")}${stat("Vínculos de equipa",state.members.length,"Membros associados","♧")}</div>
      <div class="dashboard-grid"><section class="panel"><div class="panel-head"><h3>Farmácias recentes</h3><button class="mini-btn" data-go="pharmacies">Ver todas</button></div>
      ${state.pharmacies.slice(0,6).map(p=>`<div class="activity-row"><div><b>${esc(p.name)}</b><small>${esc(p.country_code||"País não definido")} · Criada em ${date(p.created_at)}</small></div><span class="pill ${p.status==="active"?"green":"red"}">${esc(p.status||"sem estado")}</span></div>`).join("")||'<div class="empty">Ainda não existem farmácias registadas.</div>'}</section>
      <section class="panel"><div class="panel-head"><h3>Resumo da plataforma</h3><span class="panel-sub">Dados Supabase</span></div>
      <div class="alert-row"><div><b>Administradores SaaS</b><small>Contas com acesso à Central</small></div><span class="pill green">Protegido</span></div>
      <div class="alert-row"><div><b>Isolamento por farmácia</b><small>Políticas de Row Level Security</small></div><span class="pill green">RLS activo</span></div>
      <div class="alert-row"><div><b>Última actualização</b><small>${new Date().toLocaleString("pt-AO")}</small></div><span class="pill">Agora</span></div></section></div>`;
  }
  function pharmacies(){
    return head("Gestão de farmácias","Consultar organizações registadas na plataforma.")+
    `<div class="toolbar"><input class="search" id="searchRows" placeholder="Pesquisar farmácia, NIF ou país…"><span class="panel-sub">${state.pharmacies.length} registo(s)</span></div>
    <div class="table-card"><div class="table-wrap"><table><thead><tr><th>Farmácia</th><th>NIF</th><th>País</th><th>Moeda</th><th>Estado</th><th>Registo</th></tr></thead><tbody id="rows">${pharmacyRows(state.pharmacies)}</tbody></table></div></div>`;
  }
  function pharmacyRows(rows){return rows.length?rows.map(p=>`<tr><td><strong>${esc(p.name)}</strong></td><td>${esc(p.nif||"—")}</td><td>${esc(p.country_code||"—")}</td><td>${esc(p.currency_code||"—")}</td><td><span class="pill ${p.status==="active"?"green":"red"}">${esc(p.status||"—")}</span></td><td>${date(p.created_at)}</td></tr>`).join(""):'<tr><td class="empty" colspan="6">Nenhuma farmácia encontrada.</td></tr>'}
  function users(){
    return head("Utilizadores","Perfis de utilizador registados. As credenciais e palavras-passe nunca são exibidas.")+
    `<div class="toolbar"><input class="search" id="searchRows" placeholder="Pesquisar nome ou telefone…"><span class="panel-sub">${state.profiles.length} perfil(is)</span></div><div class="table-card"><div class="table-wrap"><table><thead><tr><th>Nome</th><th>Telefone</th><th>Idioma</th><th>Desde</th></tr></thead><tbody id="rows">${state.profiles.map(p=>`<tr><td><strong>${esc(p.full_name||"Sem nome")}</strong></td><td>${esc(p.phone||"—")}</td><td>${esc(p.preferred_locale||"—")}</td><td>${date(p.created_at)}</td></tr>`).join("")||'<tr><td class="empty" colspan="4">Sem perfis registados.</td></tr>'}</tbody></table></div></div>`;
  }
  function members(){
    const names=new Map(state.pharmacies.map(p=>[p.id,p.name]));
    return head("Acessos e equipas","Vínculos de utilizadores às respectivas farmácias.")+
    `<div class="toolbar"><input class="search" id="searchRows" placeholder="Pesquisar farmácia, função ou estado…"><span class="panel-sub">${state.members.length} vínculo(s)</span></div><div class="table-card"><div class="table-wrap"><table><thead><tr><th>Farmácia</th><th>Utilizador</th><th>Função</th><th>Estado</th><th>Desde</th></tr></thead><tbody id="rows">${state.members.map(m=>`<tr><td>${esc(names.get(m.pharmacy_id)||m.pharmacy_id)}</td><td>${esc(m.user_id)}</td><td>${esc(m.role)}</td><td><span class="pill ${m.status==="active"?"green":"red"}">${esc(m.status)}</span></td><td>${date(m.created_at)}</td></tr>`).join("")||'<tr><td class="empty" colspan="5">Sem membros registados.</td></tr>'}</tbody></table></div></div>`;
  }
  function security(){
    return head("Segurança e controlo","Estado das protecções essenciais do painel.")+
    `<div class="report-grid"><div class="report-box"><h3>Autenticação</h3><p>Login realizado através do Supabase Auth. A sessão é validada antes de carregar esta área.</p><span class="pill green">Activo</span></div><div class="report-box"><h3>Autorização SaaS</h3><p>O utilizador tem de existir em <code>public.platform_admins</code>. Contas comuns não entram no painel.</p><span class="pill green">Validado</span></div><div class="report-box"><h3>Row Level Security</h3><p>As consultas dependem das políticas RLS do projecto. Não é utilizada chave secreta no navegador.</p><span class="pill green">RLS activo</span></div><div class="report-box"><h3>Operações administrativas</h3><p>Suspensão, planos, cobrança e gestão de convites serão adicionados após as respectivas regras de negócio e auditoria.</p><span class="pill">Próxima fase</span></div></div>`;
  }
  function render(){
    document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===state.page));
    document.querySelector("#pageTitle").textContent=links.find(x=>x[0]===state.page)?.[2]||"Central SaaS";
    root.innerHTML=state.page==="dashboard"?dashboard():state.page==="pharmacies"?pharmacies():state.page==="users"?users():state.page==="members"?members():security();
    const search=document.querySelector("#searchRows");
    if(search)search.addEventListener("input",()=>{
      const term=search.value.toLocaleLowerCase();
      if(state.page==="pharmacies")document.querySelector("#rows").innerHTML=pharmacyRows(state.pharmacies.filter(p=>[p.name,p.nif,p.country_code].join(" ").toLowerCase().includes(term)));
      else {
        const rows=state.page==="users"?state.profiles:state.members;
        const filtered=rows.filter(x=>Object.values(x).join(" ").toLowerCase().includes(term));
        document.querySelector("#rows").innerHTML=filtered.map(x=>state.page==="users"?`<tr><td>${esc(x.full_name||"Sem nome")}</td><td>${esc(x.phone||"—")}</td><td>${esc(x.preferred_locale||"—")}</td><td>${date(x.created_at)}</td></tr>`:`<tr><td>${esc(state.pharmacies.find(p=>p.id===x.pharmacy_id)?.name||x.pharmacy_id)}</td><td>${esc(x.user_id)}</td><td>${esc(x.role)}</td><td>${esc(x.status)}</td><td>${date(x.created_at)}</td></tr>`).join("")||'<tr><td class="empty">Sem resultados.</td></tr>';
      }
    });
  }
  async function refresh(){try{await loadData();render()}catch(e){console.error(e);root.innerHTML=head("Não foi possível carregar os dados","Verifique a ligação, as permissões RLS e a exposição da Data API.")+`<div class="notice">${esc(e.message||"Erro ao consultar Supabase")}</div><button class="btn btn-primary" id="retry">Tentar novamente</button>`;document.querySelector("#retry").onclick=refresh}}
  nav.addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b){state.page=b.dataset.page;render();document.querySelector("#sidebar").classList.remove("open")}});
  document.querySelector("#menuToggle").onclick=()=>document.querySelector("#sidebar").classList.toggle("open");
  document.querySelector("#userButton").onclick=async()=>{if(confirm("Terminar a sessão do Super Administrador?")){const {error}=await sb.auth.signOut();if(error)toast(error.message);else location.reload()}};
  document.querySelector("#year").textContent=new Date().getFullYear();
  document.querySelector("#today").textContent=new Date().toLocaleDateString("pt-AO",{day:"2-digit",month:"short",year:"numeric"});
  const brand=document.querySelector(".brand");if(brand)brand.querySelector("small").textContent="CENTRAL SAAS";
  const footer=document.querySelector(".sidebar-footer");if(footer)footer.innerHTML='<span class="status-dot"></span> Plataforma SaaS<small>Administração central</small>';
  refresh();
})();