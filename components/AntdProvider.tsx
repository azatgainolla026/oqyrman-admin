'use client'

import { ConfigProvider, App } from 'antd'
import type { ReactNode } from 'react'

const theme = {
  token: {
    colorPrimary: '#1E5945',
    colorLink: '#1E5945',
    colorLinkHover: '#2a7a5e',
    borderRadius: 8,
  },
}

export default function AntdProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider theme={theme}>
      <App>{children}</App>
    </ConfigProvider>
  )
}
