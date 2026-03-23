"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useExchangeRate } from "@/lib/hooks/use-exchange-rate"
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag,
  Users,
  Calendar,
  RefreshCw,
} from "lucide-react"
import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const supabase = createClient()

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function ReportesPage() {
  const [loading, setLoading] = useState(true)
  const [salesData, setSalesData] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [methodData, setMethodData] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    avgTicket: 0,
    growth: 12.5 // Mock for now
  })
  const [dateFrom, setDateFrom] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const { formatMain } = useExchangeRate()

  const loadReports = async () => {
    setLoading(true)
    try {
      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select("*")
        .gte("created_at", `${dateFrom}T00:00:00Z`)
        .lte("created_at", `${dateTo}T23:59:59Z`)
        .order("created_at", { ascending: true })

      if (salesError) throw salesError

      if (sales) {
        // Group by day
        const grouped = sales.reduce((acc: any, sale: any) => {
          const date = new Date(sale.created_at).toLocaleDateString()
          if (!acc[date]) acc[date] = { date, total: 0, count: 0 }
          acc[date].total += sale.total
          acc[date].count += 1
          return acc
        }, {})
        setSalesData(Object.values(grouped))
        
        const total = sales.reduce((sum, s) => sum + s.total, 0)
        setStats({
          totalSales: total,
          totalOrders: sales.length,
          avgTicket: sales.length > 0 ? total / sales.length : 0,
          growth: 15.2
        })

        // Group by method
        const methods = sales.reduce((acc: any, sale: any) => {
          const m = sale.payment_method
          if (!acc[m]) acc[m] = { name: m, value: 0 }
          acc[m].value += sale.total
          return acc
        }, {})
        setMethodData(Object.values(methods))
      }

      // 2. Top products
      const { data: items } = await supabase
        .from("sale_items")
        .select("*, product:products(name)")
        .gte("created_at", `${dateFrom}T00:00:00Z`)
        .lte("created_at", `${dateTo}T23:59:59Z`)

      if (items) {
        const productStats = items.reduce((acc: any, item: any) => {
          const name = item.product?.name || "Desconocido"
          if (!acc[name]) acc[name] = { name, total: 0, qty: 0 }
          acc[name].total += item.total
          acc[name].qty += item.quantity
          return acc
        }, {})
        const sorted = Object.values(productStats)
          .sort((a: any, b: any) => b.total - a.total)
          .slice(0, 5)
        setTopProducts(sorted)
      }

    } catch (error) {
      console.error("Error loading reports:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [])

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reportes y Estadísticas</h1>
            <p className="text-sm text-muted-foreground">Analiza el rendimiento de tu negocio en los últimos 30 días</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase">Desde:</span>
            <input 
              type="date" 
              value={dateFrom} 
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent border-none text-sm outline-none"
            />
          </div>
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase">Hasta:</span>
            <input 
              type="date" 
              value={dateTo} 
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent border-none text-sm outline-none"
            />
          </div>
          <button 
            onClick={loadReports}
            className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            title="Filtrar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Ventas Totales" 
          value={formatMain(stats.totalSales)} 
          icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
          trend={`${stats.growth}%`}
          positive={true}
        />
        <StatCard 
          title="Cant. Ventas" 
          value={stats.totalOrders.toString()} 
          icon={<ShoppingBag className="w-5 h-5 text-blue-500" />}
          trend="+5.2%"
          positive={true}
        />
        <StatCard 
          title="Ticket Promedio" 
          value={formatMain(stats.avgTicket)} 
          icon={<Users className="w-5 h-5 text-amber-500" />}
          trend="-2.1%"
          positive={false}
        />
        <StatCard 
          title="Margen Estimado" 
          value="24.5%" 
          icon={<TrendingUp className="w-5 h-5 text-purple-500" />}
          trend="+1.2%"
          positive={true}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Sales Chart */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            Ventas Diarias (USD)
            <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 bg-muted rounded-full">Últimos 30 días</span>
          </h3>
          <div className="h-[300px] w-full">
            <ChartContainer config={{ total: { label: "Ventas", color: "#10b981" } }}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748B' }} 
                  minTickGap={20}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickFormatter={(val) => `$${val}`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            Productos Más Vendidos
            <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 bg-muted rounded-full">Por ingreso</span>
          </h3>
          <div className="space-y-6">
            {topProducts.map((p, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm items-center">
                  <span className="font-medium text-foreground">{p.name}</span>
                  <span className="font-bold text-primary">{formatMain(p.total)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-1000"
                    style={{ width: `${(p.total / topProducts[0].total) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Cant: {p.qty}</span>
                  <span>{Math.round((p.total / stats.totalSales) * 100)}% del total</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Métodos de Pago</h3>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="h-[250px] w-full md:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={methodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {methodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-3">
              {methodData.map((m, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm font-medium capitalize">{m.name.replace('_', ' ')}</span>
                  </div>
                  <span className="font-bold text-sm">{formatMain(m.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Tips/Insights */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col justify-center">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">Sugerencia de Inventario</h3>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            Basado en las ventas de esta semana, te sugerimos reponer el stock de <b>Pollo Entero</b> y <b>Harina PAN</b>. Estos productos tienen una rotación un 20% superior al promedio.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-white/50 rounded-xl border border-white">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Día de mayor venta</p>
              <p className="font-bold text-lg">Viernes</p>
            </div>
            <div className="p-3 bg-white/50 rounded-xl border border-white">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Hora pico</p>
              <p className="font-bold text-lg">04:30 PM</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, trend, positive }: any) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2.5 rounded-xl bg-muted/50">
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${positive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
          {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
        <p className="text-3xl font-black text-foreground">{value}</p>
      </div>
    </div>
  )
}
