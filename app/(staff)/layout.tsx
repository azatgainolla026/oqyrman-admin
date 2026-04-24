'use client'

import {
  BankOutlined,
  BookOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import SidebarLayout from '@/components/SidebarLayout'
import AuthGuard from '@/components/AuthGuard'

const menuItems = [
  { key: '/staff/dashboard', icon: <BankOutlined />, label: 'Моя библиотека' },
  { key: '/staff/books', icon: <BookOutlined />, label: 'Книги' },
  { key: '/staff/reservations', icon: <CalendarOutlined />, label: 'Брони' },
]

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allow="staff">
      <SidebarLayout
        menuItems={menuItems}
        title="Oqyrman Staff"
        collapsedIcon={<BankOutlined className="text-white text-xl" />}
      >
        {children}
      </SidebarLayout>
    </AuthGuard>
  )
}
