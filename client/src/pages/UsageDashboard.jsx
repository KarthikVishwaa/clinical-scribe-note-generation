import { useState, useEffect } from 'react'
import { usageApi } from '../services/api'
import styles from './UsageDashboard.module.css'

function ProgressBar({ pct, color }) {
  const safeColor = color || 'var(--color-primary)'
  const safePct   = Math.min(100, Math.max(0, pct || 0))
  const trackColor = safePct >= 90 ? '#DC2626' : safePct >= 70 ? '#D97706' : safeColor
  return (
    <div className={styles.progressTrack}>
      <div
        className={styles.progressFill}
        style={{ width: `${safePct}%`, background: trackColor }}
      />
    </div>
  )
}

function StatCard({ title, spent, budget, pct, calls, colorClass }) {
  return (
    <div className={`${styles.statCard} ${colorClass || ''}`}>
      <div className={styles.statHeader}>
        <span className={styles.statTitle}>{title}</span>
        <span className={styles.statPct} style={{ color: pct >= 90 ? '#DC2626' : pct >= 70 ? '#D97706' : 'var(--color-success)' }}>
          {pct}%
        </span>
      </div>
      <div className={styles.statAmounts}>
        <span className={styles.statSpent}>${spent.toFixed(4)}</span>
        <span className={styles.statBudget}>/ ${budget.toFixed(2)}</span>
      </div>
      <ProgressBar pct={pct} />
      <div className={styles.statCalls}>{calls} API calls</div>
    </div>
  )
}

function ServiceRow({ label, calls, cost }) {
  return (
    <div className={styles.serviceRow}>
      <span className={styles.serviceLabel}>{label}</span>
      <span className={styles.serviceCalls}>{calls} calls</span>
      <span className={styles.serviceCost}>${cost.toFixed(4)}</span>
    </div>
  )
}

const ENDPOINT_LABELS = {
  soap_note:              'SOAP Note Generation',
  transcription:          'Audio Transcription',
  prescription:           'Prescription',
  differential_diagnosis: 'Differential Diagnosis',
  lab_interpretation:     'Lab Interpretation',
  referral_letter:        'Referral Letter',
  followup_reminders:     'Follow-up Reminders',
}

