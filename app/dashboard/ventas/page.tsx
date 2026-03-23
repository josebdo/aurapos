"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useExchangeRate } from "@/lib/hooks/use-exchange-rate"
import type { Sale, SaleItem } from "@/lib/types"
import { 
  Receipt, 
  Search, 
  RefreshCw, 
  Eye, 
  X,
  Calendar,
  Filter,
  FileText,
} from "lucide-react"

const supabase = createClient()

export default function VentasPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [dateFilter, setDateFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("todos")
  const { formatMain, formatSecondary, formatDop } = useExchangeRate()


  // Load sales
  const loadSales = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("sales")
      .select("*, client:clients(*)")
      .order("created_at", { ascending: false })
    
    if (data) setSales(data)
    if (error) console.error("Error loading sales:", error)
    setLoading(false)
  }

  useEffect(() => {
    loadSales()
  }, [])

  // Load sale details
  const viewDetails = async (sale: Sale) => {
    setSelectedSale(sale)
    setShowModal(true)
    const { data } = await supabase
      .from("sale_items")
      .select("*, product:products(*)")
      .eq("sale_id", sale.id)
    if (data) setSaleItems(data)
  }

  // Print sale (mock for now, but could use window.print())
  const printSale = (sale: Sale) => {
    alert(`Imprimiendo factura ${sale.number}...`)
    // In a real app, this would generate a PDF or open a print window
  }

  // Cancel sale
  const cancelSale = async (sale: Sale) => {
    if (!confirm(`¿Estás seguro de que deseas anular la venta ${sale.number}? Esta acción no se puede deshacer.`)) return

    const { error } = await supabase
      .from("sales")
      .update({ status: 'cancelada' })
      .eq("id", sale.id)
    
    if (error) {
      alert("Error al anular la venta")
    } else {
      loadSales()
    }
  }

  // Filter sales
  const filteredSales = sales.filter(s => {
    const matchesSearch = !searchQuery || 
      s.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.client?.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "todos" || s.status === statusFilter
    
    const matchesDate = !dateFilter || new Date(s.created_at).toLocaleDateString() === new Date(dateFilter).toLocaleDateString()

    return matchesSearch && matchesStatus && matchesDate
  })

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Historial de Ventas</h1>
            <p className="text-sm text-muted-foreground">Consulta y gestiona las ventas realizadas</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por número de factura o cliente..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background"
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2 rounded-lg border border-input bg-background text-sm appearance-none"
          >
            <option value="todos">Todos los estados</option>
            <option value="completada">Completada</option>
            <option value="pendiente">Pendiente</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
        <button
          onClick={loadSales}
          className="px-4 py-2 border border-input rounded-lg hover:bg-muted flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-medium text-muted-foreground">FECHA / NRO</th>
                <th className="text-left p-4 font-medium text-muted-foreground">CLIENTE</th>
                <th className="text-right p-4 font-medium text-muted-foreground">TOTAL (USD)</th>
                <th className="text-right p-4 font-medium text-muted-foreground">TOTAL (RD$)</th>
                <th className="text-center p-4 font-medium text-muted-foreground">MÉTODO</th>
                <th className="text-center p-4 font-medium text-muted-foreground">ESTADO</th>
                <th className="text-center p-4 font-medium text-muted-foreground">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">Cargando ventas...</td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">No se encontraron ventas</td>
                </tr>
              ) : (
                filteredSales.map(sale => (
                  <tr key={sale.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-4">
                      <p className="font-medium">{new Date(sale.created_at).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground font-mono">{sale.number}</p>
                    </td>
                    <td className="p-4">
                      {sale.client?.name || "Cliente General"}
                    </td>
                    <td className="p-4 text-right font-medium text-emerald-600">
                      {formatMain(sale.total)}
                    </td>
                    <td className="p-4 text-right text-muted-foreground">
                      {formatDop(sale.total_bs)}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-1 rounded-full bg-muted text-[10px] font-bold uppercase">
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        sale.status === 'completada' ? 'bg-emerald-500/10 text-emerald-500' : 
                        sale.status === 'cancelada' ? 'bg-destructive/10 text-destructive' : 
                        'bg-amber-500/10 text-amber-500'
                      }`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => viewDetails(sale)}
                          className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => printSale(sale)}
                          className="w-8 h-8 rounded bg-muted text-muted-foreground flex items-center justify-center hover:bg-muted/80"
                          title="Imprimir"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        {sale.status !== 'cancelada' && (
                          <button 
                            onClick={() => cancelSale(sale)}
                            className="w-8 h-8 rounded bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20"
                            title="Anular venta"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border text-sm text-muted-foreground">
          Mostrando {filteredSales.length} ventas
        </div>
      </div>

      {/* Details Modal */}
      {showModal && selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div>
                <h2 className="text-lg font-semibold">Detalle de Venta</h2>
                <p className="text-xs text-muted-foreground">{selectedSale.number} - {new Date(selectedSale.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-auto space-y-6">
              {/* Sale Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Cliente</p>
                  <p className="font-medium">{selectedSale.client?.name || "Cliente General"}</p>
                  <p className="text-sm text-muted-foreground">{selectedSale.client?.phone || "Sin teléfono"}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Método de Pago</p>
                  <p className="font-medium capitalize">{selectedSale.payment_method}</p>
                  <p className="text-sm text-muted-foreground">Tasa: {selectedSale.exchange_rate} RD$/$</p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Productos</p>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-left p-3 font-medium">Producto</th>
                        <th className="text-right p-3 font-medium">Cant.</th>
                        <th className="text-right p-3 font-medium">Precio</th>
                        <th className="text-right p-3 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saleItems.map((item: any) => (
                        <tr key={item.id} className="border-b border-border last:border-0">
                          <td className="p-3">
                            <p className="font-medium">{item.product?.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{item.product?.code}</p>
                          </td>
                          <td className="p-3 text-right">
                            {item.quantity} {item.product?.unit === 'Kilogramos (kg)' ? 'KG' : 'u'}
                          </td>
                          <td className="p-3 text-right">{formatMain(item.unit_price)}</td>
                          <td className="p-3 text-right font-medium">{formatMain(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex flex-col items-end space-y-2 pt-4 border-t border-border">
                <div className="flex justify-between w-48 text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatMain(selectedSale.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1">
                  <span className="text-muted-foreground">Descuento:</span>
                  <span>-{formatMain(selectedSale.discount)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="font-bold">Total:</span>
                  <span className="text-primary font-bold text-lg">{formatMain(selectedSale.total)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Equivalente:</span>
                  <span>{formatSecondary(selectedSale.total)}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDop(selectedSale.total_bs)} (DOP)
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/30 flex justify-end gap-2">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-input rounded-lg hover:bg-muted"
              >
                Cerrar
              </button>
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Imprimir Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
