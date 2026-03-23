"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { 
  Settings, 
  Save, 
  RefreshCw,
  Mail,
  ShieldAlert,
  Clock,
  Globe,
} from "lucide-react"
import { toast } from "sonner"

const supabase = createClient()

export default function SaaSSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    id: "",
    saas_name: "aura-pos",
    support_email: "soporte@aurapos.local",
    trial_days: 15,
    maintenance_mode: false,
    default_plan_id: "",
    system_version: "1.2.0",
  })

  // Load settings (simulated or from a 'saas_config' table)
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true)
      // For now we simulate or use a mock since the table might not exist
      // In a real scenario: const { data } = await supabase.from('saas_config').select('*').single()
      setTimeout(() => {
        setLoading(false)
      }, 500)
    }
    loadSettings()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    // Simulate save
    setTimeout(() => {
      setSaving(false)
      toast.success("Configuración global actualizada")
    }, 1000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">
         Sincronizando con el servidor central...
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tighter">Configuración SaaS</h1>
        <p className="text-slate-500 text-sm font-medium mt-1 uppercase tracking-widest text-[10px]">Parámetros globales del ecosistema operativo</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Identidad */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Globe className="text-primary" size={20} />
                  Identidad del Sistema
              </h3>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Nombre Comercial SaaS</label>
                <input 
                  type="text" 
                  value={settings.saas_name}
                  onChange={(e) => setSettings({...settings, saas_name: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Email de Soporte Técnico</label>
                <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="email" 
                      value={settings.support_email}
                      onChange={(e) => setSettings({...settings, support_email: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none"
                    />
                </div>
              </div>
          </div>

          {/* Políticas de Prueba */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="text-amber-500" size={20} />
                  Periodos y Versión
              </h3>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Días de Prueba (Trial)</label>
                <input 
                  type="number" 
                  value={settings.trial_days}
                  onChange={(e) => setSettings({...settings, trial_days: parseInt(e.target.value)})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500/50 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Versión del Core Operativo</label>
                <input 
                  type="text" 
                  readOnly
                  value={settings.system_version}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed font-mono italic"
                />
              </div>
          </div>
        </div>

        {/* Estado Crítico */}
        <div className="bg-red-500/5 border border-red-500/10 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex gap-6 items-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 flex-shrink-0">
                    <ShieldAlert size={32} />
                </div>
                <div>
                    <h4 className="text-red-400 font-bold mb-1">Modo Mantenimiento Progresivo</h4>
                    <p className="text-slate-500 text-[10px] font-medium leading-relaxed max-w-md uppercase tracking-wide">
                      Al activar este modo, solo los Super Admins podrán acceder a la plataforma. Los clientes verán un mensaje de mantenimiento.
                    </p>
                </div>
            </div>
            <button 
                type="button"
                onClick={() => setSettings({...settings, maintenance_mode: !settings.maintenance_mode})}
                className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all border ${
                    settings.maintenance_mode 
                    ? "bg-red-500 text-white border-red-400" 
                    : "bg-slate-900 text-red-500 border-red-500/20 hover:bg-red-500/5"
                }`}
            >
                {settings.maintenance_mode ? "Mantenimiento ON" : "Activar Mantenimiento"}
            </button>
        </div>

        <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-10 py-4 bg-primary text-white font-black rounded-2xl shadow-2xl shadow-primary/40 hover:scale-105 transition-all text-[11px] uppercase tracking-[0.3em] flex items-center gap-3 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar Configuración Central
            </button>
        </div>
      </form>
    </div>
  )
}
