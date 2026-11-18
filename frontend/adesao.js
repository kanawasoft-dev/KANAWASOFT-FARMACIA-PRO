import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SUPABASE_URL='https://nfelunbfnnrceofskofe.supabase.co';
const SUPABASE_KEY='sb_publishable_xho6gIuG9pYm_xy2J_Htvg_Ih613_TN';
const sb=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
const $=s=>document.querySelector(s);
let mode='signup';
const authPanel=$('#authPanel'),companyPanel=$('#companyPanel');
$('#year').textContent=new Date().getFullYear();
function message(id,text,ok=false){const el=$(id);el.textContent=text;el.classList.toggle('ok',ok)}
function setMode(next){mode=next;document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));$('#nameWrap').classList.toggle('hidden',mode!=='signup');$('#fullName').required=mode==='signup';$('#password').autocomplete=mode==='signup'?'new-password':'current-password';$('#authSubmit').textContent=mode==='signup'?'Criar conta':'Entrar';}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
async function showSession(session){if(!session){authPanel.classList.remove('hidden');companyPanel.classList.add('hidden');return;}authPanel.classList.add('hidden');companyPanel.classList.remove('hidden');}
$('#authForm').addEventListener('submit',async e=>{e.preventDefault();const btn=$('#authSubmit');btn.disabled=true;message('#authMessage','A processar…');try{const email=$('#email').value.trim(),password=$('#password').value;if(mode==='signup'){const full_name=$('#fullName').value.trim();const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name},emailRedirectTo:location.href}});if(error)throw error;if(!data.session){message('#authMessage','Conta criada. Confirme o e-mail recebido e depois volte aqui para iniciar sessão.',true);setMode('login');return;}await showSession(data.session);}else{const {data,error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;await showSession(data.session);}}catch(err){message('#authMessage',err.message||'Não foi possível autenticar.');}finally{btn.disabled=false;}});
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
  const {error:memberError}=await sb.from('pharmacy_members').insert({pharmacy_id:pharmacyId,user_id:user.id,role:'pharmacy_owner',status:'active'});
  if(memberError)throw memberError;
 }
 const {data:existingApp,error:appLookupError}=await sb.from('pharmacy_applications').select('pharmacy_id').eq('pharmacy_id',pharmacyId).maybeSingle();
 if(appLookupError)throw appLookupError;
 const application={pharmacy_id:pharmacyId,legal_name:v.legal_name,trade_name:v.trade_name,nif:v.nif,legal_form:v.legal_form||null,province:v.province,municipality:v.municipality,address:v.address,phone:v.phone,contact_email:v.contact_email,representative_name:v.representative_name,representative_bi:v.representative_bi||null,pharmacy_license_number:v.pharmacy_license_number||null,technical_director_name:v.technical_director_name||null,technical_director_license:v.technical_director_license||null};
 const result=existingApp?await sb.from('pharmacy_applications').update(application).eq('pharmacy_id',pharmacyId):await sb.from('pharmacy_applications').insert({...application,status:'draft'});
 if(result.error)throw result.error;
 const files=Array.from($('#documents').files||[]);
 for(const file of files){
  if(!['application/pdf','image/jpeg','image/png'].includes(file.type))throw new Error('Formato não permitido: '+file.name);
  if(file.size>15728640)throw new Error('O ficheiro excede 15 MB: '+file.name);
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
  const {error:submitError}=await sb.from('pharmacy_applications').update({status:'submitted',submitted_at:new Date().toISOString()}).eq('pharmacy_id',pharmacyId);
  if(submitError)throw submitError;
  message('#companyMessage','Candidatura submetida para análise. Os cinco grupos documentais mínimos foram recebidos. A farmácia permanece pendente até aprovação da Central KANAWA SOFT. ID: '+pharmacyId,true);
 }else{
  message('#companyMessage','Dados guardados. Para submeter, envie ainda: '+missing.join('; ')+'. Pode seleccionar um tipo de documento por vez e guardar novamente.',true);
 }
 $('#documents').value='';
 }catch(err){message('#companyMessage',err.message||'Erro ao guardar a candidatura. Verifique os campos e tente novamente.');}finally{btn.disabled=false;}
});
sb.auth.onAuthStateChange((_event,session)=>{showSession(session);});
const {data:{session},error}=await sb.auth.getSession();if(error)message('#authMessage',error.message);await showSession(session);
