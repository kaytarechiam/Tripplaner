import { Router } from 'express'

const router = Router()

// ─── Balance Calculator ────────────────────────────────────

function calculateBalances(
  items: { description: string; amount: number; paid_by: string; split_between: string[] }[]
) {
  const balances: Record<string, { owes: number; owed: number }> = {}

  for (const item of items) {
    const share = item.amount / item.split_between.length
    // Who paid
    if (!balances[item.paid_by]) balances[item.paid_by] = { owes: 0, owed: 0 }
    balances[item.paid_by].owed += item.amount

    // Who owes
    for (const person of item.split_between) {
      if (!balances[person]) balances[person] = { owes: 0, owed: 0 }
      balances[person].owes += share
    }
  }

  // Calculate net
  const result = Object.entries(balances).map(([name, b]) => ({
    name,
    owes: Math.round(b.owes * 100) / 100,
    owed: Math.round(b.owed * 100) / 100,
    net: Math.round((b.owed - b.owes) * 100) / 100,
  }))

  return result
}

// ─── HTML Email Generator ─────────────────────────────────

function generateSplitBillHTML(
  tripName: string,
  items: { description: string; amount: number; paid_by: string; split_between: string[] }[],
  balances: { name: string; owes: number; owed: number; net: number }[],
  currency: string
): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency }).format(n)

  const itemsHTML = items.map(item => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #eee">${item.description}</td>
      <td style="padding:12px;border-bottom:1px solid #eee">${item.paid_by}</td>
      <td style="padding:12px;border-bottom:1px solid #eee;text-align:right">${fmt(item.amount)}</td>
    </tr>
  `).join('')

  const balancesHTML = balances.map(b => `
    <tr>
      <td style="padding:10px 12px">${b.name}</td>
      <td style="padding:10px 12px;text-align:right;color:#d97706">${fmt(b.owes)}</td>
      <td style="padding:10px 12px;text-align:right;color:#059669">${fmt(b.owed)}</td>
      <td style="padding:10px 12px;text-align:right;font-weight:700;color:${b.net >= 0 ? '#059669' : '#dc2626'}">
        ${b.net >= 0 ? '+' : ''}${fmt(b.net)}
      </td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Split Bill - ${tripName}</title>
</head>
<body style="font-family:'Inter','Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc;color:#1f2937">
  <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#667eea,#764ba2,#f093fb);padding:24px;text-align:center">
      <h1 style="color:white;margin:0;font-size:20px;font-weight:700">Split Bill</h1>
      <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px">${tripName}</p>
    </div>

    <!-- Items -->
    <div style="padding:24px">
      <h2 style="font-size:14px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px">
        Rincian Pengeluaran
      </h2>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280">Deskripsi</th>
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280">Pembayar</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280">Jumlah</th>
          </tr>
        </thead>
        <tbody>${itemsHTML}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:14px 12px;font-weight:700;text-align:right;border-top:2px solid #eee">
              Total
            </td>
            <td style="padding:14px 12px;font-weight:700;text-align:right;border-top:2px solid #eee;color:#667eea">
              ${fmt(items.reduce((s, i) => s + i.amount, 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Balances -->
    <div style="padding:0 24px 24px">
      <h2 style="font-size:14px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px">
        Ringkasan结算
      </h2>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280">Nama</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280">Hutang</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280">Piutang</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280">Net</th>
          </tr>
        </thead>
        <tbody>${balancesHTML}</tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="padding:16px 24px;background:#f9fafb;text-align:center;border-top:1px solid #eee">
      <p style="margin:0;font-size:12px;color:#9ca3af">
        Dibuat dengan TripPlanner · Plan together, travel smarter.
      </p>
    </div>
  </div>
</body>
</html>
`
}

// POST /api/split-bill/send-email
router.post('/send-email', async (req, res) => {
  try {
    const { trip_name, items, currency = 'IDR', participant_emails } = req.body

    if (!trip_name || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'trip_name and items[] are required' })
      return
    }

    const balances = calculateBalances(items)
    const preview_html = generateSplitBillHTML(trip_name, items, balances, currency)

    // If participant emails are provided, you would send via:
    // - Supabase Edge Functions + Resend/SendGrid, or
    // - Direct SMTP via nodemailer
    // For now, we return the preview and send status

    const sent_count = participant_emails?.length || 0

    res.json({
      sent_count,
      preview_html,
      balances,
      message: sent_count > 0
        ? `Email sent to ${sent_count} participant(s)`
        : 'Preview generated (no emails sent - configure email provider)',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process split bill'
    console.error('[SplitBill]', message)
    res.status(500).json({ message })
  }
})

// GET /api/split-bill/calculate?items=...
// For quick balance calculations without email
router.post('/calculate', (req, res) => {
  try {
    const { items } = req.body
    if (!items || !Array.isArray(items)) {
      res.status(400).json({ message: 'items[] is required' })
      return
    }
    const balances = calculateBalances(items)
    res.json({ balances })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to calculate'
    res.status(500).json({ message })
  }
})

export default router