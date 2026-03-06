'use client'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { useState, useEffect, useRef } from 'react'
import { Toast, useToast } from '@/components/ui/Toast'
import { fetchTenantSettings, saveTenantSettings } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Upload, X, ImageIcon } from 'lucide-react'

export default function PengaturanPage() {
  const [name,           setName]           = useState('')
  const [phone,          setPhone]          = useState('')
  const [addr,           setAddr]           = useState('')
  const [targetHarian,   setTargetHarian]   = useState('')
  const [targetBulanan,  setTargetBulanan]  = useState('')
  const [targetPesanan,  setTargetPesanan]  = useState('')
  const [targetCustomer, setTargetCustomer] = useState('')
  const [logoUrl,        setLogoUrl]        = useState<string | null>(null)
  const [uploading,     setUploading]     = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [loading,       setLoading]       = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast, show, hide } = useToast()

  useEffect(() => {
    async function load() {
      try {
        const info = await fetchTenantSettings()
        if (info) {
          setName(info.name)
          setPhone(info.phone)
          setAddr(info.addr)
          if (info.targetHarian)   setTargetHarian(String(info.targetHarian))
          if (info.targetBulanan)  setTargetBulanan(String(info.targetBulanan))
          if (info.targetPesanan)  setTargetPesanan(String(info.targetPesanan))
          if (info.targetCustomer) setTargetCustomer(String(info.targetCustomer))
          if (info.logoUrl)       setLogoUrl(info.logoUrl)
        }
      } catch (e) {
        console.error('gagal load pengaturan:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function resizeImage(file: File): Promise<Blob> {
    const MAX_BYTES = 500 * 1024 // 500KB

    // Load gambar ke element Image
    const bitmap = await createImageBitmap(file)
    let { width, height } = bitmap

    // Scale dimensi agar tidak lebih dari 1200px di sisi terpanjang
    const MAX_DIM = 1200
    if (width > MAX_DIM || height > MAX_DIM) {
      if (width >= height) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM }
      else                 { width  = Math.round(width  * MAX_DIM / height); height = MAX_DIM }
    }

    const canvas = document.createElement('canvas')
    canvas.width  = width
    canvas.height = height
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    // Coba compress dengan quality menurun sampai < 500KB
    // Iterasi: 0.85 → 0.70 → 0.55 → 0.40 → 0.25 → 0.10
    const qualities = [0.85, 0.70, 0.55, 0.40, 0.25, 0.10]
    for (const q of qualities) {
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/jpeg', q)
      )
      if (blob.size <= MAX_BYTES) return blob
    }

    // Kalau masih besar, scale down dimensi 50% lalu compress lagi
    const canvas2 = document.createElement('canvas')
    canvas2.width  = Math.round(width  * 0.5)
    canvas2.height = Math.round(height * 0.5)
    canvas2.getContext('2d')!.drawImage(canvas, 0, 0, canvas2.width, canvas2.height)
    return new Promise<Blob>((res, rej) =>
      canvas2.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/jpeg', 0.7)
    )
  }

  async function handleUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      // Resize & compress dulu sebelum upload
      const blob = await resizeImage(file)
      const resized = new File([blob], 'logo.jpg', { type: 'image/jpeg' })

      const supabase = createClient()
      const stored = localStorage.getItem('shoeops_user')
      const tenantId = stored ? JSON.parse(stored).tenant_id : 'local'
      const path = `${tenantId}/logo.jpg`

      const { error: upErr } = await supabase.storage
        .from('logos')
        .upload(path, resized, { upsert: true, contentType: 'image/jpeg' })

      if (upErr) throw upErr

      const { data } = supabase.storage.from('logos').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`
      setLogoUrl(url)
      show(`Logo berhasil diupload (${Math.round(resized.size / 1024)}KB)`)
    } catch (e) {
      console.error(e)
      show('Gagal upload logo')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function save() {
    setSaving(true)
    await saveTenantSettings({
      name,
      phone,
      addr,
      targetHarian:   parseInt(targetHarian)   || 0,
      targetBulanan:  parseInt(targetBulanan)  || 0,
      targetPesanan:  parseInt(targetPesanan)  || 0,
      targetCustomer: parseInt(targetCustomer) || 0,
      logoUrl: logoUrl ?? null,
    })
    setSaving(false)
    show('Pengaturan disimpan')
  }

  const inputCls = "w-full px-3.5 py-3 border-[1.5px] border-[#dddbd5] rounded-xl text-sm font-medium bg-[#f5f4f1] text-[#0d0d0d] outline-none focus:border-[#d4510c] focus:bg-white transition-all placeholder:text-[#c0bdb8]"

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-[#d4510c]" />
      </div>
    )
  }

  if (loading) return <PageSkeleton />

  return (
    <div className="p-5 space-y-5 animate-fade-up">
      <div>
        <h1 className="text-xl font-extrabold text-[#0d0d0d] tracking-tight">Pengaturan Toko</h1>
        <p className="text-xs text-[#8a8a8a] mt-0.5">Kelola informasi dan preferensi toko</p>
      </div>

      {/* Logo Toko */}
      <div className="bg-white rounded-2xl border border-[#dddbd5] p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-extrabold text-[#0d0d0d]">Logo Toko</h2>
          <p className="text-xs text-[#8a8a8a] mt-0.5">Ditampilkan di halaman cek pesanan customer. Otomatis dikompresi menjadi maks 500KB.</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Preview */}
          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-[#dddbd5] bg-[#f5f4f1] flex items-center justify-center overflow-hidden flex-shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo toko" className="w-full h-full object-contain p-1" />
            ) : (
              <ImageIcon size={24} className="text-[#c0bdb8]" />
            )}
          </div>
          <div className="space-y-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={handleUploadLogo} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 border-[1.5px] border-[#dddbd5] bg-[#f5f4f1] hover:bg-[#eceae6] text-[#525252] font-bold text-sm rounded-xl transition-all disabled:opacity-60">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? 'Mengupload...' : 'Upload Logo'}
            </button>
            {logoUrl && (
              <button onClick={() => setLogoUrl(null)}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-semibold transition-colors">
                <X size={12} /> Hapus Logo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info toko */}
      <div className="bg-white rounded-2xl border border-[#dddbd5] p-6 shadow-sm space-y-5">
        <h2 className="text-sm font-extrabold text-[#0d0d0d]">Informasi Toko</h2>
        {[
          { label: 'Nama Toko',     val: name,  set: setName,  hint: '' },
          { label: 'WhatsApp Toko', val: phone, set: setPhone, hint: 'Format: 628xxxxxxxxx (tanpa + atau spasi)' },
          { label: 'Alamat',        val: addr,  set: setAddr,  hint: '' },
        ].map(f => (
          <div key={f.label}>
            <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">{f.label}</label>
            <input value={f.val} onChange={e => f.set(e.target.value)} className={inputCls} />
            {f.hint && <p className="text-[10px] text-[#8a8a8a] mt-1">{f.hint}</p>}
          </div>
        ))}
      </div>

      {/* Target Omzet */}
      <div className="bg-white rounded-2xl border border-[#dddbd5] p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-sm font-extrabold text-[#0d0d0d]">Target Bulanan</h2>
          <p className="text-xs text-[#8a8a8a] mt-0.5">Ditampilkan sebagai progress bar di dashboard</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Target Harian (Rp)</label>
            <input value={targetHarian} onChange={e => setTargetHarian(e.target.value)} type="number"
              placeholder="Contoh: 500000" className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Target Pendapatan Bulanan (Rp)</label>
            <input value={targetBulanan} onChange={e => setTargetBulanan(e.target.value)} type="number"
              placeholder="Contoh: 10000000" className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Target Pesanan Bulanan</label>
            <input value={targetPesanan} onChange={e => setTargetPesanan(e.target.value)} type="number"
              placeholder="Contoh: 80" className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#8a8a8a] uppercase tracking-widest mb-1.5">Target Customer Bulanan</label>
            <input value={targetCustomer} onChange={e => setTargetCustomer(e.target.value)} type="number"
              placeholder="Contoh: 50" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Tombol Simpan */}
      <button onClick={save} disabled={saving}
        className="w-full py-3.5 bg-[#d4510c] hover:bg-[#b84309] disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2">
        {saving && <Loader2 size={15} className="animate-spin" />}
        {saving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}
      </button>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </div>
  )
}