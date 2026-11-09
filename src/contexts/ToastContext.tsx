import React, { createContext, useContext } from 'react'
import { notification } from 'antd'

interface ToastContextType {
  toast: ReturnType<typeof notification.useNotification>[0]
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [api, contextHolder] = notification.useNotification()

  return (
    <ToastContext.Provider value={{ toast: api }}>
      {contextHolder}
      {children}
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
