import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Resolves org members with emails via the team-members Edge Function.
// Falls back to an empty list if the function isn't deployed.
export function useMembers(orgId) {
  const [members, setMembers] = useState([])
  useEffect(() => {
    let cancelled = false
    supabase.functions.invoke('team-members', { body: { org_id: orgId } })
      .then(({ data }) => { if (!cancelled && data?.members) setMembers(data.members) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [orgId])
  return members
}

export const shortName = (email) => (email ? email.split('@')[0] : '—')
