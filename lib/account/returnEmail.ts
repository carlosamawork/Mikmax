// Aviso interno de solicitud de devolución (Mailgun). Texto plano en tabla simple.
export function returnRequestInternalEmail(data: {
  orderNumber: string
  customerEmail: string
  lines: {title: string; quantity: number; reason: string}[]
  note?: string
}): {subject: string; html: string} {
  const rows = data.lines
    .map((l) => `<tr><td>${l.title}</td><td>${l.quantity}</td><td>${l.reason}</td></tr>`)
    .join('')
  return {
    subject: `Solicitud de devolución — pedido ${data.orderNumber}`,
    html: `
      <h2>Solicitud de devolución</h2>
      <p><b>Pedido:</b> ${data.orderNumber}<br/><b>Cliente:</b> ${data.customerEmail}</p>
      <table border="1" cellpadding="6" cellspacing="0">
        <tr><th>Artículo</th><th>Cantidad</th><th>Motivo</th></tr>${rows}
      </table>
      ${data.note ? `<p><b>Nota del cliente:</b> ${data.note}</p>` : ''}
      <p>Revisar y aprobar/rechazar desde el pedido en Shopify.</p>`,
  }
}
