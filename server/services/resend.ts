// server/services/resend.ts
import { Resend } from 'resend'

let _client: Resend | null = null

export function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Resend] Missing RESEND_API_KEY')
    return null
  }
  if (!_client) {
    _client = new Resend(process.env.RESEND_API_KEY)
  }
  return _client
}

export interface SplitBillEmailData {
  tripName: string
  items: {
    description: string
    amount: number
    paid_by: string
    split_between: string[]
  }[]
  currency: string
  participantEmails: { name: string; email: string; owes: number; owed: number; net: number }[]
  totalAmount: number
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function buildEmailHTML(data: SplitBillEmailData): string {
  const { tripName, items, currency, participantEmails, totalAmount } = data

  const itemRows = items.map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${escapeHtml(item.description)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">${currency} ${item.amount.toLocaleString('id-ID')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${escapeHtml(item.paid_by)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${escapeHtml(item.split_between.join(', '))}</td>
    </tr>
  `).join('')

  const balanceRows = participantEmails.map(p => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-weight:600">${escapeHtml(p.name)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:${p.net >= 0 ? '#10b981' : '#ef4444'};font-weight:600">
        ${p.net >= 0 ? '+' : ''}${currency} ${Math.abs(p.net).toLocaleString('id-ID')}
        <span style="font-size:12px;font-weight:400;color:#6b7280">(${p.net >= 0 ? 'Hak Terima' : 'Hutang'})</span>
      </td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Split Bill - ${escapeHtml(tripName)}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:32px;text-align:center">
      <h1 style="color:white;margin:0;font-size:24px">&#x2708;&#xFE0F; Split Bill</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0">${escapeHtml(tripName)}</p>
    </div>
    <div style="padding:24px">
      <div style="background:#f0fdf4;border-radius:12px;padding:16px;margin-bottom:24px;text-align:center">
        <p style="margin:0;color:#6b7280;font-size:14px">Total Pengeluaran</p>
        <p style="margin:4px 0 0;font-size:28px;font-weight:800;color:#111">${currency} ${totalAmount.toLocaleString('id-ID')}</p>
      </div>
      <h2 style="font-size:16px;color:#374151;margin:0 0 12px">Detail Pengeluaran</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:8px 12px;text-align:left;font-size:13px;color:#6b7280">Deskripsi</th>
            <th style="padding:8px 12px;text-align:right;font-size:13px;color:#6b7280">Jumlah</th>
            <th style="padding:8px 12px;text-align:left;font-size:13px;color:#6b7280">Dibayar</th>
            <th style="padding:8px 12px;text-align:left;font-size:13px;color:#6b7280">Split</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <h2 style="font-size:16px;color:#374151;margin:0 0 12px">Ringkasan Balance</h2>
      <table style="width:100%;border-collapse:collapse">
        <tbody>${balanceRows}</tbody>
      </table>
      <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;text-align:center">
        Dikirim dari TripPlanner &middot; Selesaikan pembayaran secepatnya &#x1F64F;
      </p>
    </div>
  </div>
</body>
</html>`
}

export async function sendSplitBillEmails(data: SplitBillEmailData): Promise<{ sent: number; errors: string[] }> {
  const resend = getResend()
  if (!resend) throw new Error('Resend not configured — add RESEND_API_KEY to .env')

  const html = buildEmailHTML(data)
  const errors: string[] = []
  let sent = 0

  for (const participant of data.participantEmails) {
    if (!participant.email) continue
    try {
      await resend.emails.send({
        from: 'TripPlanner <onboarding@resend.dev>',
        to: participant.email,
        subject: `Split Bill: ${data.tripName}`,
        html,
      })
      sent++
    } catch (err: any) {
      errors.push(`${participant.name}: ${err.message}`)
    }
  }

  return { sent, errors }
}
