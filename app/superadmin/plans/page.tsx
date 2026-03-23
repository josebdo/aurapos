"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { 
  CreditCard, 
  Users, 
  Package, 
  Building2, 
  Save,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"

const supabase = createClient()

export default function PlansPage() {
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadPlans = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("subscription_plans")
      .select("*")
      .order("price_rd", { ascending: true })
    
    if (data) setPlans(data)
    setLoading(false)
  }

  useEffect(() => {
    loadPlans()
  }, [])

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter">Planes de Suscripción</h1>
          <p className="text-slate-500 text-sm font-medium mt-1 uppercase tracking-widest text-[10px]">Configura los límites y precios del SaaS</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col hover:border-primary/50 transition-all group">
            <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <CreditCard size={24} />
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Precio Mensual</p>
                    <p className="text-xl font-black text-white">RD${plan.price_rd}</p>
                </div>
            </div>

            <h3 className="text-2xl font-black text-white mb-6 italic">{plan.name}</h3>

            <div className="space-y-4 mb-8 flex-1">
                <div className="flex items-center gap-3 text-slate-400">
                    <Users size={16} className="text-primary" />
                    <span className="text-sm font-bold">{plan.user_limit === -1 ? 'Usuarios Ilimitados' : `${plan.user_limit} Usuarios`}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                    <Package size={16} className="text-primary" />
                    <span className="text-sm font-bold">{plan.product_limit === -1 ? 'Productos Ilimitados' : `Hasta ${plan.product_limit} Productos`}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                    <Building2 size={16} className="text-primary" />
                    <span className="text-sm font-bold">{plan.branch_limit === -1 ? 'Sucursales Ilimitadas' : `Hasta ${plan.branch_limit} Sucursales`}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-sm font-bold">Soporte Premium</span>
                </div>
            </div>

            <button className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all border border-slate-700">
                Editar Configuración
            </button>
          </div>
        ))}
      </div>
      
      <div className="p-8 bg-blue-500/5 border border-blue-500/10 rounded-3xl flex gap-6 items-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0">
              <Shield size={32} />
          </div>
          <div>
              <h4 className="text-blue-400 font-bold mb-1">Control de Infraestructura</h4>
              <p className="text-slate-500 text-xs leading-relaxed max-w-2xl">
                Cualquier cambio en los límites de los planes afectará inmediatamente a todos los clientes suscritos a dicho plan. Asegúrese de que los cambios de precio solo se apliquen a nuevos ciclos de facturación.
              </p>
          </div>
      </div>
    </div>
  )
}

function Shield({ size }: { size: number }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
}
