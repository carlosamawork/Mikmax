import {useState} from 'react'
import type {DocumentActionComponent, DocumentActionProps} from 'sanity'

// Llama a nuestra API route con el secreto compartido. El secreto se expone al Studio
// vía variable de entorno SANITY_STUDIO_B2B_ADMIN_SECRET (mismo valor que B2B_ADMIN_ACTION_SECRET).
async function callAdmin(action: string, id: string) {
  const site = process.env.SANITY_STUDIO_SITE_URL || ''
  const res = await fetch(`${site}/api/b2b/admin/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-b2b-admin-secret': process.env.SANITY_STUDIO_B2B_ADMIN_SECRET || '',
    },
    body: JSON.stringify({id}),
  })
  return res.json()
}

function makeAction(
  action: 'approve' | 'reject' | 'more_info',
  label: string,
): DocumentActionComponent {
  return (props: DocumentActionProps) => {
    const [loading, setLoading] = useState(false)
    return {
      label: loading ? `${label}…` : label,
      disabled: props.draft != null || loading,
      onHandle: async () => {
        setLoading(true)
        await callAdmin(action, props.id)
        setLoading(false)
        props.onComplete()
      },
    }
  }
}

export const b2bApprove = makeAction('approve', 'Aprobar')
export const b2bReject = makeAction('reject', 'Rechazar')
export const b2bMoreInfo = makeAction('more_info', 'Pedir info')
