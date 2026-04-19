// Stub temporal - implementación real pendiente
export const AuditService = {
  recordAction: (data: any) => {
    console.log('[AUDIT STUB]', data)
    return Promise.resolve()
  },
  triggerAlert: (title: string, message: string, severity: string) => {
    console.log('[AUDIT ALERT STUB]', { title, message, severity })
  }
}
