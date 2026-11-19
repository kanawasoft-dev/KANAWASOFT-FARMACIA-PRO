/* KANAWA SOFT FARMÁCIA PRO — Central SaaS Admin
 * Dados reais via Supabase Data API; acesso validado previamente em platform_admins.
 * Não usa service_role nem dados simulados.
 */
(() => {
  "use strict";
  const sb = window.KANAWA_SUPABASE;
  const root = document.querySelector("#content");
  const nav = document.querySelector("#navigation");
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
    ["applications","▤","Adesões e documentos"],
    ["users","♙","Utilizadores"],["members","♧","Acessos e equipas"],
    ["security","⚿","Segurança"]
  ];
  nav.innerHTML = links.map(([id,icon,label])=>`<button class="nav-item" data-page="${id}"><span class="nav-icon">${icon}</span>${label}</button>`).join("");
  const state={page:"dashboard",pharmacies:[],profiles:[],members:[],applications:[],documents:[],loading:false};
  const fmt = n => new Intl.NumberFormat("pt-AO").format(n||0);
  const stat = (label,value,sub,icon) => `<article class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon">${icon}</span></div><div class="stat-value">${fmt(value)}</div><div class="stat-note">${sub}</div></article>`;
  const head = (title,desc,action="") => `<div class="page-head"><div><div class="eyebrow">KANAWA SOFT · CENTRAL SAAS</div><h1>${title}</h1><p>${desc}</p></div>${action}</div>`;
  const statusPill = status => `<span class="pill ${status==="approved"||status==="active"?"green":status==="rejected"||status==="suspended"?"red":""}">${esc(status||"pendente")}</span>`;
  async function loadData(){
    state.loading=true;
    const [p,u,m,a,d]=await Promise.all([
      sb.from("pharmacies").select("id,name,nif,country_code,currency_code,status,created_at").order("created_at",{ascending:false}),
      sb.from("profiles").select("id,full_name,phone,preferred_locale,created_at"),
      sb.from("pharmacy_members").select("id,pharmacy_id,user_id,role,status,created_at"),
      sb.from("pharmacy_applications").select("*").order("created_at",{ascending:false}),
      sb.from("pharmacy_documents").select("*").order("created_at",{ascending:false})
    ]);
    state.loading=false;
    const err=[p,u,m,a,d].find(x=>x.error);
    if(err) throw err.error;
    state.pharmacies=p.data||[];state.profiles=u.data||[];state.members=m.data||[];
    state.applications=a.data||[];state.documents=d.data||[];
  }
  function dashboard(){
    const active=state.pharmacies.filter(x=>x.status==="active").length;
    const pending=state.applications.filter(x=>["draft","documents_pending","submitted","in_review"].includes(x.status)).length;
    return head("Painel Central SaaS","Monitorização global da plataforma KANAWA SOFT.")+
      `<div class="stats-grid">${stat("Farmácias registadas",state.pharmacies.length,"Total de organizações","▣")}${stat("Farmácias activas",active,"Com estado active","✓")}${stat("Utilizadores",state.profiles.length,"Perfis registados","♙")}${stat("Adesões em análise",pending,"Candidaturas por validar","▤")}</div>
      <div class="dashboard-grid"><section class="panel"><div class="panel-head"><h3>Farmácias recentes</h3><button class="mini-btn" data-go="pharmacies">Ver todas</button></div>
      ${state.pharmacies.slice(0,6).map(p=>`<div class="activity-row"><div><b>${esc(p.name)}</b><small>${esc(p.country_code||"País não definido")} · Criada em ${date(p.created_at)}</small></div>${statusPill(p.status)}</div>`).join("")||'<div class="empty">Ainda não existem farmácias registadas.</div>'}</section>
      <section class="panel"><div class="panel-head"><h3>Adesões recentes</h3><button class="mini-btn" data-go="applications">Analisar</button></div>
      ${state.applications.slice(0,5).map(a=>`<div class="activity-row"><div><b>${esc(a.trade_name)}</b><small>NIF ${esc(a.nif)} · ${esc(a.province)}</small></div>${statusPill(a.status)}</div>`).join("")||'<div class="empty">Nenhuma candidatura submetida.</div>'}</section></div>`;
  }
  function pharmacies(){
    return head("Gestão de farmácias","Consultar organizações registadas na plataforma.")+
    `<div class="toolbar"><input class="search" id="searchRows" placeholder="Pesquisar farmácia, NIF ou país…"><span class="panel-sub">${state.pharmacies.length} registo(s)</span></div>
    <div class="table-card"><div class="table-wrap"><table><thead><tr><th>Farmácia</th><th>NIF</th><th>País</th><th>Moeda</th><th>Estado</th><th>Registo</th></tr></thead><tbody id="rows">${pharmacyRows(state.pharmacies)}</tbody></table></div></div>`;
  }
  function pharmacyRows(rows){return rows.length?rows.map(p=>`<tr><td><strong>${esc(p.name)}</strong></td><td>${esc(p.nif||"—")}</td><td>${esc(p.country_code||"—")}</td><td>${esc(p.currency_code||"—")}</td><td>${statusPill(p.status)}</td><td>${date(p.created_at)}</td></tr>`).join(""):'<tr><td class="empty" colspan="6">Nenhuma farmácia encontrada.</td></tr>'}
  function applications(){
    const pharmacyNames=new Map(state.pharmacies.map(p=>[p.id,p.name]));
    return head("Adesões e documentos","Analisar os dados empresariais e os documentos privados enviados por cada farmácia.")+
    `<div class="notice" style="margin-bottom:16px">A aprovação da candidatura na plataforma não substitui o alvará nem o licenciamento oficial da autoridade competente.</div>
    <div class="table-card"><div class="table-wrap"><table><thead><tr><th>Empresa / Farmácia</th><th>NIF</th><th>Localização</th><th>Documentos</th><th>Estado</th><th>Acção</th></tr></thead><tbody>
    ${state.applications.map(a=>{
      const docs=state.documents.filter(d=>d.pharmacy_id===a.pharmacy_id);
      return `<tr><td><strong>${esc(a.legal_name)}</strong><small style="display:block">${esc(a.trade_name)} · ${esc(pharmacyNames.get(a.pharmacy_id)||"")}</small></td><td>${esc(a.nif)}</td><td>${esc(a.municipality)}, ${esc(a.province)}</td><td>${docs.length} ficheiro(s) · ${docs.filter(d=>d.status==="approved").length} aprovado(s)</td><td>${statusPill(a.status)}</td><td><button class="mini-btn" data-open-application="${a.pharmacy_id}">Ver candidatura</button></td></tr>`;
    }).join("")||'<tr><td class="empty" colspan="6">Ainda não existem candidaturas empresariais.</td></tr>'}
    </tbody></table></div></div>`;
  }
  function applicationDetail(pharmacyId){
    const a=state.applications.find(x=>x.pharmacy_id===pharmacyId);
    if(!a)return '<div class="empty">Candidatura não encontrada.</div>';
    const docs=state.documents.filter(d=>d.pharmacy_id===pharmacyId);
    return head("Análise da candidatura",`${a.legal_name} · NIF ${a.nif}`,'<button class="mini-btn" data-back-applications>Voltar à lista</button>')+
    `<div class="report-grid">
      <div class="report-box"><h3>Dados da empresa</h3><p><b>Nome comercial:</b> ${esc(a.trade_name)}<br><b>Razão social:</b> ${esc(a.legal_name)}<br><b>NIF:</b> ${esc(a.nif)}<br><b>Forma jurídica:</b> ${esc(a.legal_form||"—")}<br><b>Telefone:</b> ${esc(a.phone)}<br><b>E-mail:</b> ${esc(a.contact_email)}</p></div>
      <div class="report-box"><h3>Endereço</h3><p>${esc(a.address)}<br>${esc(a.municipality)}, ${esc(a.province)}<br>Angola</p></div>
      <div class="report-box"><h3>Representante legal</h3><p>${esc(a.representative_name)}<br>BI: ${esc(a.representative_bi||"—")}</p></div>
      <div class="report-box"><h3>Responsável técnico</h3><p>${esc(a.technical_director_name||"—")}<br>Registo/licença: ${esc(a.technical_director_license||"—")}<br>Alvará: ${esc(a.pharmacy_license_number||"—")}</p></div><div class="report-box"><h3>Esclarecimentos da empresa</h3><p>${esc(a.applicant_notes||"Nenhum esclarecimento adicional indicado.")}</p></div>
    </div>
    <section class="panel" style="margin-top:18px"><div class="panel-head"><h3>Documentos enviados</h3><span class="panel-sub">${docs.length} ficheiro(s)</span></div>
    ${docs.map(d=>`<div class="activity-row"><div><b>${esc(d.document_type)} — ${esc(d.document_name)}</b><small>${esc(d.mime_type)} · ${fmt(Math.ceil(d.size_bytes/1024))} KB · Enviado em ${date(d.created_at)} · Validade: ${date(d.expires_on)}</small><small>Estado: ${esc(d.status)} ${d.reviewer_note?`· Nota: ${esc(d.reviewer_note)}`:""}</small></div><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="mini-btn" data-view-document="${d.id}">Abrir</button><button class="mini-btn" data-review-document="${d.id}" data-document-status="approved">Aprovar</button><button class="mini-btn" data-review-document="${d.id}" data-document-status="rejected">Rejeitar</button></div></div>`).join("")||'<div class="empty">Nenhum documento carregado.</div>'}
    </section>
    <section class="panel" style="margin-top:18px"><div class="panel-head"><h3>Decisão da Central SaaS</h3>${statusPill(a.status)}</div>
    <p class="panel-sub">Para aprovar, a candidatura deve estar submetida, os cinco documentos obrigatórios devem estar aprovados e não pode existir qualquer documento pendente ou rejeitado. A decisão é validada e gravada numa única transacção no banco de dados.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
      <button class="btn btn-light" data-set-application="${pharmacyId}" data-application-status="in_review">Marcar em análise</button>
      <button class="btn btn-primary" data-set-application="${pharmacyId}" data-application-status="approved">Aprovar candidatura</button>
      <button class="btn btn-light" data-set-application="${pharmacyId}" data-application-status="rejected">Rejeitar candidatura</button>
    </div></section>`;
  }
  function users(){
    return head("Utilizadores","Perfis de utilizador registados. As credenciais e palavras-passe nunca são exibidas.")+
    `<div class="toolbar"><input class="search" id="searchRows" placeholder="Pesquisar nome ou telefone…"><span class="panel-sub">${state.profiles.length} perfil(is)</span></div><div class="table-card"><div class="table-wrap"><table><thead><tr><th>Nome</th><th>Telefone</th><th>Idioma</th><th>Desde</th></tr></thead><tbody id="rows">${state.profiles.map(p=>`<tr><td><strong>${esc(p.full_name||"Sem nome")}</strong></td><td>${esc(p.phone||"—")}</td><td>${esc(p.preferred_locale||"—")}</td><td>${date(p.created_at)}</td></tr>`).join("")||'<tr><td class="empty" colspan="4">Sem perfis registados.</td></tr>'}</tbody></table></div></div>`;
  }
  function members(){
    const names=new Map(state.pharmacies.map(p=>[p.id,p.name]));
    return head("Acessos e equipas","Vínculos de utilizadores às respectivas farmácias.")+
    `<div class="toolbar"><input class="search" id="searchRows" placeholder="Pesquisar farmácia, função ou estado…"><span class="panel-sub">${state.members.length} vínculo(s)</span></div><div class="table-card"><div class="table-wrap"><table><thead><tr><th>Farmácia</th><th>Utilizador</th><th>Função</th><th>Estado</th><th>Desde</th></tr></thead><tbody id="rows">${state.members.map(m=>`<tr><td>${esc(names.get(m.pharmacy_id)||m.pharmacy_id)}</td><td>${esc(m.user_id)}</td><td>${esc(m.role)}</td><td>${statusPill(m.status)}</td><td>${date(m.created_at)}</td></tr>`).join("")||'<tr><td class="empty" colspan="5">Sem membros registados.</td></tr>'}</tbody></table></div></div>`;
  }
  function security(){
    return head("Segurança e controlo","Estado das protecções essenciais do painel.")+
    `<div class="report-grid"><div class="report-box"><h3>Autenticação</h3><p>Login realizado através do Supabase Auth. A sessão é validada antes de carregar esta área.</p><span class="pill green">Activo</span></div><div class="report-box"><h3>Autorização SaaS</h3><p>O utilizador tem de existir em <code>public.platform_admins</code>. Contas comuns não entram no painel.</p><span class="pill green">Validado</span></div><div class="report-box"><h3>Documentos empresariais</h3><p>Bucket privado, limite de 15 MB e acesso condicionado por RLS.</p><span class="pill green">Configurado</span></div><div class="report-box"><h3>Licenciamento</h3><p>A aprovação SaaS não substitui a autorização legal de funcionamento da farmácia.</p><span class="pill">Verificação humana</span></div></div>`;
  }
  function render(){
    document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===state.page||state.page==="application-detail"&&b.dataset.page==="applications"));
    document.querySelector("#pageTitle").textContent=state.page==="application-detail"?"Análise da candidatura":links.find(x=>x[0]===state.page)?.[2]||"Central SaaS";
    root.innerHTML=state.page==="dashboard"?dashboard():state.page==="pharmacies"?pharmacies():state.page==="applications"?applications():state.page==="application-detail"?applicationDetail(state.selectedPharmacyId):state.page==="users"?users():state.page==="members"?members():security();
    const search=document.querySelector("#searchRows");
    if(search)search.addEventListener("input",()=>{
      const term=search.value.toLocaleLowerCase();
      if(state.page==="pharmacies")document.querySelector("#rows").innerHTML=pharmacyRows(state.pharmacies.filter(p=>[p.name,p.nif,p.country_code].join(" ").toLowerCase().includes(term)));
    });
  }
  async function refresh(){try{await loadData();render()}catch(e){console.error(e);root.innerHTML=head("Não foi possível carregar os dados","Verifique a ligação, as permissões RLS e a exposição da Data API.")+`<div class="notice">${esc(e.message||"Erro ao consultar Supabase")}</div><button class="btn btn-primary" id="retry">Tentar novamente</button>`;document.querySelector("#retry").onclick=refresh}}
  async function reviewDocument(id,status){
    const note=status==="rejected"?prompt("Indique o motivo da rejeição deste documento:"):prompt("Nota da revisão (opcional):");
    if(status==="rejected"&&!note)return;
    const {data:{user}}=await sb.auth.getUser();
    const {error}=await sb.from("pharmacy_documents").update({status,reviewer_note:note||null,reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq("id",id);
    if(error)throw error;
    const reviewedDoc=state.documents.find(x=>x.id===id);
    if(reviewedDoc){
      const {error:auditError}=await sb.from("audit_logs").insert({
        pharmacy_id:reviewedDoc.pharmacy_id,
        actor_id:user.id,
        action:"pharmacy_document_"+status,
        entity_type:"pharmacy_document",
        entity_id:id,
        details:{document_type:reviewedDoc.document_type,reviewer_note:note||null}
      });
      if(auditError)throw auditError;
    }
    if(status==="rejected"){
      const {error:appError}=await sb.from("pharmacy_applications").update({
        status:"rejected",rejection_reason:note,reviewed_by:user.id,reviewed_at:new Date().toISOString()
      }).eq("pharmacy_id",state.documents.find(x=>x.id===id)?.pharmacy_id);
      if(appError)throw appError;
    }
    toast("Documento actualizado.");await refresh();state.page="application-detail";render();
  }
  async function setApplicationStatus(pharmacyId,status){
    let rejection_reason=null;
    if(status==="rejected"){
      rejection_reason=prompt("Motivo da rejeição da candidatura:");
      if(!rejection_reason||!rejection_reason.trim())return;
    }
    const labels={approved:"aprovação",rejected:"rejeição",in_review:"marcação em análise"};
    const {data,error}=await sb.rpc("review_pharmacy_application",{
      p_pharmacy_id:pharmacyId,
      p_decision:status,
      p_reason:rejection_reason
    });
    if(error)throw error;
    if(!data?.success)throw new Error("A Central não confirmou a decisão.");
    toast("Candidatura actualizada: "+(labels[status]||status)+".");
    await refresh();
    state.page="application-detail";
    state.selectedPharmacyId=pharmacyId;
    render();
  }
  root.addEventListener("click",async e=>{
    const go=e.target.closest("[data-go]");if(go){state.page=go.dataset.go;render();return;}
    const open=e.target.closest("[data-open-application]");if(open){state.selectedPharmacyId=open.dataset.openApplication;state.page="application-detail";render();return;}
    if(e.target.closest("[data-back-applications]")){state.page="applications";render();return;}
    const view=e.target.closest("[data-view-document]");if(view){try{const d=state.documents.find(x=>x.id===view.dataset.viewDocument);const {data,error}=await sb.storage.from("pharmacy-legal-documents").createSignedUrl(d.storage_path,90);if(error)throw error;window.open(data.signedUrl,"_blank","noopener");}catch(err){toast(err.message||"Não foi possível abrir o documento.");}return;}
    const review=e.target.closest("[data-review-document]");if(review){try{await reviewDocument(review.dataset.reviewDocument,review.dataset.documentStatus)}catch(err){toast(err.message||"Falha ao rever documento.");}return;}
    const decision=e.target.closest("[data-set-application]");if(decision){try{await setApplicationStatus(decision.dataset.setApplication,decision.dataset.applicationStatus)}catch(err){toast(err.message||"Falha ao actualizar candidatura.");}return;}
  });
  nav.addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b){state.page=b.dataset.page;render();document.querySelector("#sidebar").classList.remove("open")}});
  document.querySelector("#menuToggle").onclick=()=>document.querySelector("#sidebar").classList.toggle("open");
  document.querySelector("#userButton").onclick=async()=>{if(confirm("Terminar a sessão do Super Administrador?")){const {error}=await sb.auth.signOut();if(error)toast(error.message);else location.reload()}};
  document.querySelector("#year").textContent=new Date().getFullYear();
  document.querySelector("#today").textContent=new Date().toLocaleDateString("pt-AO",{day:"2-digit",month:"short",year:"numeric"});
  const brand=document.querySelector(".brand");if(brand)brand.querySelector("small").textContent="CENTRAL SAAS";
  const footer=document.querySelector(".sidebar-footer");if(footer)footer.innerHTML='<span class="status-dot"></span> Plataforma SaaS<small>Administração central</small>';
  refresh();
})();
