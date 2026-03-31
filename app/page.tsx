'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Spin } from 'antd'
import { getRole, isAuthenticated } from '@/lib/auth'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login')
      return
    }
    const role = getRole()
    if (role === 'library') {
      router.replace('/staff/dashboard')
    } else {
      router.replace('/dashboard')
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spin size="large" />
    </div>
  )
}
