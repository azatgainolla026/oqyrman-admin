'use client'

import { Dropdown, Button } from 'antd'
import { GlobalOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { MenuProps } from 'antd'

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const current = i18n.language?.startsWith('kk') ? 'kk' : 'ru'

  const items: MenuProps['items'] = [
    {
      key: 'ru',
      label: 'Русский',
      onClick: () => i18n.changeLanguage('ru'),
    },
    {
      key: 'kk',
      label: 'Қазақша',
      onClick: () => i18n.changeLanguage('kk'),
    },
  ]

  return (
    <Dropdown
      menu={{ items, selectedKeys: [current] }}
      trigger={['click']}
      placement="bottomRight"
    >
      <Button type="text" icon={<GlobalOutlined />} className="!text-gray-600">
        {current === 'kk' ? 'KK' : 'RU'}
      </Button>
    </Dropdown>
  )
}
