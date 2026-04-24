'use client'

import {
  DashboardOutlined,
  UserOutlined,
  BankOutlined,
  BookOutlined,
  CalendarOutlined,
  ScheduleOutlined,
} from '@ant-design/icons'
import SidebarLayout from '@/components/SidebarLayout'
import AuthGuard from '@/components/AuthGuard'

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Главная' },
  { key: '/admin/users', icon: <UserOutlined />, label: 'Пользователи' },
  { key: '/admin/libraries', icon: <BankOutlined />, label: 'Библиотеки' },
  { key: '/admin/books', icon: <BookOutlined />, label: 'Книги' },
  { key: '/admin/reservations', icon: <CalendarOutlined />, label: 'Брони' },
  { key: '/admin/events', icon: <ScheduleOutlined />, label: 'События' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allow="admin">
      <SidebarLayout
        menuItems={menuItems}
        title="Oqyrman Admin"
        collapsedIcon={<BookOutlined className="text-white text-xl" />}
      >
        {children}
      </SidebarLayout>
    </AuthGuard>
  )
}
