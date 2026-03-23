"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { 
  Building2, 
  Save, 
  RefreshCw,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText,
  AlertCircle
} from "lucide-react"

const supabase = createClient()

export default function EmpresaPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState({
    id: "",
    name: "",
    rnc: "",
    phone: "",
    email: "",
    address: "",
    website: "",
    logo_url: "",
    receipt_footer: "",
    base_currency: "DOP"
  })
  const [errorol, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("business_profile")
          .select("*")
          .single()
        
        if (error && error.code !== 'PGRST116') throw error // PGRST116 is empty record, ignore

        if (data) {
          // Ensure no null values are set in state to avoid React warnings on inputs
          const sanitizedData = {
            ...profile, // Default values
            ...data,
            name: data.name || "",
            rnc: data.rnc || "",
            phone: data.phone || "",
            email: data.email || "",
            address: data.address || "",
            website: data.website || "",
            logo_url: data.logo_url || "",
            receipt_footer: data.receipt_footer || "",
            base_currency: data.base_currency || "DOP"
          }
          setProfile(sanitizedData)
        }
      } catch (err: any) {
        console.error("Error loading profile:", err)
        setError("Error de conexión con el servidor. Verifique su conexión a internet.")
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      let res
      if (profile.id) {
        res = await supabase
          .from("business_profile")
          .update({
            name: profile.name,
            rnc: profile.rnc,
            phone: profile.phone,
            email: profile.email,
            address: profile.address,
            website: profile.website,
            logo_url: profile.logo_url,
            receipt_footer: profile.receipt_footer,
            base_currency: profile.base_currency,
            updated_at: new Date()
          })
          .eq("id", profile.id)
      } else {
        res = await supabase
          .from("business_profile")
          .insert([profile])
      }

      if (res.error) throw res.error
      alert("Configuración de empresa guardada correctamente")
    } catch (error) {
      console.error("Error saving profile:", error)
      alert("Error al guardar la configuración")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight">Mi Empresa</h1>
          <p className="text-sm text-muted-foreground">Configura los datos que aparecerán en tus tickets y reportes</p>
        </div>
      </div>

      {errorol && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{errorol}</p>
          <button 
            onClick={() => window.location.reload()}
            className="ml-auto px-4 py-1 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* General Info */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-primary" />
              Datos Generales
            </h2>
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Nombre del Negocio *</label>
              <input
                type="text"
                required
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="Ej: Colmado La Esperanza"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">RNC / Identificación</label>
              <input
                type="text"
                value={profile.rnc}
                onChange={(e) => setProfile({ ...profile, rnc: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="Ej: 131-45678-9"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
              <Phone className="w-5 h-5 text-primary" />
              Contacto
            </h2>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Teléfono</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Ej: 809-555-0123"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="ejemplo@correo.com"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Location & Ticket Footer */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-primary" />
            Ubicación y Ticket
          </h2>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">Dirección</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <textarea
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none min-h-[80px]"
                placeholder="Dirección física completa..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">Pie de Recibo (Mensaje Final)</label>
            <textarea
              value={profile.receipt_footer}
              onChange={(e) => setProfile({ ...profile, receipt_footer: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none min-h-[60px]"
              placeholder="Ej: No se aceptan devoluciones después de 24 horas."
            />
          </div>
        </div>

        {/* Digital Presence */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
            <Globe className="w-5 h-5 text-primary" />
            Presencia Digital
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Sitio Web</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={profile.website}
                  onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="www.mipositiva.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">URL del Logo</label>
              <input
                type="text"
                value={profile.logo_url}
                onChange={(e) => setProfile({ ...profile, logo_url: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Moneda Principal del Sistema</label>
              <select
                value={profile.base_currency}
                onChange={(e) => setProfile({ ...profile, base_currency: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="DOP">Peso Dominicano (RD$)</option>
                <option value="USD">Dólar Estadounidense ($)</option>
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Esta moneda se usará como base para precios de productos y reportes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
          <div className="flex items-center gap-3 text-primary">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">Estos datos se guardarán localmente para la generación de tickets.</p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  )
}
