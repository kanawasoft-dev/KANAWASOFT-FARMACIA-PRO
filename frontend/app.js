/* KANAWA SOFT FARMACIA PRO — painel operacional multiempresa.
   Persistência real no Supabase; o RLS do PostgreSQL é a fronteira de segurança.
   Não guardar registos operacionais em localStorage. */
(() => {
  "use strict";
  const sb=window.KANAWA_SUPABASE, ctx=window.KANAWA_PHARMACY_CONTEXT;
  const $=(s,r=document)=>r.querySelector(s), esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  if(!sb||!ctx?.pharmacy_id){$("#content").innerHTML="<div class='notice'>Sessão de farmácia inválida. Termine sessão e volte a entrar.</div>";return;}
  const pharmacyId=ctx.pharmacy_id, role=ctx.role, pharmacy=ctx.pharmacies;
  const currency=new Intl.NumberFormat("pt-AO",{style:"currency",currency:pharmacy.currency_code||"AOA",maximumFractionDigits:0});
  const money=v=>currency.format(Number(v)||0), date=v=>v?new Date(v).toLocaleDateString("pt-AO"):"—";
  const state={page:"dashboard",data:{},profile:null,loading:false,cart:[]};
  const modules=[
    ["dashboard","▦","Painel"],["sales","▣","Vendas / POS"],["products","▤","Medicamentos"],["stock","▥","Stock"],
    ["batches","◷","Lotes e validade"],["purchases","⇩","Compras"],["suppliers","♧","Fornecedores"],["customers","♙","Clientes"],
    ["prescriptions","✚","Receitas médicas"],["cash","◉","Caixa e turnos"],["finance","▱","Finanças"],
    ["employees","♟","Funcionários"],["users","⚿","Utilizadores"],["reports","▧","Relatórios"],["settings","⚙","Configurações"],["audit","◎","Auditoria"]
  ];
  const cfg={
    products:{table:"products",title:"Medicamentos e produtos",desc:"Catálogo de medicamentos, preços e requisitos de receita.",fields:[["sku","Código / SKU","text",1],["name","Nome comercial","text",1],["generic_name","Princípio activo","text"],["category","Categoria","text",1],["unit","Unidade","text"],["barcode","Código de barras","text"],["cost_price","Preço de custo (Kz)","number"],["sale_price","Preço de venda (Kz)","number",1],["min_stock","Stock mínimo","number"],["requires_prescription","Exige receita?","checkbox"],["active","Activo?","checkbox"]],cols:[["sku","Código"],["name","Produto"],["category","Categoria"],["sale_price","Preço"],["stock","Stock"],["active","Activo"]]},
    suppliers:{table:"suppliers",title:"Fornecedores",desc:"Cadastro e contactos de fornecedores.",fields:[["name","Nome / empresa","text",1],["nif","NIF","text"],["phone","Telefone","tel"],["email","E-mail","email"],["address","Morada","text"],["notes","Observações","textarea"]],cols:[["name","Fornecedor"],["nif","NIF"],["phone","Telefone"],["email","E-mail"]]},
    customers:{table:"customers",title:"Clientes",desc:"Ficha de clientes e contactos.",fields:[["full_name","Nome completo","text",1],["phone","Telefone","tel"],["email","E-mail","email"],["nif","NIF","text"],["notes","Observações","textarea"]],cols:[["full_name","Cliente"],["phone","Telefone"],["email","E-mail"],["nif","NIF"]]},
    batches:{table:"product_batches",title:"Lotes e validade",desc:"Rastreabilidade de lote, fornecedor e validade.",fields:[["product_id","ID do produto","text",1],["supplier_id","ID do fornecedor (opcional)","text"],["lot_number","Número do lote","text",1],["expiry_date","Data de validade","date"],["quantity","Quantidade inicial","number",1]],cols:[["product_id","Produto (ID)"],["lot_number","Lote"],["expiry_date","Validade"],["quantity","Quantidade"]]},
    stock:{table:"stock_movements",title:"Movimentos de stock",desc:"Registo auditável de entradas, saídas, perdas e acertos.",fields:[["product_id","ID do produto","text",1],["movement_type","Tipo de movimento","select",1,["adjustment_in","adjustment_out","loss","return"]],["quantity","Quantidade","number",1],["unit_cost","Custo unitário","number"],["notes","Motivo / observações","textarea"]],cols:[["product_id","Produto (ID)"],["movement_type","Movimento"],["quantity","Quantidade"],["notes","Observações"],["created_at","Data"]]},
    sales:{table:"sales",title:"Vendas / POS",desc:"Registo de cabeçalho de vendas. A baixa de stock e os itens devem ser lançados com os respectivos detalhes.",fields:[["sale_number","Número da venda","text",1],["customer_id","ID do cliente (opcional)","text"],["subtotal","Subtotal (Kz)","number",1],["discount","Desconto (Kz)","number"],["tax","Imposto (Kz)","number"],["total","Total (Kz)","number",1],["payment_method","Pagamento","select",1,["cash","card","transfer","multicaixa_express","other"]],["notes","Observações","textarea"]],cols:[["sale_number","Venda"],["status","Estado"],["total","Total"],["payment_method","Pagamento"],["created_at","Data"]],readonly:true},
    purchases:{table:"purchases",title:"Compras",desc:"Registo de documentos de compra e fornecedores.",fields:[["purchase_number","Número da compra","text",1],["supplier_id","ID do fornecedor (opcional)","text"],["invoice_number","N.º da factura","text"],["subtotal","Subtotal (Kz)","number",1],["tax","Imposto (Kz)","number"],["total","Total (Kz)","number",1],["status","Estado","select",1,["draft","ordered","received","cancelled"]],["notes","Observações","textarea"]],cols:[["purchase_number","Documento"],["invoice_number","Factura"],["status","Estado"],["total","Total"],["created_at","Data"]],readonly:true},
    prescriptions:{table:"prescriptions",title:"Receitas médicas",desc:"Registo de receitas e prescritores.",fields:[["prescription_number","Número da receita","text",1],["patient_name","Nome do paciente","text",1],["customer_id","ID do cliente (opcional)","text"],["prescriber_name","Médico prescritor","text"],["issued_on","Data da receita","date"],["notes","Medicamentos / observações","textarea"]],cols:[["prescription_number","Receita"],["patient_name","Paciente"],["prescriber_name","Prescritor"],["issued_on","Data"],["status","Estado"]]},
    finance:{table:"finance_entries",title:"Finanças",desc:"Receitas e despesas da farmácia.",fields:[["entry_type","Tipo","select",1,["income","expense"]],["category","Categoria","text"],["description","Descrição","text",1],["amount","Valor (Kz)","number",1],["reference","Referência","text"],["entry_date","Data","date",1]],cols:[["entry_type","Tipo"],["description","Descrição"],["category","Categoria"],["amount","Valor"],["entry_date","Data"]]},
    employees:{table:"employees",title:"Funcionários",desc:"Cadastro da equipa e funções.",fields:[["full_name","Nome completo","text",1],["job_title","Função","text",1],["phone","Telefone","tel"],["email","E-mail","email"],["status","Estado","select",1,["active","inactive"]]],cols:[["full_name","Funcionário"],["job_title","Função"],["phone","Telefone"],["email","E-mail"],["status","Estado"]]}
  };
  const toast=m=>{const e=document.createElement("div");e.className="toast";e.textContent=m;$("#toastRegion").append(e);setTimeout(()=>e.remove(),3500);};
  const head=(t,d,action="")=>`<div class="page-head"><div><div class="eyebrow">KANAWA SOFT · FARMÁCIA PRO</div><h1>${esc(t)}</h1><p>${esc(d)}</p></div>${action}</div>`;
  const stat=(l,v,n)=>`<div class="stat-card"><div class="stat-top"><span>${l}</span></div><div class="stat-value">${v}</div><div class="stat-note">${n}</div></div>`;
  async function query(table,order="created_at"){const {data,error}=await sb.from(table).select("*").eq("pharmacy_id",pharmacyId).order(order,{ascending:false}).limit(500);if(error)throw error;return data||[];}
  async function load(){
    const tables=["products","suppliers","customers","product_batches","stock_movements","sales","purchases","prescriptions","cash_sessions","cash_movements","finance_entries","employees","audit_logs"];
    const results=await Promise.all(tables.map(t=>query(t)));
    tables.forEach((t,i)=>state.data[t]=results[i]);
    const {data:members,error}=await sb.from("pharmacy_members").select("id,user_id,role,status,created_at").eq("pharmacy_id",pharmacyId).order("created_at",{ascending:false});
    if(error)throw error;state.data.pharmacy_members=members||[];
    const {data:ph,error:phError}=await sb.from("pharmacies").select("id,name,nif,country_code,currency_code,timezone,status").eq("id",pharmacyId).single();
    if(phError)throw phError;state.profile=ph;
  }
  const getRows=id=>state.data[cfg[id]?.table]||[];
  function dashboard(){
    const products=state.data.products||[],sales=state.data.sales||[],batches=state.data.product_batches||[];
    const low=products.filter(p=>Number(p.min_stock||0)>0 && batches.filter(b=>b.product_id===p.id).reduce((n,b)=>n+Number(b.quantity||0),0)<=Number(p.min_stock));
    const expired=batches.filter(b=>b.expiry_date&&new Date(b.expiry_date)<new Date());
    return head("Painel de controlo",`Resumo de ${state.profile?.name||"farmácia"} — dados sincronizados com a base de dados.`)+
    `<div class="stats-grid">${stat("Medicamentos",products.length,"Produtos cadastrados")}${stat("Vendas",sales.length,money(sales.reduce((n,s)=>n+Number(s.total||0),0)))}${stat("Stock baixo",low.length,"Abaixo do mínimo")}${stat("Lotes expirados",expired.length,"Requerem verificação")}</div>
    <div class="dashboard-grid"><section class="panel"><div class="panel-head"><h3>Acesso rápido</h3></div><div class="quick-grid">${[["Nova venda","sales"],["Novo medicamento","products"],["Consultar stock","stock"],["Registar compra","purchases"],["Lotes e validade","batches"],["Relatórios","reports"]].map(([l,id])=>`<button class="quick-action" data-go="${id}"><b>${l}</b><small>Abrir módulo</small></button>`).join("")}</div></section>
    <section class="panel"><div class="panel-head"><h3>Alertas</h3></div>${low.length?low.map(p=>`<div class="alert-row"><b>${esc(p.name)}</b><span class="pill">Stock baixo</span></div>`).join(""):"<div class='empty'>Sem alertas de stock mínimo.</div>"}${expired.length?`<div class="notice">${expired.length} lote(s) expirado(s). Não dispensar sem revisão.</div>`:""}</section></div>`;
  }
  function stockOf(productId){return (state.data.product_batches||[]).filter(b=>b.product_id===productId).reduce((n,b)=>n+Number(b.quantity||0),0);}
  function fmtCell(k,v,row){
    if(k==="stock")return stockOf(row.id);
    if(["sale_price","cost_price","amount","total","subtotal"].includes(k))return money(v);
    if(k==="created_at"||k==="entry_date"||k==="issued_on"||k==="expiry_date")return date(v);
    if(typeof v==="boolean")return v?"Sim":"Não";
    return esc(v??"—");
  }
  function tablePage(id){
    const c=cfg[id],rows=getRows(id);
    const add= c.readonly || !["pharmacy_owner","pharmacy_admin","pharmacist","pharmacy_technician","cashier","stock_manager","accountant"].includes(role) ? "" : `<button class="btn btn-primary" id="addRecord">＋ Novo registo</button>`;
    return head(c.title,c.desc,add)+`<div class="toolbar"><input class="search" id="tableSearch" placeholder="Pesquisar registos…"><span class="panel-sub">${rows.length} registo(s)</span></div><div class="table-card"><div class="table-wrap"><table><thead><tr>${c.cols.map(x=>`<th>${x[1]}</th>`).join("")}</tr></thead><tbody id="tableBody">${rows.length?rows.map(r=>`<tr>${c.cols.map(([k])=>`<td>${fmtCell(k,r[k],r)}</td>`).join("")}</tr>`).join(""):`<tr><td class="empty" colspan="${c.cols.length}">Sem registos nesta farmácia.</td></tr>`}</tbody></table></div></div>`;
  }
  function availableStock(productId){
    const today=new Date().toISOString().slice(0,10);
    return (state.data.product_batches||[]).filter(b=>b.product_id===productId&&(!b.expiry_date||b.expiry_date>=today)).reduce((n,b)=>n+Number(b.quantity||0),0);
  }
  function posPage(){
    const products=(state.data.products||[]).filter(p=>p.active);
    const rows=state.cart.map(item=>{
      const p=products.find(x=>x.id===item.product_id);
      return p?'<tr><td>'+esc(p.name)+'</td><td>'+item.quantity+'</td><td>'+money(p.sale_price)+'</td><td>'+money(p.sale_price*item.quantity)+'</td><td><button class="mini-btn" data-remove-cart="'+p.id+'">Remover</button></td></tr>':'';
    }).join('');
    const total=state.cart.reduce((n,item)=>{const p=products.find(x=>x.id===item.product_id);return n+(p?Number(p.sale_price)*item.quantity:0);},0);
    return head("Ponto de venda (POS)","Registe vendas com cálculo de preço no servidor e baixa automática de stock por validade.")+
      '<section class="panel"><div class="form-grid"><div class="field"><label>Medicamento / produto</label><select id="posProduct"><option value="">Seleccione um produto</option>'+products.map(p=>'<option value="'+p.id+'">'+esc(p.name)+' · '+money(p.sale_price)+' · Stock disponível: '+availableStock(p.id)+'</option>').join('')+'</select></div><div class="field"><label>Quantidade</label><input id="posQuantity" type="number" min="0.001" step="0.001" value="1"></div><div class="field"><label>Pagamento</label><select id="posPayment"><option value="cash">Numerário</option><option value="card">Cartão</option><option value="transfer">Transferência</option><option value="multicaixa_express">Multicaixa Express</option><option value="other">Outro</option></select></div><div class="field"><label>Desconto (Kz)</label><input id="posDiscount" type="number" min="0" step="0.01" value="0"></div><div class="field"><label>Imposto (Kz)</label><input id="posTax" type="number" min="0" step="0.01" value="0"></div><div class="field"><label>ID da receita (se aplicável)</label><input id="posPrescription" type="text" placeholder="UUID da receita médica"></div><div class="field full"><button class="btn btn-light" id="posAdd">Adicionar ao carrinho</button></div></div></section>'+
      '<section class="panel"><div class="panel-head"><h3>Carrinho</h3><span class="panel-sub">'+state.cart.length+' linha(s)</span></div><div class="table-wrap"><table><thead><tr><th>Produto</th><th>Qtd.</th><th>Preço unit.</th><th>Total</th><th></th></tr></thead><tbody>'+ (rows||'<tr><td colspan="5" class="empty">Carrinho vazio.</td></tr>')+'</tbody></table></div><div class="page-head"><div><h2>Total estimado: '+money(total)+'</h2><p>O total definitivo será recalculado no PostgreSQL.</p></div><button class="btn btn-primary" id="posCheckout" '+(!state.cart.length?'disabled':'')+'>Finalizar venda</button></div></section>';
  }
  async function addPosItem(){
    const id=$("#posProduct").value,qty=Number($("#posQuantity").value);
    const p=(state.data.products||[]).find(x=>x.id===id);
    if(!p||!Number.isFinite(qty)||qty<=0){toast("Seleccione um produto e uma quantidade válida.");return;}
    if(availableStock(id)<qty){toast("Stock disponível insuficiente ou lote expirado.");return;}
    const existing=state.cart.find(x=>x.product_id===id);
    if(existing)existing.quantity+=qty;else state.cart.push({product_id:id,quantity:qty});
    render();
  }
  async function checkoutPos(){
    if(!state.cart.length)return;
    const payload={p_pharmacy_id:pharmacyId,p_items:state.cart,p_payment_method:$("#posPayment").value,
      p_discount:Number($("#posDiscount").value||0),p_tax:Number($("#posTax").value||0),
      p_prescription_id:$("#posPrescription").value.trim()||null};
    const button=$("#posCheckout");if(button)button.disabled=true;
    try{
      const {data,error}=await sb.rpc("complete_pharmacy_sale",payload);
      if(error)throw error;
      state.cart=[];
      await refresh();
      toast("Venda "+data.sale_number+" concluída. Total: "+money(data.total));
    }catch(err){toast(err.message||"Não foi possível concluir a venda.");if(button)button.disabled=false;}
  }
  function special(id){
    if(id==="reports"){const sales=state.data.sales||[],fin=state.data.finance_entries||[];return head("Relatórios","Indicadores financeiros e operacionais.")+`<div class="report-grid"><div class="report-box"><h3>Vendas</h3><p>${sales.length} venda(s)<br><b>${money(sales.reduce((n,x)=>n+Number(x.total||0),0))}</b></p></div><div class="report-box"><h3>Finanças</h3><p>${fin.length} lançamento(s)<br>Receitas: ${money(fin.filter(x=>x.entry_type==="income").reduce((n,x)=>n+Number(x.amount),0))}<br>Despesas: ${money(fin.filter(x=>x.entry_type==="expense").reduce((n,x)=>n+Number(x.amount),0))}</p></div><div class="report-box"><h3>Inventário</h3><p>${(state.data.products||[]).length} produtos<br>${(state.data.product_batches||[]).length} lotes</p></div></div><p><button class="btn btn-light" id="printReport">Imprimir</button></p>`;}
    if(id==="settings"){const p=state.profile||{};return head("Configurações","Dados de identificação e localização da farmácia.")+`<section class="panel"><form id="settingsForm" class="form-grid"><div class="field"><label>Nome da farmácia</label><input name="name" required value="${esc(p.name)}"></div><div class="field"><label>NIF</label><input name="nif" value="${esc(p.nif)}"></div><div class="field"><label>País (ISO)</label><input name="country_code" maxlength="2" value="${esc(p.country_code)}"></div><div class="field"><label>Moeda (ISO)</label><input name="currency_code" maxlength="3" value="${esc(p.currency_code)}"></div><div class="field"><label>Fuso horário</label><input name="timezone" value="${esc(p.timezone)}"></div><div class="field full"><button class="btn btn-primary">Guardar dados</button></div></form></section>`;}
    if(id==="users"){const members=state.data.pharmacy_members||[];return head("Utilizadores e perfis","Membros associados a esta farmácia. Convites e contas Auth devem ser criados por fluxo seguro de administração.")+`<div class="table-card"><div class="table-wrap"><table><thead><tr><th>Utilizador ID</th><th>Função</th><th>Estado</th><th>Desde</th></tr></thead><tbody>${members.map(m=>`<tr><td>${esc(m.user_id)}</td><td>${esc(m.role)}</td><td>${esc(m.status)}</td><td>${date(m.created_at)}</td></tr>`).join("")||"<tr><td colspan='4' class='empty'>Sem membros.</td></tr>"}</tbody></table></div></div>`;}
    if(id==="cash"){const sessions=state.data.cash_sessions||[],mov=state.data.cash_movements||[];return head("Caixa e turnos","Sessões de caixa e movimentos registados.")+`<div class="stats-grid">${stat("Sessões",sessions.length,"Turnos")}${stat("Abertas",sessions.filter(x=>x.status==="open").length,"Em curso")}${stat("Movimentos",mov.length,"Histórico")}</div><div class="table-card"><div class="table-wrap"><table><thead><tr><th>Abertura</th><th>Valor inicial</th><th>Estado</th></tr></thead><tbody>${sessions.map(x=>`<tr><td>${date(x.opened_at)}</td><td>${money(x.opening_amount)}</td><td>${esc(x.status)}</td></tr>`).join("")||"<tr><td colspan='3' class='empty'>Sem sessões de caixa.</td></tr>"}</tbody></table></div></div><button class="btn btn-primary" id="openCash">＋ Abrir turno</button>`;}
    if(id==="audit"){const rows=state.data.audit_logs||[];return head("Auditoria e actividade","Registos de actividade guardados no servidor.")+`<div class="table-card"><div class="table-wrap"><table><thead><tr><th>Data</th><th>Acção</th><th>Entidade</th><th>Detalhes</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${date(x.created_at)}</td><td>${esc(x.action)}</td><td>${esc(x.entity_type)}</td><td>${esc(JSON.stringify(x.details))}</td></tr>`).join("")||"<tr><td colspan='4' class='empty'>Sem eventos.</td></tr>"}</tbody></table></div></div>`;}
    return head("Módulo","Disponível.");
  }
  function render(){
    const label=modules.find(x=>x[0]===state.page)?.[2]||"Painel";
    $("#pageTitle").textContent=label;
    document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===state.page));
    $("#content").innerHTML=state.page==="dashboard"?dashboard():state.page==="sales"?posPage():cfg[state.page]?tablePage(state.page):special(state.page);
    $("#content").querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
    const add=$("#addRecord");if(add)add.onclick=()=>openForm(state.page);
    const search=$("#tableSearch");if(search)search.oninput=()=>{const term=search.value.toLowerCase();const c=cfg[state.page];const rows=getRows(state.page).filter(r=>Object.values(r).join(" ").toLowerCase().includes(term));$("#tableBody").innerHTML=rows.map(r=>`<tr>${c.cols.map(([k])=>`<td>${fmtCell(k,r[k])}</td>`).join("")}</tr>`).join("")||`<tr><td colspan="${c.cols.length}" class="empty">Sem resultados.</td></tr>`;};
    if($("#posAdd"))$("#posAdd").onclick=addPosItem;\n    if($("#posCheckout"))$("#posCheckout").onclick=checkoutPos;\n    document.querySelectorAll("[data-remove-cart]").forEach(b=>b.onclick=()=>{state.cart=state.cart.filter(x=>x.product_id!==b.dataset.removeCart);render();});\n    if($("#printReport"))$("#printReport").onclick=()=>window.print();
    if($("#openCash"))$("#openCash").onclick=openCash;
    if($("#settingsForm"))$("#settingsForm").onsubmit=saveSettings;
  }
  function go(id){state.page=id;$("#sidebar").classList.remove("open");render();window.scrollTo({top:0,behavior:"smooth"});}
  function openForm(id){
    const c=cfg[id];if(!c)return;
    $("#dialogEyebrow").textContent=c.title.toUpperCase();$("#dialogTitle").textContent="Novo registo";
    $("#formFields").innerHTML=c.fields.map(([k,l,t,req,opts])=>{let field=t==="select"?`<select name="${k}" ${req?"required":""}>${opts.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join("")}</select>`:t==="textarea"?`<textarea name="${k}" rows="3"></textarea>`:t==="checkbox"?`<input name="${k}" type="checkbox" value="true">`:`<input name="${k}" type="${t}" ${req?"required":""} ${t==="number"?'min="0" step="any"':""}>`;return `<div class="field ${t==="textarea"?"full":""}"><label>${l}${req?" *":""}</label>${field}</div>`;}).join("");
    $("#recordDialog").showModal();
    $("#recordForm").onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.currentTarget),payload={pharmacy_id:pharmacyId};for(const [k,v] of fd.entries())payload[k]=v;
      c.fields.forEach(([k,,t])=>{if(t==="number"&&payload[k]!==undefined)payload[k]=Number(payload[k]);if(t==="checkbox")payload[k]=fd.has(k);});
      try{const {data:{user}}=await sb.auth.getUser();const {error}=await sb.from(c.table).insert(payload);if(error)throw error;
        await sb.from("audit_logs").insert({pharmacy_id:pharmacyId,actor_id:user.id,action:"create",entity_type:c.table,details:{fields:Object.keys(payload).filter(k=>k!=="pharmacy_id")}});
        $("#recordDialog").close();await refresh();toast("Registo gravado na base de dados.");}catch(err){toast(err.message||"Não foi possível gravar.");}
    };
  }
  async function openCash(){const amount=Number(prompt("Valor de abertura de caixa (Kz):","0"));if(!Number.isFinite(amount)||amount<0)return;try{const {error}=await sb.from("cash_sessions").insert({pharmacy_id:pharmacyId,opening_amount:amount,status:"open"});if(error)throw error;await refresh();toast("Turno de caixa aberto.");}catch(e){toast(e.message);}}
  async function saveSettings(e){e.preventDefault();const payload=Object.fromEntries(new FormData(e.currentTarget).entries());payload.country_code=payload.country_code.toUpperCase();payload.currency_code=payload.currency_code.toUpperCase();try{const {error}=await sb.from("pharmacies").update(payload).eq("id",pharmacyId);if(error)throw error;await refresh();toast("Dados da farmácia actualizados.");}catch(err){toast(err.message);}}
  async function refresh(){try{await load();render();}catch(e){console.error("[KANAWA DATA]",e);$("#content").innerHTML=head("Erro ao carregar dados","A ligação existe, mas a consulta foi recusada ou falhou.")+`<div class="notice">${esc(e.message||"Erro desconhecido")}</div><button class="btn btn-primary" id="retryLoad">Tentar novamente</button>`;$("#retryLoad").onclick=refresh;}}
  $("#navigation").innerHTML=modules.map(([id,icon,label])=>`<button class="nav-item" data-page="${id}"><span class="nav-icon">${icon}</span>${label}</button>`).join("");
  $("#navigation").onclick=e=>{const b=e.target.closest("[data-page]");if(b)go(b.dataset.page);};
  $("#menuToggle").onclick=()=>$("#sidebar").classList.toggle("open");
  $("#userButton").onclick=async()=>{if(confirm("Terminar sessão?")){await sb.auth.signOut();location.reload();}};
  $("#closeDialog").onclick=()=>$("#recordDialog").close();$("#cancelDialog").onclick=()=>$("#recordDialog").close();
  $("#today").textContent=new Date().toLocaleDateString("pt-AO",{day:"2-digit",month:"short",year:"numeric"});$("#year").textContent=new Date().getFullYear();
  const brand=$(".brand");if(brand){brand.querySelector("small").textContent=pharmacy.name||"FARMÁCIA";brand.querySelector("strong").textContent="KANAWA SOFT";}
  const userButton=$("#userButton");if(userButton){userButton.querySelector("b").textContent=pharmacy.name||"Farmácia";userButton.querySelector("small").textContent=role.replaceAll("_"," ");}
  const footer=$(".sidebar-footer");if(footer)footer.innerHTML='<span class="status-dot"></span> Ligação segura<small>Dados sincronizados</small>';
  refresh();
})();