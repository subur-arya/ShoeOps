'use client'
import { useEffect } from 'react'
import { formatRupiah, formatDate } from '@/lib/utils'
import type { OrderWithDetails } from '@/types'

interface ReceiptProps {
  order: OrderWithDetails
  storeName?: string
  storePhone?: string
  storeAddr?: string
  storeToken?: string
  logoUrl?: string | null
}

export function ReceiptPrint({ order, storeName, storePhone, storeAddr, storeToken, logoUrl }: ReceiptProps) {
  const items    = order.order_items ?? []
  const baseUrl  = typeof window !== 'undefined' ? window.location.origin : ''
  const subtotal = items.length > 0
    ? items.reduce((s, i) => s + (Number(i.price) * Number(i.quantity || 1)), 0)
    : order.total_price
  const discount    = subtotal > order.total_price ? subtotal - order.total_price : 0
  const amountPaid  = order.amount_paid ?? order.total_price
  const change      = order.payment_method === 'cash' && amountPaid > order.total_price
    ? amountPaid - order.total_price : 0
  const payLabel    = order.payment_method === 'cash' ? 'Cash'
    : order.payment_method === 'transfer' ? 'Transfer Bank'
    : order.payment_method === 'qris' ? 'QRIS' : '-'
  const printTime   = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
  const cekUrl      = `${baseUrl}/cek-pesanan?kode=${order.order_code}`

  useEffect(() => {
    const generateQR = async () => {
      try {
        const QRCode = (await import('qrcode')).default
        const dataUrl = await QRCode.toDataURL(cekUrl, { width: 80, margin: 1 })
        const canvas = document.getElementById('receipt-qrcode') as HTMLCanvasElement
        if (!canvas) return
        // Render base64 ke canvas
        const img = new Image()
        img.onload = () => {
          const ctx = canvas.getContext('2d')
          canvas.width = 80
          canvas.height = 80
          ctx?.drawImage(img, 0, 0, 80, 80)
        }
        img.src = dataUrl
      } catch (e) {
        console.warn('QR gagal:', e)
      }
    }
    generateQR()
  }, [cekUrl])

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #receipt-print-root,
          #receipt-print-root * { visibility: visible !important; }
          #receipt-print-root {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 80mm !important;
            display: block !important;
          }
          @page { size: 80mm auto; margin: 4mm 3mm; }
        }
        @media screen {
          #receipt-print-root { display: none; }
        }
      `}</style>

      <div id="receipt-print-root">
        <div style={{ fontFamily: 'Courier New, Courier, monospace', fontSize: '12px', width: '100%', color: '#000', lineHeight: '1.6' }}>

          {/* HEADER */}
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            {logoUrl && (
              <img src={logoUrl} alt="logo" style={{ width: '48px', height: '48px', objectFit: 'contain', display: 'block', margin: '0 auto 6px' }} />
            )}
            <div style={{ fontSize: '15px', fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase' }}>
              {storeName || 'SHOEOPS'}
            </div>
            {storeToken && <div style={{ fontSize: '10px', letterSpacing: '1px' }}>{storeToken}</div>}
            {storeAddr  && <div style={{ fontSize: '10px', marginTop: '2px' }}>{storeAddr}</div>}
            {storePhone && <div style={{ fontSize: '10px' }}>WA: {storePhone}</div>}
          </div>

          <Hr />
          <div style={{ textAlign: 'center', fontSize: '10px' }}>Dicetak: {printTime}</div>
          <Hr />

          {/* NO PESANAN */}
          <Row l="No. Pesanan"  r={order.order_code} bold />
          <Row l="Tgl Masuk"    r={formatDate(order.created_at)} />
          {order.estimated_done_at && <Row l="Est. Selesai" r={formatDate(order.estimated_done_at)} />}

          <Hr />

          {/* CUSTOMER */}
          <Row l="Customer" r={order.customers?.name ?? '-'} bold />
          {order.customers?.phone && <Row l="No. HP" r={order.customers.phone} />}

          <Hr />

          {/* DETAIL SEPATU — hanya untuk pesanan lama tanpa format baru */}
          {(order.shoe_brand || order.shoe_type || order.shoe_color) && !items.some(i => i.treatment_name.includes('||')) && (
            <>
              <div style={{ fontWeight: 700, marginBottom: '3px' }}>DETAIL SEPATU:</div>
              {order.shoe_brand && <Row l="  Merek" r={order.shoe_brand} />}
              {order.shoe_type  && <Row l="  Jenis" r={order.shoe_type} />}
              {order.shoe_color && <Row l="  Warna" r={order.shoe_color} />}
              <Hr />
            </>
          )}

          {/* ITEM */}
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>TREATMENT:</div>
          {items.length > 0 ? items.map((item, i) => {
            const [treatName, shoeInfo] = item.treatment_name.split('||')
            return (
              <div key={i} style={{ marginBottom: '8px' }}>
                <div style={{ fontWeight: 600 }}>{treatName}</div>
                {shoeInfo && (
                  <div style={{ fontSize: '10px', color: '#666', paddingLeft: '8px', marginBottom: '2px' }}>
                    {shoeInfo}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px', fontSize: '11px' }}>
                  <span>{item.quantity || 1}x @ {formatRupiah(Number(item.price))}</span>
                  <span>{formatRupiah(Number(item.price) * Number(item.quantity || 1))}</span>
                </div>
              </div>
            )
          }) : (
            <div style={{ paddingLeft: '8px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>1x treatment</span>
              <span>{formatRupiah(order.total_price)}</span>
            </div>
          )}

          <Hr dashed />

          {discount > 0 && (
            <>
              <Row l="Subtotal" r={formatRupiah(subtotal)} />
              <Row l="Diskon"   r={`- ${formatRupiah(discount)}`} />
            </>
          )}

          {order.notes && (
            <>
              <Hr dashed />
              <div style={{ fontSize: '11px' }}><strong>Catatan:</strong> {order.notes}</div>
            </>
          )}

          <Hr />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '14px' }}>
            <span>TOTAL</span>
            <span>{formatRupiah(order.total_price)}</span>
          </div>
          <Hr />

          {/* PEMBAYARAN */}
          <div style={{ fontWeight: 700, marginBottom: '3px' }}>PEMBAYARAN:</div>
          <Row l="  Metode" r={payLabel} />
          {order.payment_method === 'cash' && (
            <>
              <Row l="  Dibayar"   r={formatRupiah(amountPaid)} />
              <Row l="  Kembalian" r={formatRupiah(change)} bold />
            </>
          )}

          <Hr />

          {/* STATUS */}
          <Row l="Status" r={
            order.status === 'diterima' ? 'Diterima' :
            order.status === 'diproses' ? 'Sedang Diproses' :
            order.status === 'selesai'  ? 'Selesai' : 'Sedang Diantar'
          } />

          <Hr />

          {/* FOOTER */}
          <Hr />
          <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '6px', lineHeight: '1.8' }}>
            <div>Terima kasih telah mempercayakan</div>
            <div>perawatan sepatu Anda kepada kami!</div>
            <div style={{ marginTop: '6px', fontSize: '9px', marginBottom: '2px' }}>Scan untuk cek status pesanan:</div>
            <canvas id="receipt-qrcode" style={{ display: 'block', margin: '0 auto' }}></canvas>
            <div style={{ fontSize: '9px', marginTop: '2px' }}>{order.order_code}</div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '10px', letterSpacing: '3px' }}>
            - - - - - - - - - - - - - -
          </div>

        </div>
      </div>
    </>
  )
}

function Hr({ dashed }: { dashed?: boolean }) {
  return <div style={{ borderTop: dashed ? '1px dashed #000' : '1px solid #000', margin: '5px 0' }} />
}

function Row({ l, r, bold }: { l: string; r: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontWeight: bold ? 700 : 400, marginBottom: '1px' }}>
      <span style={{ flexShrink: 0 }}>{l}</span>
      <span style={{ textAlign: 'right' }}>{r}</span>
    </div>
  )
}