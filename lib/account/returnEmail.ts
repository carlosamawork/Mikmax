const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Aviso interno de solicitud de devolución (Mailgun). Texto plano en tabla simple.
export function returnRequestInternalEmail(data: {
  orderNumber: string
  customerEmail: string
  lines: {title: string; quantity: number; reason: string}[]
  note?: string
}): {subject: string; html: string} {
  const rows = data.lines
    .map(
      (l) =>
        `<tr><td>${escapeHtml(l.title)}</td><td>${l.quantity}</td><td>${escapeHtml(l.reason)}</td></tr>`,
    )
    .join('')
  return {
    subject: `Solicitud de devolución — pedido ${data.orderNumber}`,
    html: `
      <h2>Solicitud de devolución</h2>
      <p><b>Pedido:</b> ${escapeHtml(data.orderNumber)}<br/><b>Cliente:</b> ${escapeHtml(data.customerEmail)}</p>
      <table border="1" cellpadding="6" cellspacing="0">
        <tr><th>Artículo</th><th>Cantidad</th><th>Motivo</th></tr>${rows}
      </table>
      ${data.note ? `<p><b>Nota del cliente:</b> ${escapeHtml(data.note)}</p>` : ''}
      <p>Revisar y aprobar/rechazar desde el pedido en Shopify.</p>`,
  }
}
