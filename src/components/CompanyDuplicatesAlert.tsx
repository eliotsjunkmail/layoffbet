import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { findPotentialDuplicateGroups, loadDismissedPairs } from '../utils/companyDuplicates'
import { DuplicateCompaniesModal } from './DuplicateCompaniesModal'

// Surfaces the potential-duplicate-companies review automatically for admins, once per
// session, mirroring ModerationQueueAlert's pattern — rather than requiring them to find
// it themselves under Admin > Settings.
export const CompanyDuplicatesAlert = () => {
  const currentUser = useStore(s => s.currentUser)
  const companies = useStore(s => s.companies)
  const [show, setShow] = useState(false)
  const hasShownRef = useRef(false)

  const groups = useMemo(() => findPotentialDuplicateGroups(companies, loadDismissedPairs()), [companies])

  useEffect(() => {
    if (hasShownRef.current) return
    if (currentUser?.isAdmin && groups.length > 0) {
      setShow(true)
      hasShownRef.current = true
    }
  }, [currentUser?.isAdmin, groups.length])

  if (!currentUser?.isAdmin) return null
  if (!show || groups.length === 0) return null

  return (
    <DuplicateCompaniesModal
      companies={companies}
      username={currentUser.username || ''}
      password={currentUser.password || ''}
      onClose={() => setShow(false)}
      onMerged={() => {
        setShow(false)
        window.location.reload()
      }}
    />
  )
}
