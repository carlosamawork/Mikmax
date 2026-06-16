import {useState} from 'react'
import {useClient, type DocumentActionComponent, type DocumentActionProps} from 'sanity'

// Los botones del panel SOLO escriben el flag `adminAction` en el documento, usando el
// cliente autenticado del Studio (operación que solo pueden hacer miembros del proyecto).
// El trabajo real (crear cliente Shopify, emails) lo hace un webhook firmado en
// /api/b2b/admin, que después limpia el flag. Así el secreto nunca vive en el navegador.
function makeAction(
  action: 'approve' | 'reject' | 'more_info',
  label: string,
): DocumentActionComponent {
  return (props: DocumentActionProps) => {
    const client = useClient({apiVersion: '2023-05-17'})
    const [loading, setLoading] = useState(false)
    return {
      label: loading ? `${label}…` : label,
      disabled: props.draft != null || loading,
      onHandle: async () => {
        setLoading(true)
        await client
          .patch(props.id)
          .set({adminAction: action, updatedAt: new Date().toISOString()})
          .commit()
        setLoading(false)
        props.onComplete()
      },
    }
  }
}

export const b2bApprove = makeAction('approve', 'Aprobar')
export const b2bReject = makeAction('reject', 'Rechazar')
export const b2bMoreInfo = makeAction('more_info', 'Pedir info')
