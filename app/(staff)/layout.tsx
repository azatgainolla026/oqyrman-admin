'use client'

import {
  BankOutlined,
  BookOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import SidebarLayout from '@/components/SidebarLayout'
import AuthGuard from '@/components/AuthGuard'

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()

  const menuItems = [
    { key: '/staff/dashboard', icon: <BankOutlined />, label: t('sidebar.myLibrary') },
    { key: '/staff/books', icon: <BookOutlined />, label: t('sidebar.books') },
    { key: '/staff/reservations', icon: <CalendarOutlined />, label: t('sidebar.reservations') },
  ]

  return (
    <AuthGuard allow="staff">
      <SidebarLayout
        menuItems={menuItems}
        title={t('sidebar.staffTitle')}
        collapsedIcon={<BankOutlined className="text-white text-xl" />}
      >
        {children}
      </SidebarLayout>
    </AuthGuard>
  )
}
