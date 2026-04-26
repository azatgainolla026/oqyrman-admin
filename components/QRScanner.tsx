'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Alert } from 'antd'
import { useTranslation } from 'react-i18next'

interface QRScannerProps {
  onScan: (token: string) => void
  active: boolean
}

export default function QRScanner({ onScan, active }: QRScannerProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const scannedRef = useRef(false)
  const runningRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!active || !containerRef.current) return

    const id = 'qr-scanner-' + Date.now()
    containerRef.current.id = id
    scannedRef.current = false
    runningRef.current = false
    setError(null)

    const scanner = new Html5Qrcode(id)

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (text) => {
          if (scannedRef.current) return
          scannedRef.current = true
          runningRef.current = false
          scanner.stop().catch(() => {})
          onScan(text)
        },
        () => {}
      )
      .then(() => {
        runningRef.current = true
      })
      .catch((err: unknown) => {
        runningRef.current = false
        const msg = err instanceof Error ? err.message : String(err)
        if (
          msg.toLowerCase().includes('permission') ||
          msg.toLowerCase().includes('notallowed')
        ) {
          setError(t('qr.cameraPermission'))
        } else if (
          msg.toLowerCase().includes('notfound') ||
          msg.toLowerCase().includes('no camera') ||
          msg.toLowerCase().includes('device')
        ) {
          setError(t('qr.cameraNotFound'))
        } else {
          setError(t('qr.cameraStartFailed'))
        }
      })

    return () => {
      if (runningRef.current) {
        runningRef.current = false
        scanner.stop().catch(() => {})
      }
    }
  }, [active, onScan, t])

  if (error) {
    return (
      <div style={{ padding: '16px 0' }}>
        <Alert
          type="error"
          showIcon
          title={error}
        />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', minHeight: 280 }}
    />
  )
}