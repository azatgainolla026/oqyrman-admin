'use client'

import { ConfigProvider, App } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import kkKZ from 'antd/locale/kk_KZ'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

const theme = {
  token: {
    colorPrimary: '#1E5945',
    colorLink: '#1E5945',
    colorLinkHover: '#2a7a5e',
    borderRadius: 8,
  },
}

export default function AntdProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  const locale = i18n.language?.startsWith('kk') ? kkKZ : ruRU

  return (
    <ConfigProvider theme={theme} locale={locale}>
      <App>{children}</App>
    </ConfigProvider>
  )
}
