"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { 
  Building2, 
  Users, 
  TrendingUp, 
  Activity,
  ArrowUpRight,
  Plus,
} from "lucide-react"

const supabase = createClient()

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    totalTenants: 0,
    totalUsers: 0,
    activeTenants: 0,
    trialTenants: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      const [tenantsRes, usersRes] = await Promise.all([
        supabase.from("tenants").select("*"),
        supabase.from("profiles").select("*"),
      ])

      const tenants = tenantsRes.data || []
      const users = usersRes.data || []

      setStats({
        totalTenants: tenants.length,
        totalUsers: users.length,
        activeTenants: tenants.filter(t => t.status === 'active').length,
        trialTenants: tenants.filter(t => t.status === 'trial').length,
      })
      setLoading(false)
    }
    loadStats()
  }, [])

  if (loading) return null

  const cards = [
    { title: "Empresas Totales", value: stats.totalTenants, icon: Building2, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Usuarios Totales", value: stats.totalUsers, icon: Users, color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: "Suscripciones Activas", value: stats.activeTenants, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "En Prueba (Trial)", value: stats.trialTenants, icon: Activity, color: "text-amber-500", bg: "bg-amber-500/10" },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter">Panel de Gestión SaaS</h1>
          <p className="text-slate-500 text-sm font-medium mt-1 uppercase tracking-widest text-[10px]">Visión general del ecosistema aura<span className="text-primary italic">pos</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl hover:border-slate-700 hover:scale-[1.02] transition-all cursor-default">
            <div className="flex items-center justify-between mb-4">
              <div className={`${card.bg} ${card.color} p-3 rounded-xl`}>
                <card.icon size={24} />
              </div>
              <div className="text-[10px] font-black uppercase text-slate-500 bg-slate-800 px-2 py-1 rounded-md flex items-center gap-1">
                 Total <ArrowUpRight size={10} />
              </div>
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 opacity-70">{card.title}</p>
            <h2 className="text-4xl font-black text-white">{card.value}</h2>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-8 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <Building2 size={120} className="text-primary" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Administración de Clientes</h3>
            <p className="text-slate-400 text-sm max-w-md leading-relaxed mb-6">Gestiona las empresas registradas, ajusta sus planes de suscripción y monitorea el uso de recursos para cada cliente.</p>
            <button className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2">
                Ver Todos los Negocios
                <ArrowUpRight size={18} />
            </button>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Planes Activos</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">Configura los límites y precios de los planes Básico, Estándar y Premium.</p>
            </div>
            <div className="space-y-3">
               <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <span className="text-xs font-bold text-white uppercase tracking-tight">Básico (RD$600)</span>
                  <span className="text-primary font-black">24 activos</span>
               </div>
               <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <span className="text-xs font-bold text-white uppercase tracking-tight">Estándar (RD$1,400)</span>
                  <span className="text-emerald-500 font-black">12 activos</span>
               </div>
               <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <span className="text-xs font-bold text-white uppercase tracking-tight">Premium (RD$2,800)</span>
                  <span className="text-amber-500 font-black">5 activos</span>
               </div>
            </div>
        </div>
      </div>
    </div>
  )
}
