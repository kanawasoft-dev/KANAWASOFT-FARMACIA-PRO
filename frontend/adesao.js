import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SUPABASE_URL='https://nfelunbfnnrceofskofe.supabase.co';
const SUPABASE_KEY='sb_publishable_xho6gIuG9pYm_xy2J_Htvg_Ih613_TN';
const sb=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
const $=s=>document.querySelector(s);
let mode='signup';
const authPanel=$('#authPanel'),companyPanel=$('#companyPanel');
$('#year').textContent=new Date().getFullYear();
function message(id,text,ok=false){const el=$(id);el.textContent=text;el.classList.toggle('ok',ok)}
function setMode(next){mode=next;document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));$('#nameWrap').classList.toggle('hidden',mode!=='signup');$('#confirmPasswordWrap').classList.toggle('hidden',mode!=='signup');$('#fullName').required=mode==='signup';$('#confirmPassword').required=mode==='signup';$('#password').autocomplete=mode==='signup'?'new-password':'current-password';$('#authSubmit').textContent=mode==='signup'?'Criar conta':'Entrar';message('#authMessage',mode==='signup'?'Crie uma conta com um e-mail válido e uma palavra-passe com pelo menos 8 caracteres.':'Entre com os dados da conta já criada.',true);}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
const statusBox=document.createElement('section');statusBox.id='applicationStatus';statusBox.className='notice';statusBox.setAttribute('aria-live','polite');companyPanel.insertBefore(statusBox,companyPanel.querySelector('#companyForm'));
async function refreshApplicationStatus(){
 const {data:{user}}=await sb.auth.getUser();if(!user){statusBox.textContent='';return;}
 const {data:members,error:mErr}=await sb.from('pharmacy_members').select('pharmacy_id,status').eq('user_id',user.id).eq('role','pharmacy_owner').limit(1);
 if(mErr)throw mErr;if(!members?.length){statusBox.textContent='Ainda não existe uma candidatura associada a esta conta. Preencha os dados abaixo.';return;}
 const pharmacyId=members[0].pharmacy_id;
 const [{data:app,error:aErr},{data:docs,error:dErr},{data:pharmacy,error:pErr}]=await Promise.all([
  sb.from('pharmacy_applications').select('status,rejection_reason,submitted_at').eq('pharmacy_id',pharmacyId).maybeSingle(),
  sb.from('pharmacy_documents').select('document_type,status,reviewer_note').eq('pharmacy_id',pharmacyId),
  sb.from('pharmacies').select('status').eq('id',pharmacyId).maybeSingle()
 ]);
 if(aErr||dErr||pErr)throw aErr||dErr||pErr;
 const labels={draft:'Rascunho — complete os dados e documentos',documents_pending:'Documentos pendentes',submitted:'Submetida — aguarda análise da Central',in_review:'Em análise pela Central KANAWA SOFT',approved:'Aprovada — farmácia activada',rejected:'Devolvida/rejeitada — consulte o motivo e substitua os documentos'};
 const safe=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 statusBox.innerHTML='<strong>Estado da candidatura:</strong> '+(labels[app?.status]||app?.status||'Rascunho')+'<br><small>Estado da farmácia: '+safe(pharmacy?.status||members[0].status)+'</small>'+
  (app?.rejection_reason?'<br><strong>Motivo:</strong> '+safe(app.rejection_reason):'')+
  (docs?.length?'<br><small>Documentos: '+docs.map(d=>safe(d.document_type)+': '+safe(d.status)+(d.reviewer_note?' ('+safe(d.reviewer_note)+')':'')).join(' · ')+'</small>':'');
}
async function showSession(session){if(!session){authPanel.classList.remove('hidden');companyPanel.classList.add('hidden');return;}authPanel.classList.add('hidden');companyPanel.classList.remove('hidden');try{await refreshApplicationStatus();}catch(err){message('#companyMessage',err.message||'Não foi possível consultar o estado da candidatura.');}}
$('#authForm').addEventListener('submit',async e=>{e.preventDefault();const btn=$('#authSubmit');const email=$('#email').value.trim(),password=$('#password').value;if(!email){message('#authMessage','Introduza um e-mail válido.');return;}if(mode==='signup'&&password.length<8){message('#authMessage','A palavra-passe deve ter pelo menos 8 caracteres.');return;}if(mode==='signup'&&password!==$('#confirmPassword').value){message('#authMessage','As palavras-passe não coincidem. Confirme os dois campos.');return;}btn.disabled=true;message('#authMessage','A processar o pedido…',true);try{if(mode==='signup'){const full_name=$('#fullName').value.trim();const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name},emailRedirectTo:location.href}});if(error)throw error;if(!data.session){message('#authMessage','Conta criada. Consulte o seu e-mail e confirme o endereço antes de iniciar sessão. Se não receber a mensagem, verifique o spam.',true);setMode('login');return;}await showSession(data.session);}else{const {data,error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;await showSession(data.session);}}catch(err){const raw=String(err?.message||'').toLowerCase();let friendly='Não foi possível concluir o pedido. Verifique os campos e tente novamente.';if(raw.includes('already registered')||raw.includes('already been registered'))friendly='Este e-mail já está registado. Escolha “Já tenho conta” para entrar ou recupere a palavra-passe.';else if(raw.includes('password'))friendly='A palavra-passe não cumpre os requisitos. Utilize pelo menos 8 caracteres.';else if(raw.includes('email'))friendly='Verifique o formato do e-mail e tente novamente.';else if(raw.includes('fetch')||raw.includes('network'))friendly='Sem ligação ao servidor. Verifique a Internet e tente novamente.';message('#authMessage',friendly);}finally{btn.disabled=false;}});
$('#logout').addEventListener('click',async()=>{await sb.auth.signOut();await showSession(null);});
$('#companyForm').addEventListener('submit',async e=>{e.preventDefault();const formElement=e.currentTarget;if(!(formElement instanceof HTMLFormElement)){message('#companyMessage','Não foi possível identificar o formulário. Actualize a página e tente novamente.');return;}const btn=$('#saveCompany');btn.disabled=true;message('#companyMessage','A guardar os dados da farmácia…');try{
 // Capturar o formulário antes do primeiro await: currentTarget deixa de estar disponível após o evento terminar.
 const form=new FormData(formElement);const v=Object.fromEntries(form.entries());
 const {data:{user},error:userError}=await sb.auth.getUser();if(userError||!user)throw userError||new Error('Inicie sessão novamente.');
 let pharmacyId;
 const {data:existingMembership,error:membershipLookupError}=await sb.from('pharmacy_members').select('pharmacy_id,role').eq('user_id',user.id).eq('role','pharmacy_owner').limit(1);
 if(membershipLookupError)throw membershipLookupError;
 if(existingMembership&&existingMembership.length){pharmacyId=existingMembership[0].pharmacy_id;}
 else{
  const {data:pharmacy,error:pharmacyError}=await sb.from('pharmacies').insert({name:v.trade_name,nif:v.nif,country_code:'AO',currency_code:'AOA',timezone:'Africa/Luanda',status:'pending',created_by:user.id}).select('id').single();
  if(pharmacyError)throw pharmacyError;pharmacyId=pharmacy.id;
  const {error:memberError}=await sb.from('pharmacy_members').insert({pharmacy_id:pharmacyId,user_id:user.id,role:'pharmacy_owner',status:'pending'});
  if(memberError)throw memberError;
 }
 const {data:existingApp,error:appLookupError}=await sb.from('pharmacy_applications').select('pharmacy_id').eq('pharmacy_id',pharmacyId).maybeSingle();
 if(appLookupError)throw appLookupError;
 const application={pharmacy_id:pharmacyId,legal_name:v.legal_name,trade_name:v.trade_name,nif:v.nif,legal_form:v.legal_form||null,province:v.province,municipality:v.municipality,address:v.address,phone:v.phone,contact_email:v.contact_email,representative_name:v.representative_name,representative_bi:v.representative_bi||null,pharmacy_license_number:v.pharmacy_license_number||null,technical_director_name:v.technical_director_name||null,technical_director_license:v.technical_director_license||null,applicant_notes:v.applicant_notes?.trim()||null};
 const result=existingApp?await sb.from('pharmacy_applications').update(application).eq('pharmacy_id',pharmacyId):await sb.from('pharmacy_applications').insert({...application,status:'draft'});
 if(result.error)throw result.error;
 const files=Array.from($('#documents').files||[]);
 for(const file of files){
  if(!['application/pdf','image/jpeg','image/png'].includes(file.type))throw new Error('Formato não permitido: '+file.name);
  if(file.size>15728640)throw new Error('O ficheiro excede 15 MB: '+file.name);
  const {data:rejectedDocs,error:rejectedLookupError}=await sb.from('pharmacy_documents').select('id,storage_path').eq('pharmacy_id',pharmacyId).eq('document_type',$('#documentType').value).eq('status','rejected');
  if(rejectedLookupError)throw rejectedLookupError;
  if(rejectedDocs?.length){
   const paths=rejectedDocs.map(d=>d.storage_path).filter(Boolean);
   if(paths.length){const {error:removeError}=await sb.storage.from('pharmacy-legal-documents').remove(paths);if(removeError)throw removeError;}
   const {error:deleteError}=await sb.from('pharmacy_documents').delete().in('id',rejectedDocs.map(d=>d.id));if(deleteError)throw deleteError;
  }
  const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  const path=pharmacyId+'/'+user.id+'/'+crypto.randomUUID()+'_'+safeName;
  const {error:uploadError}=await sb.storage.from('pharmacy-legal-documents').upload(path,file,{contentType:file.type,upsert:false});
  if(uploadError)throw uploadError;
  const {error:docError}=await sb.from('pharmacy_documents').insert({pharmacy_id:pharmacyId,document_type:$('#documentType').value,document_name:file.name,storage_path:path,mime_type:file.type,size_bytes:file.size,status:'pending',uploaded_by:user.id});
  if(docError)throw docError;
 }
 const requiredDocs=['Certidão comercial','Cartão de contribuinte / NIF','Alvará ou licença','BI do representante','Documento do director técnico'];
 const {data:uploadedDocs,error:docsLookupError}=await sb.from('pharmacy_documents').select('document_type').eq('pharmacy_id',pharmacyId);
 if(docsLookupError)throw docsLookupError;
 const present=new Set((uploadedDocs||[]).map(d=>d.document_type));
 const missing=requiredDocs.filter(type=>!present.has(type));
 if(missing.length===0){
  const {error:submitError}=await sb.rpc('submit_pharmacy_application',{p_pharmacy_id:pharmacyId});
  if(submitError)throw submitError;
  message('#companyMessage','Candidatura submetida para análise. Os cinco grupos documentais mínimos foram recebidos. A farmácia permanece pendente até aprovação da Central KANAWA SOFT. ID: '+pharmacyId,true);
 }else{
  message('#companyMessage','Dados guardados. Para submeter, envie ainda: '+missing.join('; ')+'. Pode seleccionar um tipo de documento por vez e guardar novamente.',true);
 }
 $('#documents').value='';await refreshApplicationStatus();
 }catch(err){message('#companyMessage',err.message||'Erro ao guardar a candidatura. Verifique os campos e tente novamente.');}finally{btn.disabled=false;}
});
sb.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT')showSession(null);});
const {data:{session},error}=await sb.auth.getSession();if(error)message('#authMessage',error.message);await showSession(session);
