"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Boxes,
  CreditCard,
  Users,
  ShoppingBag,
  Wallet,
  Layers,
  BarChart3,
  Database,
  DollarSign,
  UserCog,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  Building2,
  Search,
  X,
} from "lucide-react"
import { useState } from "react"

interface SidebarProps {
  user: {
    username: string
    role: string
    plan?: string
    planData?: any
    tenant?: any
  }
}

const menuItems = [
  { 
    section: "PRINCIPAL",
    items: [
      { name: "Inicio", href: "/dashboard", icon: LayoutDashboard },
      { name: "Punto de Venta", href: "/dashboard/pos", icon: ShoppingCart },
    ]
  },
  {
    section: "GESTION",
    items: [
      { name: "Productos", href: "/dashboard/productos", icon: Package },
      { name: "Ventas", href: "/dashboard/ventas", icon: Receipt },
      { name: "Inventario", href: "/dashboard/inventario", icon: Boxes },
      { name: "Clientes", href: "/dashboard/clientes", icon: Users },
      { name: "Créditos", href: "/dashboard/creditos", icon: CreditCard },
    ]
  },
  {
    section: "PROVEEDORES",
    items: [
      { name: "Proveedores", href: "/dashboard/proveedores", icon: Users, roles: ["super_admin", "admin"] },
      { name: "Compras", href: "/dashboard/compras", icon: ShoppingBag, roles: ["super_admin", "admin"] },
      { name: "Pagos Proveedores", href: "/dashboard/pagos", icon: Wallet, roles: ["super_admin", "admin"] },
      { name: "Lotes", href: "/dashboard/lotes", icon: Layers, roles: ["super_admin", "admin"] },
    ]
  },
  {
    section: "SISTEMA",
    items: [
      { name: "Reportes", href: "/dashboard/reportes", icon: BarChart3, roles: ["super_admin", "admin"] },
      { name: "Backups", href: "/dashboard/backups", icon: Database, roles: ["super_admin", "admin"] },
    ]
  },
  {
    section: "CONFIGURACION",
    items: [
      { name: "Mi Empresa", href: "/dashboard/empresa", icon: LayoutDashboard, roles: ["super_admin", "admin"] },
      { name: "Comprobantes NCF", href: "/dashboard/ncf", icon: Receipt, roles: ["super_admin", "admin"] },
      { name: "Tasa de Cambio", href: "/dashboard/tasa", icon: DollarSign, roles: ["super_admin", "admin"] },
      { name: "Usuarios", href: "/dashboard/usuarios", icon: UserCog, roles: ["super_admin", "admin"] },
    ]
  },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)
  const [showSwitchModal, setShowSwitchModal] = useState(false)
  const [tenants, setTenants] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loadingTenants, setLoadingTenants] = useState(false)

  const loadTenants = async () => {
    setLoadingTenants(true)
    const { data } = await supabase.from("tenants").select("id, name")
    if (data) setTenants(data)
    setLoadingTenants(false)
  }

  const handleImpersonate = async (tenantId: string) => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    const { error } = await supabase
      .from("profiles")
      .update({ tenant_id: tenantId })
      .eq("id", authUser.id)

    if (error) {
      console.error("Error switching view:", error)
    } else {
      setShowSwitchModal(false)
      router.push("/dashboard")
      router.refresh()
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const handleReturnToSuperAdmin = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    const { error } = await supabase
      .from("profiles")
      .update({ tenant_id: null })
      .eq("id", authUser.id)

    if (error) {
      console.error("Error returning to super admin:", error)
    } else {
      router.push("/superadmin")
      router.refresh()
    }
  }

  return (
    <aside 
      className={cn(
        "h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 relative",
        collapsed ? "w-[70px]" : "w-[220px]"
      )}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 z-50 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* Header */}
      <div className={cn(
        "p-4 border-b border-sidebar-border",
        collapsed && "px-2"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden",
            collapsed && "mx-auto"
          )}>
            <img src="/aura-pos.png" alt="aura-pos logo" className="w-8 h-8 object-contain" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight">
                aura<span className="text-primary font-black">pos</span>
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <p className="text-[10px] text-sidebar-muted font-bold uppercase tracking-widest leading-none opacity-70">Soft & Gest</p>
                {user.tenant && (user.role === 'super_admin' || user.role === 'saas_assistant') && (
                  <span className="text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter animate-pulse">
                    Modo Soporte
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {(user.role === "super_admin" || user.role === "saas_assistant") && (
        <div className="px-2 pt-4 pb-2">
          <button
            onClick={handleReturnToSuperAdmin}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all",
              collapsed && "justify-center px-0"
            )}
          >
            <Shield className="w-4 h-4" />
            {!collapsed && <span>Panel Control</span>}
          </button>
        </div>
      )}

      {(user.role === "super_admin" || user.role === "saas_assistant") && (
        <div className="px-2 pb-4">
          <button
            onClick={() => { setShowSwitchModal(true); loadTenants(); }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-sidebar-border text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all",
              collapsed && "justify-center px-0"
            )}
          >
            <Building2 className="w-4 h-4" />
            {!collapsed && <span className="text-xs font-bold">Cambiar de Vista</span>}
          </button>
        </div>
      )}

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-2">
        {menuItems.map((group) => {
          // Filter items within the group
          const visibleItems = group.items.filter(item => {
            // @ts-ignore - added roles property
            if (!item.roles) return true
            // @ts-ignore - added roles property
            return item.roles.includes(user.role)
          })

          if (visibleItems.length === 0) return null

          return (
            <div key={group.section} className="mb-2">
              {!collapsed && (
                <p className="px-4 py-2 text-[10px] font-semibold text-sidebar-muted tracking-wider">
                  {group.section}
                </p>
              )}
              {visibleItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                      collapsed && "justify-center px-2"
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary")} />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* User */}
      <div className={cn(
        "p-4 border-t border-sidebar-border",
        collapsed && "px-2"
      )}>
        <div className={cn(
          "flex items-center gap-3 mb-3",
          collapsed && "justify-center"
        )}>
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-primary-foreground">
              {user.username.charAt(0).toUpperCase()}
            </span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-medium text-sm truncate">{user.username}</p>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] text-sidebar-muted capitalize font-bold">{user.role}</p>
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tight",
                  user.plan === 'Premium' ? 'bg-amber-500 text-black' :
                  user.plan === 'Estándar' ? 'bg-primary text-primary-foreground' :
                  user.plan === 'Founder' ? 'bg-purple-500 text-white' :
                  'bg-sidebar-muted/20 text-sidebar-muted'
                )}>
                  {user.plan || 'Básico'}
                </span>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors w-full",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>

      {/* Quick Switch Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 text-foreground">
            <div className="bg-card border border-border rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <h3 className="font-bold">Seleccionar Negocio</h3>
                    <button onClick={() => setShowSwitchModal(false)} className="text-muted-foreground hover:text-foreground">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input 
                            type="text" 
                            autoFocus
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar empresa..." 
                            className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
                        {loadingTenants ? (
                            <div className="py-8 text-center text-xs text-muted-foreground animate-pulse font-bold uppercase tracking-widest">Consultando central...</div>
                        ) : tenants.length === 0 ? (
                            <div className="py-8 text-center text-xs text-muted-foreground">No se encontraron negocios</div>
                        ) : (
                            tenants
                              .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                              .map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => handleImpersonate(t.id)}
                                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-primary/10 hover:text-primary transition-all text-left"
                                >
                                    <Building2 size={16} />
                                    <span className="text-sm font-bold">{t.name}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}
    </aside>
  )
}
