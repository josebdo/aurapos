"use client"

import Link from "next/link"
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  Users,
  ShoppingBag,
} from "lucide-react"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { useExchangeRate } from "@/lib/hooks/use-exchange-rate"

const supabase = createClient()

const fetchDashboardStats = async () => {
  const today = new Date().toISOString().split("T")[0]
  
  const [
    { count: totalProducts },
    { count: lowStockProducts },
    { data: todaySales },
    { count: totalSuppliers },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("products").select("*", { count: "exact", head: true }).lt("stock", 10).eq("is_active", true),
    supabase.from("sales").select("total").gte("created_at", today).eq("status", "completada"),
    supabase.from("suppliers").select("*", { count: "exact", head: true }).eq("is_active", true),
  ])

  const todayTotal = todaySales?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0

  return {
    totalProducts: totalProducts || 0,
    lowStockProducts: lowStockProducts || 0,
    todaySales: todaySales?.length || 0,
    todayTotal,
    totalSuppliers: totalSuppliers || 0,
  }
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useSWR("dashboard-stats", fetchDashboardStats)
  const { rate, formatUsd, formatDop, usdToDop } = useExchangeRate()

  const quickActions = [
    { name: "Nueva Venta", href: "/dashboard/pos", icon: ShoppingCart, color: "from-cyan-500 to-cyan-600" },
    { name: "Agregar Producto", href: "/dashboard/productos", icon: Package, color: "from-emerald-500 to-emerald-600" },
    { name: "Ver Inventario", href: "/dashboard/inventario", icon: Boxes, color: "from-amber-500 to-amber-600" },
    { name: "Nueva Compra", href: "/dashboard/compras", icon: ShoppingBag, color: "from-purple-500 to-purple-600" },
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <LayoutDashboard className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inicio</h1>
          <p className="text-sm text-muted-foreground">Bienvenido a aurapos</p>
        </div>
      </div>

      {/* Exchange Rate Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8" />
            <div>
              <p className="text-sm opacity-80">Tasa de Cambio Actual</p>
              <p className="text-2xl font-bold">1 USD = RD$ {rate.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          <Link 
            href="/dashboard/tasa"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
          >
            Actualizar
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-cyan-500" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">Ventas Hoy</p>
          <p className="text-2xl font-bold">{isLoading ? "..." : stats?.todaySales}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "..." : formatUsd(stats?.todayTotal || 0)}
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">Ingresos Hoy</p>
          <p className="text-2xl font-bold">{isLoading ? "..." : formatUsd(stats?.todayTotal || 0)}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "..." : formatDop(usdToDop(stats?.todayTotal || 0))}
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Total Productos</p>
          <p className="text-2xl font-bold">{isLoading ? "..." : stats?.totalProducts}</p>
          <p className="text-sm text-muted-foreground mt-1">productos activos</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-1">Stock Bajo</p>
          <p className="text-2xl font-bold text-amber-500">{isLoading ? "..." : stats?.lowStockProducts}</p>
          <p className="text-sm text-muted-foreground mt-1">productos por reabastecer</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.name}
                href={action.href}
                className={`bg-gradient-to-r ${action.color} rounded-xl p-4 text-white hover:opacity-90 transition-opacity`}
              >
                <Icon className="w-8 h-8 mb-3" />
                <p className="font-medium">{action.name}</p>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold">Proveedores</h3>
              <p className="text-sm text-muted-foreground">Total registrados</p>
            </div>
          </div>
          <p className="text-3xl font-bold">{isLoading ? "..." : stats?.totalSuppliers}</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Boxes className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="font-semibold">Inventario</h3>
              <p className="text-sm text-muted-foreground">Estado general</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${100 - ((stats?.lowStockProducts || 0) / (stats?.totalProducts || 1) * 100)}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {isLoading ? "..." : `${Math.round(100 - ((stats?.lowStockProducts || 0) / (stats?.totalProducts || 1) * 100))}%`}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
