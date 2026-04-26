'use client'

import {
  DashboardOutlined,
  UserOutlined,
  BankOutlined,
  BookOutlined,
  CalendarOutlined,
  ScheduleOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import SidebarLayout from '@/components/SidebarLayout'
import AuthGuard from '@/components/AuthGuard'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: t('sidebar.home') },
    { key: '/admin/users', icon: <UserOutlined />, label: t('sidebar.users') },
    { key: '/admin/libraries', icon: <BankOutlined />, label: t('sidebar.libraries') },
    { key: '/admin/books', icon: <BookOutlined />, label: t('sidebar.books') },
    { key: '/admin/reservations', icon: <CalendarOutlined />, label: t('sidebar.reservations') },
    { key: '/admin/events', icon: <ScheduleOutlined />, label: t('sidebar.events') },
  ]

  return (
    <AuthGuard allow="admin">
      <SidebarLayout
        menuItems={menuItems}
        title={t('sidebar.adminTitle')}
        collapsedIcon={<BookOutlined className="text-white text-xl" />}
      >
        {children}
      </SidebarLayout>
    </AuthGuard>
  )
}
