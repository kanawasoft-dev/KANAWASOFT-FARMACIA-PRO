-- KANAWA SOFT FARMACIA PRO — POS transaccional e stock FEFO
create or replace view public.v_pharmacy_stock with (security_invoker = true) as
select p.pharmacy_id,p.id as product_id,p.sku,p.name,p.category,p.sale_price,p.cost_price,p.min_stock,
 coalesce(sum(b.quantity) filter(where b.expiry_date is null or b.expiry_date>=current_date),0)::numeric(14,3) as available_stock,
 coalesce(sum(b.quantity) filter(where b.expiry_date<current_date),0)::numeric(14,3) as expired_stock,
 min(b.expiry_date) filter(where b.quantity>0 and b.expiry_date>=current_date) as next_expiry
from public.products p left join public.product_batches b on b.product_id=p.id and b.pharmacy_id=p.pharmacy_id
where p.active=true group by p.pharmacy_id,p.id,p.sku,p.name,p.category,p.sale_price,p.cost_price,p.min_stock;
grant select on public.v_pharmacy_stock to authenticated;

create or replace function public.complete_pharmacy_sale(
 p_pharmacy_id uuid,p_items jsonb,p_payment_method text,p_discount numeric default 0,p_tax numeric default 0,
 p_customer_id uuid default null,p_prescription_id uuid default null,p_notes text default null
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_item jsonb; v_product record; v_batch record; v_qty numeric(14,3); v_remaining numeric(14,3);
 v_take numeric(14,3); v_subtotal numeric(14,2):=0; v_total numeric(14,2);
 v_sale_id uuid:=gen_random_uuid(); v_sale_number text; v_line_total numeric(14,2);
 v_cash_session_id uuid;
begin
 if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;
 if not private.has_pharmacy_role(p_pharmacy_id,array['pharmacy_owner','pharmacy_admin','pharmacist','pharmacy_technician','cashier']::text[])
   and not private.is_platform_admin() then raise exception 'Sem permissão para registar vendas.'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Adicione produtos à venda.'; end if;
 if coalesce(p_discount,0)<0 or coalesce(p_tax,0)<0 then raise exception 'Desconto e imposto não podem ser negativos.'; end if;
 if p_payment_method not in ('cash','card','transfer','multicaixa_express','other') then raise exception 'Método de pagamento inválido.'; end if;
 if p_customer_id is not null and not exists(select 1 from public.customers c where c.id=p_customer_id and c.pharmacy_id=p_pharmacy_id) then raise exception 'Cliente não pertence a esta farmácia.'; end if;
 if p_prescription_id is not null and not exists(select 1 from public.prescriptions r where r.id=p_prescription_id and r.pharmacy_id=p_pharmacy_id and r.status in ('registered','partially_dispensed')) then raise exception 'Receita inválida ou indisponível.'; end if;
 if p_payment_method='cash' then
  select cs.id into v_cash_session_id from public.cash_sessions cs where cs.pharmacy_id=p_pharmacy_id and cs.status='open' order by cs.opened_at desc limit 1 for update;
  if v_cash_session_id is null then raise exception 'Abra um turno de caixa antes de vender em numerário.'; end if;
 end if;
 for v_item in select value from jsonb_array_elements(p_items) loop
  if coalesce(v_item->>'product_id','')='' then raise exception 'Produto inválido no carrinho.'; end if;
  v_qty:=nullif(v_item->>'quantity','')::numeric;
  if coalesce(v_qty,0)<=0 then raise exception 'A quantidade deve ser superior a zero.'; end if;
  select p.id,p.name,p.sale_price,p.requires_prescription into v_product from public.products p
   where p.id=(v_item->>'product_id')::uuid and p.pharmacy_id=p_pharmacy_id and p.active=true for share;
  if not found then raise exception 'Produto não encontrado ou inactivo.'; end if;
  if v_product.requires_prescription and p_prescription_id is null then raise exception 'O produto % exige receita médica.',v_product.name; end if;
  v_subtotal:=v_subtotal+round(v_product.sale_price*v_qty,2);
 end loop;
 if coalesce(p_discount,0)>v_subtotal then raise exception 'O desconto excede o subtotal.'; end if;
 v_total:=round(v_subtotal-coalesce(p_discount,0)+coalesce(p_tax,0),2);
 v_sale_number:='V-'||to_char(current_timestamp at time zone 'Africa/Luanda','YYYYMMDD-HH24MISS')||'-'||upper(substr(replace(v_sale_id::text,'-',''),1,6));
 insert into public.sales(id,pharmacy_id,sale_number,customer_id,status,subtotal,discount,tax,total,payment_method,notes,sold_by)
 values(v_sale_id,p_pharmacy_id,v_sale_number,p_customer_id,'completed',v_subtotal,coalesce(p_discount,0),coalesce(p_tax,0),v_total,p_payment_method,p_notes,auth.uid());
 for v_item in select value from jsonb_array_elements(p_items) loop
  v_qty:=(v_item->>'quantity')::numeric;
  select p.id,p.name,p.sale_price into v_product from public.products p where p.id=(v_item->>'product_id')::uuid and p.pharmacy_id=p_pharmacy_id and p.active=true;
  v_remaining:=v_qty;
  for v_batch in select b.id,b.quantity from public.product_batches b
   where b.pharmacy_id=p_pharmacy_id and b.product_id=v_product.id and b.quantity>0 and (b.expiry_date is null or b.expiry_date>=current_date)
   order by b.expiry_date nulls last,b.created_at,b.id for update
  loop
   exit when v_remaining<=0;
   v_take:=least(v_remaining,v_batch.quantity);
   update public.product_batches set quantity=quantity-v_take where id=v_batch.id;
   v_line_total:=round(v_product.sale_price*v_take,2);
   insert into public.sale_items(pharmacy_id,sale_id,product_id,batch_id,product_name,quantity,unit_price,discount,line_total)
   values(p_pharmacy_id,v_sale_id,v_product.id,v_batch.id,v_product.name,v_take,v_product.sale_price,0,v_line_total);
   insert into public.stock_movements(pharmacy_id,product_id,batch_id,movement_type,quantity,unit_cost,reference_type,reference_id,notes,created_by)
   values(p_pharmacy_id,v_product.id,v_batch.id,'sale',v_take,0,'sale',v_sale_id,'Venda '||v_sale_number,auth.uid());
   v_remaining:=v_remaining-v_take;
  end loop;
  if v_remaining>0 then raise exception 'Stock insuficiente ou lotes expirados para % (em falta: %).',v_product.name,v_remaining; end if;
 end loop;
 if v_cash_session_id is not null then
  insert into public.cash_movements(pharmacy_id,session_id,movement_type,amount,description,created_by)
  values(p_pharmacy_id,v_cash_session_id,'sale',v_total,'Venda '||v_sale_number,auth.uid());
 end if;
 insert into public.audit_logs(pharmacy_id,actor_id,action,entity_type,entity_id,details)
 values(p_pharmacy_id,auth.uid(),'complete','sale',v_sale_id,jsonb_build_object('sale_number',v_sale_number,'total',v_total,'payment_method',p_payment_method));
 return jsonb_build_object('sale_id',v_sale_id,'sale_number',v_sale_number,'subtotal',v_subtotal,'discount',coalesce(p_discount,0),'tax',coalesce(p_tax,0),'total',v_total);
end; $$;
revoke all on function public.complete_pharmacy_sale(uuid,jsonb,text,numeric,numeric,uuid,uuid,text) from public,anon;
grant execute on function public.complete_pharmacy_sale(uuid,jsonb,text,numeric,numeric,uuid,uuid,text) to authenticated;
comment on function public.complete_pharmacy_sale(uuid,jsonb,text,numeric,numeric,uuid,uuid,text)
 is 'Venda atómica com validação de tenant, stock FEFO, caixa e auditoria.';
