# Operações POS e stock

A migração `006_complete_pos_atomic_sales_and_stock.sql` acrescenta:

- Vista `v_pharmacy_stock`, com stock disponível, stock expirado e próxima validade.
- RPC `complete_pharmacy_sale`, que recebe o carrinho em JSON e executa a venda numa única transacção.
- Preços e totais calculados no servidor; o browser não define o preço final.
- Baixa de stock por FEFO (lote com validade mais próxima primeiro); lotes expirados não são vendidos.
- Bloqueio de stock insuficiente, produto inactivo, cliente de outra farmácia e medicamento sujeito a receita sem receita associada.
- Registo de itens, movimentos de stock, movimento de caixa quando o pagamento é em numerário e evento de auditoria.
- Permissão limitada a utilizadores autenticados com função operacional autorizada; execução anónima revogada.

## Chamada pelo frontend

```js
const { data, error } = await supabase.rpc('complete_pharmacy_sale', {
  p_pharmacy_id: pharmacyId,
  p_items: cart.map(item => ({
    product_id: item.product_id,
    quantity: Number(item.quantity)
  })),
  p_payment_method: 'cash',
  p_discount: 0,
  p_tax: 0,
  p_customer_id: customerId || null,
  p_prescription_id: prescriptionId || null,
  p_notes: null
});
if (error) throw error;
// data contém sale_id, sale_number, subtotal, desconto, imposto e total.
```

Não envie preços unitários como fonte de verdade: a função lê `sale_price` no PostgreSQL.
Para pagamento em numerário é obrigatório existir um turno de caixa aberto.