export default function UsageDashboard() {
  const [stats, setStats]         = useState(null)
  const [history, setHistory]     = useState([])
  const [totalHistory, setTotal]  = useState(0)
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [budgetForm, setBudgetForm] = useState({ daily: '', monthly: '' })
  const [budgetMsg, setBudgetMsg] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [sRes, hRes] = await Promise.all([
        usageApi.stats(),
        usageApi.history(page, 15),
      ])
      setStats(sRes.data)
      setHistory(hRes.data.items || [])
      setTotal(hRes.data.total || 0)
      setBudgetForm({
        daily:   sRes.data.daily.budget_usd.toString(),
        monthly: sRes.data.monthly.budget_usd.toString(),
      })
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [page])

  const saveBudget = async () => {
    setSaving(true)
    setBudgetMsg('')
    try {
      await usageApi.updateBudget({
        daily_budget_usd:   parseFloat(budgetForm.daily)   || 1,
        monthly_budget_usd: parseFloat(budgetForm.monthly) || 5,
      })
      setBudgetMsg('Budget updated successfully.')
      load()
    } catch {
      setBudgetMsg('Failed to update budget.')
    }
    setSaving(false)
  }

  if (loading && !stats) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading usage data...</div>
      </div>
    )
  }

  const d = stats?.daily
  const m = stats?.monthly

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>API Usage & Cost Control</h1>
          <p className={styles.pageSubtitle}>Monitor AI spending and manage budget limits in real time</p>
        </div>
      </div>

      {/* Spend overview */}
      {stats && (
        <div className={styles.statsGrid}>
          <StatCard
            title="Today"
            spent={d.cost_usd}
            budget={d.budget_usd}
            pct={d.budget_used_pct}
            calls={d.calls}
          />
          <StatCard
            title="This Month"
            spent={m.cost_usd}
            budget={m.budget_usd}
            pct={m.budget_used_pct}
            calls={m.calls}
          />
        </div>
      )}

      <div className={styles.columns}>
        {/* Service breakdown */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Today — By Service</h2>
          {d?.breakdown?.length ? (
            <div className={styles.serviceList}>
              {d.breakdown.map(s => (
                <ServiceRow key={s.service} label={s.label} calls={s.calls} cost={s.cost_usd} />
              ))}
            </div>
          ) : (
            <p className={styles.empty}>No API calls today.</p>
          )}

          <h2 className={styles.panelTitle} style={{ marginTop: 28 }}>This Month — By Service</h2>
          {m?.breakdown?.length ? (
            <div className={styles.serviceList}>
              {m.breakdown.map(s => (
                <ServiceRow key={s.service} label={s.label} calls={s.calls} cost={s.cost_usd} />
              ))}
            </div>
          ) : (
            <p className={styles.empty}>No API calls this month.</p>
          )}
        </div>

        {/* Budget settings */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Budget Limits</h2>
          <p className={styles.panelDesc}>
            When a limit is reached, AI features return a 429 error until the period resets.
            Set to 0 to disable the limit.
          </p>
          <div className={styles.budgetForm}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Daily Limit (USD)</label>
              <div className={styles.inputPrefix}>
                <span>$</span>
                <input
                  type="number"
                  min="0"
                  step="0.50"
                  value={budgetForm.daily}
                  onChange={e => setBudgetForm(f => ({ ...f, daily: e.target.value }))}
                  className={styles.input}
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Monthly Limit (USD)</label>
              <div className={styles.inputPrefix}>
                <span>$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={budgetForm.monthly}
                  onChange={e => setBudgetForm(f => ({ ...f, monthly: e.target.value }))}
                  className={styles.input}
                />
              </div>
            </div>
            <button className={styles.saveBtn} onClick={saveBudget} disabled={saving}>
              {saving ? 'Saving...' : 'Save Limits'}
            </button>
            {budgetMsg && (
              <p className={budgetMsg.includes('success') ? styles.msgOk : styles.msgErr}>
                {budgetMsg}
              </p>
            )}
          </div>

          {/* Pricing reference */}
          <div className={styles.pricingNote}>
            <strong>Pricing reference</strong>
            <table className={styles.pricingTable}>
              <tbody>
                <tr><td>GPT-4o-mini</td><td>$0.15 / 1M input tokens</td></tr>
                <tr><td></td><td>$0.60 / 1M output tokens</td></tr>
                <tr><td>Whisper</td><td>$0.006 / minute</td></tr>
                <tr><td>Claude Haiku</td><td>$0.25 / 1M input tokens</td></tr>
                <tr><td></td><td>$1.25 / 1M output tokens</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Call history */}
      <div className={styles.panel} style={{ marginTop: 24 }}>
        <h2 className={styles.panelTitle}>Recent API Calls ({totalHistory})</h2>
        {history.length === 0 ? (
          <p className={styles.empty}>No API calls recorded yet.</p>
        ) : (
          <>
            <div className={styles.historyTable}>
              <div className={styles.historyHeader}>
                <span>Time</span>
                <span>Service</span>
                <span>Feature</span>
                <span>Tokens In</span>
                <span>Tokens Out</span>
                <span>Cost</span>
              </div>
              {history.map(row => (
                <div key={row.id} className={styles.historyRow}>
                  <span className={styles.historyTime}>
                    {row.created_at
                      ? new Date(row.created_at).toLocaleString('en-US', {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })
                      : '—'}
                  </span>
                  <span>
                    <span className={`${styles.servicePill} ${styles['svc_' + row.service]}`}>
                      {row.service === 'openai_gpt'       ? 'GPT' :
                       row.service === 'openai_whisper'   ? 'Whisper' :
                       row.service === 'anthropic_claude' ? 'Claude' : row.service}
                    </span>
                  </span>
                  <span className={styles.endpoint}>
                    {ENDPOINT_LABELS[row.endpoint] || row.endpoint}
                  </span>
                  <span className={styles.mono}>{row.tokens_input > 0 ? row.tokens_input.toLocaleString() : row.audio_minutes > 0 ? `${row.audio_minutes.toFixed(1)}m` : '—'}</span>
                  <span className={styles.mono}>{row.tokens_output > 0 ? row.tokens_output.toLocaleString() : '—'}</span>
                  <span className={styles.cost}>${row.cost_usd.toFixed(5)}</span>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalHistory > 15 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </button>
                <span className={styles.pageInfo}>
                  Page {page} of {Math.ceil(totalHistory / 15)}
                </span>
                <button
                  className={styles.pageBtn}
                  disabled={page >= Math.ceil(totalHistory / 15)}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
