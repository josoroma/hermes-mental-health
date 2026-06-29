'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAtomValue, useSetAtom } from 'jotai'
import { activePatientIdAtom, showUiLabelsAtom } from '@/lib/state/_atoms'

export const AppNav = () => {
  const activePatientId = useAtomValue(activePatientIdAtom)
  const showUiLabels = useAtomValue(showUiLabelsAtom)
  const setShowUiLabels = useSetAtom(showUiLabelsAtom)
  const pathname = usePathname()

  const isPatientPage = activePatientId &&
    (pathname.startsWith(`/patients/${activePatientId}`) ||
     (pathname.includes("/sessions") && activePatientId) ||
     (pathname.includes("/notes") && activePatientId))

  const activeClass = 'text-foreground font-medium'
  const inactiveClass = 'hover:text-foreground transition-colors'

  const isProfile = pathname === `/patients/${activePatientId}`
  const isAssessments = pathname.startsWith(`/patients/${activePatientId}/assessments`)
  const isResults = pathname.startsWith(`/patients/${activePatientId}/results`) && !pathname.includes("/sessions") && !pathname.includes("/notes")
  const isSessions = pathname.includes("/sessions")
  const isNotes = pathname.includes("/notes")

  return (
    <header className="ui-header ui-header-nav sticky top-0 z-50 border-b glass-panel">
      <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-sm tracking-tight">
            Hermes Mental Health
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            {isPatientPage && (
              <>
                <Link
                  href={`/patients/${activePatientId}`}
                  className={isProfile ? activeClass : inactiveClass}
                >
                  Profile
                </Link>
                <Link
                  href={`/patients/${activePatientId}/assessments`}
                  className={isAssessments ? activeClass : inactiveClass}
                >
                  Assessments
                </Link>
                <Link
                  href={`/patients/${activePatientId}/results`}
                  className={isResults ? activeClass : inactiveClass}
                >
                  Results
                </Link>
                <Link
                  href={`/patients/${activePatientId}/sessions`}
                  className={isSessions ? activeClass : inactiveClass}
                >
                  Sessions
                </Link>
                <Link
                  href={`/patients/${activePatientId}/notes`}
                  className={isNotes ? activeClass : inactiveClass}
                >
                  Notes
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showUiLabels}
              onChange={(e) => setShowUiLabels(e.target.checked)}
              className="size-3.5 rounded border-input accent-primary cursor-pointer"
            />
            UI Labels
          </label>
          <a
            href="https://github.com/josoroma/hermes-mental-health"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </header>
  )
}