-- KANAWA SOFT FARMACIA PRO — recepção transaccional de compras e caixa
create or replace function public.receive_pharmacy_purchase(
 p_pharmacy_id uuid,p_supplier_id uuid,p_items jsonb,p_tax numeric default 0,
 p_invoice_number text default null,p_notes text default null
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_item jsonb; v_product record; v_qty numeric(14,3); v_cost numeric(14,2);
 v_subtotal numeric(14,2):=0; v_total numeric(14,2); v_purchase_id uuid:=gen_random_uuid();
 v_number text; v_lot text; v_expiry date; v_batch_id uuid;
begin
 if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;
 if not private.has_pharmacy_role(p_pharmacy_id,array['pharmacy_owner','pharmacy_admin','pharmacist','stock_manager']::text[]) and not private.is_platform_admin() then raise exception 'Sem permissão para receber compras.'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Adicione produtos à compra.'; end if;
 if coalesce(p_tax,0)<0 then raise exception 'Imposto inválido.'; end if;
 if p_supplier_id is not null and not exists(select 1 from public.suppliers s where s.id=p_supplier_id and s.pharmacy_id=p_pharmacy_id) then raise exception 'Fornecedor inválido para esta farmácia.'; end if;
 for v_item in select value from jsonb_array_elements(p_items) loop
  v_qty:=nullif(v_item->>'quantity','')::numeric; v_cost:=nullif(v_item->>'unit_cost','')::numeric;
  if coalesce(v_qty,0)<=0 or coalesce(v_cost,-1)<0 then raise exception 'Quantidade ou custo inválido.'; end if;
  select p.id,p.name into v_product from public.products p where p.id=(v_item->>'product_id')::uuid and p.pharmacy_id=p_pharmacy_id and p.active=true;
  if not found then raise exception 'Produto não encontrado ou inactivo.'; end if;
  if coalesce(trim(v_item->>'lot_number'),'')='' then raise exception 'Número do lote obrigatório.'; end if;
  if nullif(v_item->>'expiry_date','') is not null and (v_item->>'expiry_date')::date<current_date then raise exception 'Não é permitido receber lote expirado.'; end if;
  v_subtotal:=v_subtotal+round(v_qty*v_cost,2);
 end loop;
 v_total:=v_subtotal+coalesce(p_tax,0);
 v_number:='C-'||to_char(current_timestamp at time zone 'Africa/Luanda','YYYYMMDD-HH24MISS')||'-'||upper(substr(replace(v_purchase_id::text,'-',''),1,6));
 insert into public.purchases(id,pharmacy_id,purchase_number,supplier_id,status,subtotal,tax,total,invoice_number,notes,purchased_by)
 values(v_purchase_id,p_pharmacy_id,v_number,p_supplier_id,'received',v_subtotal,coalesce(p_tax,0),v_total,p_invoice_number,p_notes,auth.uid());
 for v_item in select value from jsonb_array_elements(p_items) loop
  v_qty:=(v_item->>'quantity')::numeric; v_cost:=(v_item->>'unit_cost')::numeric;
  select p.id,p.name into v_product from public.products p where p.id=(v_item->>'product_id')::uuid and p.pharmacy_id=p_pharmacy_id;
  v_lot:=trim(v_item->>'lot_number'); v_expiry:=nullif(v_item->>'expiry_date','')::date;
  insert into public.purchase_items(pharmacy_id,purchase_id,product_id,product_name,quantity,unit_cost,line_total,lot_number,expiry_date)
  values(p_pharmacy_id,v_purchase_id,v_product.id,v_product.name,v_qty,v_cost,round(v_qty*v_cost,2),v_lot,v_expiry);
  insert into public.product_batches(pharmacy_id,product_id,supplier_id,lot_number,expiry_date,quantity)
  values(p_pharmacy_id,v_product.id,p_supplier_id,v_lot,v_expiry,v_qty)
  on conflict(pharmacy_id,product_id,lot_number) do update set quantity=public.product_batches.quantity+excluded.quantity,
   expiry_date=coalesce(public.product_batches.expiry_date,excluded.expiry_date),supplier_id=coalesce(excluded.supplier_id,public.product_batches.supplier_id)
  returning id into v_batch_id;
  insert into public.stock_movements(pharmacy_id,product_id,batch_id,movement_type,quantity,unit_cost,reference_type,reference_id,notes,created_by)
  values(p_pharmacy_id,v_product.id,v_batch_id,'purchase',v_qty,v_cost,'purchase',v_purchase_id,'Recepção '||v_number,auth.uid());
  update public.products set cost_price=v_cost,updated_at=now() where id=v_product.id and pharmacy_id=p_pharmacy_id;
 end loop;
 insert into public.audit_logs(pharmacy_id,actor_id,action,entity_type,entity_id,details)
 values(p_pharmacy_id,auth.uid(),'receive','purchase',v_purchase_id,jsonb_build_object('purchase_number',v_number,'total',v_total,'items',jsonb_array_length(p_items)));
 return jsonb_build_object('purchase_id',v_purchase_id,'purchase_number',v_number,'subtotal',v_subtotal,'tax',coalesce(p_tax,0),'total',v_total);
end; $$;

create or replace function public.open_pharmacy_cash(p_pharmacy_id uuid,p_opening_amount numeric default 0)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;
 if coalesce(p_opening_amount,-1)<0 then raise exception 'Valor de abertura inválido.'; end if;
 if not private.has_pharmacy_role(p_pharmacy_id,array['pharmacy_owner','pharmacy_admin','cashier','accountant']::text[]) and not private.is_platform_admin() then raise exception 'Sem permissão para abrir caixa.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_pharmacy_id::text,0));
 if exists(select 1 from public.cash_sessions where pharmacy_id=p_pharmacy_id and status='open') then raise exception 'Já existe turno aberto.'; end if;
 insert into public.cash_sessions(pharmacy_id,opening_amount,status) values(p_pharmacy_id,p_opening_amount,'open') returning id into v_id;
 if p_opening_amount>0 then insert into public.cash_movements(pharmacy_id,session_id,movement_type,amount,description,created_by) values(p_pharmacy_id,v_id,'opening',p_opening_amount,'Fundo de abertura',auth.uid()); end if;
 insert into public.audit_logs(pharmacy_id,actor_id,action,entity_type,entity_id,details) values(p_pharmacy_id,auth.uid(),'open','cash_session',v_id,jsonb_build_object('opening_amount',p_opening_amount));
 return jsonb_build_object('session_id',v_id,'opening_amount',p_opening_amount,'status','open');
end; $$;

create or replace function public.close_pharmacy_cash(p_pharmacy_id uuid,p_session_id uuid,p_counted_amount numeric)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_session record; v_expected numeric(14,2); v_variance numeric(14,2);
begin
 if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;
 if coalesce(p_counted_amount,-1)<0 then raise exception 'Valor contado inválido.'; end if;
 if not private.has_pharmacy_role(p_pharmacy_id,array['pharmacy_owner','pharmacy_admin','cashier','accountant']::text[]) and not private.is_platform_admin() then raise exception 'Sem permissão para fechar caixa.'; end if;
 select * into v_session from public.cash_sessions where id=p_session_id and pharmacy_id=p_pharmacy_id and status='open' for update;
 if not found then raise exception 'Turno aberto não encontrado.'; end if;
 select coalesce(sum(case when movement_type in ('opening','sale','income') then amount when movement_type in ('expense','refund') then -amount else 0 end),0)
 into v_expected from public.cash_movements where session_id=p_session_id and pharmacy_id=p_pharmacy_id;
 v_variance:=p_counted_amount-v_expected;
 update public.cash_sessions set closing_amount=p_counted_amount,status='closed',closed_by=auth.uid(),closed_at=now() where id=p_session_id;
 insert into public.cash_movements(pharmacy_id,session_id,movement_type,amount,description,created_by)
 values(p_pharmacy_id,p_session_id,'closing',p_counted_amount,'Valor contado no fecho',auth.uid());
 insert into public.audit_logs(pharmacy_id,actor_id,action,entity_type,entity_id,details)
 values(p_pharmacy_id,auth.uid(),'close','cash_session',p_session_id,jsonb_build_object('expected_amount',v_expected,'counted_amount',p_counted_amount,'variance',v_variance));
 return jsonb_build_object('session_id',p_session_id,'expected_amount',v_expected,'counted_amount',p_counted_amount,'variance',v_variance,'status','closed');
end; $$;

revoke all on function public.receive_pharmacy_purchase(uuid,uuid,jsonb,numeric,text,text) from public,anon;
revoke all on function public.open_pharmacy_cash(uuid,numeric) from public,anon;
revoke all on function public.close_pharmacy_cash(uuid,uuid,numeric) from public,anon;
grant execute on function public.receive_pharmacy_purchase(uuid,uuid,jsonb,numeric,text,text) to authenticated;
grant execute on function public.open_pharmacy_cash(uuid,numeric) to authenticated;
grant execute on function public.close_pharmacy_cash(uuid,uuid,numeric) to authenticated;
