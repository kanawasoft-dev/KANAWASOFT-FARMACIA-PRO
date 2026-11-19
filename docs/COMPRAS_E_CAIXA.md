# Compras, recepção e controlo de caixa

## Receber uma compra
O ecrã Compras permite seleccionar fornecedor, factura, produto, quantidade, custo unitário, lote, validade e imposto. Ao confirmar, o frontend chama:

```js
const { data, error } = await supabase.rpc('receive_pharmacy_purchase', {
  p_pharmacy_id: pharmacyId,
  p_supplier_id: supplierId || null,
  p_items: [{
    product_id: productId,
    quantity: 12,
    unit_cost: 350,
    lot_number: 'LOTE-2026-01',
    expiry_date: '2027-12-31'
  }],
  p_tax: 0,
  p_invoice_number: 'FACT-001',
  p_notes: null
});
if (error) throw error;
```

A função valida farmácia, função do utilizador, fornecedor, produto activo, quantidade, custo, lote e validade. Cria o documento de compra, linhas, lotes e movimentos de stock na mesma transacção. Actualiza o último custo de aquisição do produto e regista auditoria. Uma falha reverte toda a operação.

## Abrir caixa
```js
await supabase.rpc('open_pharmacy_cash', {
  p_pharmacy_id: pharmacyId,
  p_opening_amount: 10000
});
```
Impede dois turnos abertos simultaneamente para a mesma farmácia e regista o fundo inicial.

## Fechar caixa
```js
const { data, error } = await supabase.rpc('close_pharmacy_cash', {
  p_pharmacy_id: pharmacyId,
  p_session_id: openSessionId,
  p_counted_amount: 42500
});
if (error) throw error;
// data.expected_amount, data.counted_amount e data.variance
```

O saldo esperado soma fundo inicial, vendas em numerário e entradas, subtraindo despesas e reembolsos lançados no turno. A função fecha o turno, regista o valor contado e a diferença, e escreve auditoria.

## Segurança e limites
- As três RPCs exigem sessão autenticada e função autorizada na farmácia.
- Execução para `anon` e `public` revogada.
- Não foi criada venda ou compra de teste, nem foram inseridos dados de demonstração.
- A confirmação em ambiente real ainda deve ser testada com utilizador, fornecedor, produto e lote reais antes da operação comercial.
