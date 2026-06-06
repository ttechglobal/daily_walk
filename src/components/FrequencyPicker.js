// ─────────────────────────────────────────────
//  JoinPlanSheet
//  Bottom sheet that appears when a user taps "Start Plan" or "Join Plan".
//  Handles frequency selection + join action.
//
//  Props:
//    open        : boolean
//    onClose     : () => void
//    plan        : { planId, planName, content, itemUnit, totalItems, memberCount }
//    onJoined    : (frequency) => void  — called after successful join
// ─────────────────────────────────────────────
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { X, BookOpen, Loader2 } from 'lucide-react'
import { joinPlan } from '../lib/supabase/plans'
import { showToast } from './Toast'
import { FREQUENCY_OPTIONS } from '../lib/plan-schedule'

export function JoinPlanSheet({ open, onClose, plan, onJoined }) {
  const { t }          = useTheme()
  const [freq, setFreq] = useState(null)
  const [joining, setJoining] = useState(false)

  // Default frequency based on plan type
  const defaultFreq = plan?.itemUnit === 'verse'
    ? FREQUENCY_OPTIONS.find(f => f.id === '3verses')
    : FREQUENCY_OPTIONS.find(f => f.id === '1chapter')

  const selectedFreq = freq || defaultFreq

  async function handleJoin() {
    if (!plan || joining) return
    setJoining(true)
    try {
      await joinPlan(plan.planId, { frequency: selectedFreq })
      showToast('You\'re in! 🙌')
      onJoined?.(selectedFreq)
      onClose()
    } catch (e) {
      showToast(e.message === 'not_authenticated' ? 'Sign in to join' : 'Something went wrong')
    } finally {
      setJoining(false)
    }
  }

  const totalItems = plan?.totalItems || 0
  const itemUnit   = plan?.itemUnit   || 'chapter'

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[28px] px-5 pt-5 pb-10"
            style={{ background: t.bgCard, maxHeight: '90dvh', overflowY: 'auto' }}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full mx-auto mb-5"
              style={{ background: t.bgMuted }} />

            {/* Close */}
            <button onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: t.bgMuted }}>
              <X size={16} style={{ color: t.textMuted }} />
            </button>

            {/* Plan summary */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0"
                style={{ background: '#EDE9FF' }}>
                <BookOpen size={22} style={{ color: '#5B4FCF' }} />
              </div>
              <div>
                <p className="font-bold text-[16px]" style={{ color: t.text }}>
                  {plan?.planName || 'Reading Plan'}
                </p>
                <p className="text-[13px]" style={{ color: t.textMuted }}>
                  {totalItems} {itemUnit}{totalItems !== 1 ? 's' : ''} total
                  {plan?.memberCount > 1 ? ` · ${plan.memberCount} readers` : ''}
                </p>
              </div>
            </div>

            {/* Frequency picker */}
            <div className="mb-6">
              <p className="font-bold text-[15px] mb-3" style={{ color: t.text }}>
                How much do you want to read each day?
              </p>
              <FrequencyPicker
                value={selectedFreq}
                onChange={setFreq}
                content={plan?.content}
                itemUnit={itemUnit}
              />
            </div>

            {/* CTA */}
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-4 rounded-full text-white font-bold text-[16px] disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#5B4FCF,#3D3190)' }}
            >
              {joining
                ? <><Loader2 size={18} className="animate-spin" /> Joining…</>
                : 'Start reading →'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}