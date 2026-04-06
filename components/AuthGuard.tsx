'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Spin } from 'antd'
import { isAuthenticated, isAdmin, isStaff } from '@/lib/auth'

interface Props {
  children: ReactNode
  allow: 'admin' | 'staff'
}

export default function AuthGuard({ children, allow }: Props) {
  const router = useRouter()
  const [ok, setOk] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login')
      return
    }

    if (allow === 'admin' && !isAdmin()) {
      router.replace('/staff/dashboard')
      return
    }

    if (allow === 'staff' && !isStaff()) {
      router.replace('/dashboard')
      return
    }

    setOk(true)
  }, [allow, router])

  if (!ok) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    )
  }

  return <>{children}</>
}
