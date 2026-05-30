import { Router } from 'express'
import { sendSplitBillEmails, buildEmailHTML } from '../services/resend.js'

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

// POST /api/split-bill/send-email
router.post('/send-email', async (req, res) => {
  try {
    const { trip_name, items, currency = 'Rp', participant_emails = [] } = req.body

    if (!trip_name || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'trip_name and items[] are required' })
      return
    }

    const balances = calculateBalances(items)
    const totalAmount = items.reduce((sum: number, b: any) => sum + Number(b.amount), 0)

    // Enrich balances with email from participant_emails lookup
    const enrichedBalances = balances.map(b => {
      const emailEntry = (participant_emails as any[]).find(
        (p: any) => p.name?.toLowerCase() === b.name.toLowerCase()
      )
      return { ...b, email: emailEntry?.email || '' }
    })

    // Send real emails via Resend if any emails are provided
    const hasEmails = enrichedBalances.some(b => b.email)
    let sent_count = 0
    let email_errors: string[] = []

    if (hasEmails) {
      const result = await sendSplitBillEmails({
        tripName: trip_name,
        items,
        currency,
        participantEmails: enrichedBalances,
        totalAmount,
      })
      sent_count = result.sent
      email_errors = result.errors
    }

    const preview_html = buildEmailHTML({
      tripName: trip_name,
      items,
      currency,
      participantEmails: enrichedBalances,
      totalAmount,
    })

    res.json({
      sent_count,
      preview_html,
      balances: enrichedBalances.map(b => ({
        name: b.name,
        owes: b.owes,
        owed: b.owed,
        net: b.net,
      })),
      errors: email_errors,
      message: hasEmails
        ? sent_count > 0
          ? `Email sent to ${sent_count} participant(s)`
          : 'No emails sent — check errors'
        : 'Preview generated (no emails provided)',
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