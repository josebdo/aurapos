"use client"

import { useEffect, useState } from "react"
import { redirect, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { 
  ShieldCheck, 
  Users, 
  Settings, 
  LogOut, 
  LayoutDashboard, 
  Building2, 
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Menu,
  UserCog,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

const supabase = createClient()

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [collapsed, setCollapsed] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push("/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single()

      const allowedRoles = ["super_admin", "saas_assistant"]
      if (!allowedRoles.includes(profile?.role)) {
        router.push("/dashboard")
        return
      }

      setUser({ ...authUser, ...profile })
      setLoading(false)
    }
    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-white font-mono">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="tracking-widest uppercase text-[10px] font-black animate-pulse">Iniciando Consola de Control...</p>
        </div>
      </div>
    )
  }

  const menuItems = [
    { name: "Resumen", href: "/superadmin", icon: LayoutDashboard },
    { name: "Gestión de Negocios", href: "/superadmin/tenants", icon: Building2 },
    { name: "Planes de Suscripción", href: "/superadmin/plans", icon: CreditCard },
    { name: "Personal SaaS", href: "/superadmin/staff", icon: UserCog },
    { name: "Configuración Global", href: "/superadmin/settings", icon: Settings },
  ]

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className={cn(
        "bg-slate-900 text-slate-400 flex flex-col transition-all duration-300 relative border-r border-slate-800 shadow-2xl z-50",
        collapsed ? "w-20" : "w-64"
      )}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-10 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-lg border border-slate-800 hover:scale-110 transition-transform"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="p-6 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 flex-shrink-0">
             <ShieldCheck size={24} />
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-white font-black tracking-tighter text-xl">SaaS<span className="text-primary italic">CORE</span></h2>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 leading-none mt-1">Super Admin Panel</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 px-3 py-3 rounded-xl transition-all hover:bg-slate-800 hover:text-white"
            >
              <item.icon className="w-5 h-5 flex-shrink-0 group-hover:text-primary" />
              {!collapsed && <span className="text-sm font-semibold tracking-tight">{item.name}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-primary font-bold">
              {user.full_name?.charAt(0) || 'S'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{user.full_name}</p>
                <p className="text-[10px] uppercase font-black text-primary opacity-70">
                  {user.role === 'super_admin' ? 'Super Admin' : 'Asistente SaaS'}
                </p>
              </div>
            )}
          </div>
          <button 
            onClick={async () => {
              await supabase.auth.signOut()
              router.push("/login")
            }}
            className={cn(
              "mt-4 flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 transition-colors w-full px-2",
              collapsed && "justify-center"
            )}
          >
            <LogOut size={16} />
            {!collapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950">
          <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
              <div className="flex items-center gap-4 text-slate-400">
                 <Menu size={18} className="md:hidden" />
                 <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Consola Central / Sistema Operativo SaaS</h3>
              </div>
              <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 shadow-sm shadow-emerald-500/5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-tight">System Online</span>
                  </div>
              </div>
          </header>
          
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {children}
          </div>
      </main>
    </div>
  )
}
