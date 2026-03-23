"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useExchangeRate } from "@/lib/hooks/use-exchange-rate"
import { generateTicketPDF } from "@/lib/utils/ticket-generator"
import { toast } from "sonner"
import type { Product, CartItem, PaymentEntry } from "@/lib/types"
import { 
  Search, 
  ShoppingCart as CartIcon, 
  Plus, 
  Minus, 
  Trash2, 
  DollarSign,
  CreditCard,
  ArrowLeftRight,
  User,
  X,
  Maximize2,
  CheckCircle2,
  Printer,
} from "lucide-react"

const supabase = createClient()

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [clients, setClients] = useState<any[]>([]) // Added
  const [selectedClientId, setSelectedClientId] = useState<string>("") // Added
  const [searchQuery, setSearchQuery] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [discountValue, setDiscountValue] = useState(0)
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent")
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "tarjeta" | "transferencia" | "credito">("efectivo")
  const [amountReceivedUsd, setAmountReceivedUsd] = useState("")
  const [amountReceivedDop, setAmountReceivedDop] = useState("") // Changed from Bs
  const [showMultiplePayments, setShowMultiplePayments] = useState(false)
  const [payments, setPayments] = useState<PaymentEntry[]>([])
  const [searchResults, setSearchResults] = useState<Product[]>([])
  
  // New states for NCF and Business
  const [ncfTypes, setNcfTypes] = useState<any[]>([])
  const [selectedNcfType, setSelectedNcfType] = useState<string>("B02") // Default to Consumo
  const [processing, setProcessing] = useState(false)
  const [showConfirmSale, setShowConfirmSale] = useState(false)
  const [showConfirmPrint, setShowConfirmPrint] = useState(false)
  const [lastFinishedSale, setLastFinishedSale] = useState<any>(null)
  const [businessProfile, setBusinessProfile] = useState<any>(null)

  const { rate, formatUsd, formatDop, formatMain, formatSecondary, usdToDop, dopToUsd, currencySymbol, baseCurrency } = useExchangeRate()

  // Load data
  useEffect(() => {
    const loadData = async () => {
      const [productsRes, clientsRes, ncfRes, businessRes] = await Promise.all([
        supabase.from("products").select("*").eq("is_active", true).order("name"),
        supabase.from("clients").select("*").eq("is_active", true).order("name"),
        supabase.from("ncf_sequences").select("*").eq("is_active", true),
        supabase.from("business_profile").select("*").single()
      ])
      if (productsRes.data) setProducts(productsRes.data)
      if (clientsRes.data) setClients(clientsRes.data)
      if (ncfRes.data) setNcfTypes(ncfRes.data)
      if (businessRes.data) setBusinessProfile(businessRes.data)
    }
    loadData()
  }, [])

  // Search products and handle Barcode Scale
  useEffect(() => {
    const query = searchQuery.trim()
    if (!query) {
      setSearchResults([])
      return
    }

    // Check for EAN-13 Scale Barcode (20 + 6 digits code + 5 digits weight)
    if (query.length === 13 && query.startsWith("20")) {
      const baseCode = query.slice(2, 8)
      const weightGram = parseInt(query.slice(8, 13))
      const weightKg = weightGram / 1000

      const product = products.find(p => p.barcode === baseCode)
      if (product) {
        addToCart(product, weightKg)
        setSearchQuery("")
        return
      }
    }

    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.code.toLowerCase().includes(query.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(query.toLowerCase())
    )
    setSearchResults(filtered)
  }, [searchQuery, products])

  // Calculate totals
  const subtotal = cart.reduce((sum: number, item: CartItem) => sum + item.total, 0)
  const discountAmount = discountType === "percent" 
    ? (subtotal * discountValue / 100) 
    : discountValue
  const totalRaw = Math.max(0, subtotal - discountAmount)
  
  // Logic Fix: Treat database prices as the Base Currency
  const isDopBase = baseCurrency === "DOP"
  const totalMain = totalRaw
  const totalSecondary = isDopBase ? totalRaw / rate : totalRaw * rate
  
  // For database compatibility (saving sales)
  const totalUsd = isDopBase ? totalRaw / rate : totalRaw
  const totalDop = isDopBase ? totalRaw : totalRaw * rate

  // Calculate amount received and change (IN BASE CURRENCY)
  const totalReceivedMain = showMultiplePayments 
    ? payments.reduce((sum: number, p: PaymentEntry) => sum + (isDopBase ? (p.amount_bs + usdToDop(p.amount_usd)) : (p.amount_usd + dopToUsd(p.amount_bs))), 0)
    : (parseFloat(amountReceivedDop) || 0) + (isDopBase ? usdToDop(parseFloat(amountReceivedUsd) || 0) : 0)
    // If not DOP base, we should probably handle USD input here too, but prioritized DOP for now.
  
  const changeMain = totalReceivedMain - totalMain
  const remainingMain = totalMain - totalReceivedMain

  // Add product to cart
  const addToCart = useCallback((product: Product, forcedQty?: number) => {
    setCart((prev: CartItem[]) => {
      // If it's a weight product or forced qty (from scale), we usually add a new row
      // or if the user wants multiple rows as seen in image 56.
      // To match image 56 exactly (multiple entries for "POLLO ENTERO KG"), 
      // we'll skip merging if forcedQty is provided or if sells_by_weight is true.
      
      const isDecimalUnit = product.unit && ["Kilogramos (kg)", "Litros (L)", "Metros (m)", "Gramos (g)", "Libras (lb)", "Galones"].includes(product.unit)
      const existing = prev.find((item: CartItem) => item.product.id === product.id)
      
      if (existing && !product.sells_by_weight && !isDecimalUnit && !forcedQty) {
        return prev.map((item: CartItem) => 
          item.product.id === product.id
            ? { 
                ...item, 
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.unit_price
              }
            : item
        )
      }

      const qty = forcedQty || (product.sells_by_weight || isDecimalUnit ? 1 : 1)
      return [...prev, {
        product: { ...product }, // Clone to avoid issues
        quantity: qty,
        unit_price: product.price,
        total: qty * product.price
      }]
    })
    setSearchQuery("")
    setSearchResults([])
  }, [])

  // Update cart item quantity
  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev: CartItem[]) => prev.map((item: CartItem) => {
      if (item.product.id === productId) {
        const isDecimalUnit = item.product.unit && ["Kilogramos (kg)", "Litros (L)", "Metros (m)", "Gramos (g)", "Libras (lb)", "Galones"].includes(item.product.unit)
        const step = (item.product.sells_by_weight || isDecimalUnit) ? 0.5 : 1
        const newQty = Math.max(step, item.quantity + (delta * step))
        return {
          ...item,
          quantity: newQty,
          total: newQty * item.unit_price
        }
      }
      return item
    }))
  }

  // Set specific quantity
  const setQuantity = (productId: string, qty: number) => {
    setCart((prev: CartItem[]) => prev.map((item: CartItem) => {
      if (item.product.id === productId) {
        const newQty = Math.max(0.001, qty)
        return {
          ...item,
          quantity: newQty,
          total: newQty * item.unit_price
        }
      }
      return item
    }))
  }

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart((prev: CartItem[]) => prev.filter((item: CartItem) => item.product.id !== productId))
  }

  // Clear cart
  const clearCart = () => {
    setCart([])
    setDiscountValue(0)
    setAmountReceivedUsd("")
    setAmountReceivedDop("")
    setPayments([])
  }

  // Add payment entry
  const addPaymentUsd = () => {
    const amount = parseFloat(amountReceivedUsd) || 0
    if (amount > 0) {
      setPayments(prev => [...prev, {
        method: paymentMethod,
        amount_usd: amount,
        amount_bs: 0
      }])
      setAmountReceivedUsd("")
    }
  }

  const addPaymentDop = () => {
    const amount = parseFloat(amountReceivedDop) || 0
    if (amount > 0) {
      setPayments(prev => [...prev, {
        method: paymentMethod,
        amount_usd: 0,
        amount_bs: amount
      }])
      setAmountReceivedDop("")
    }
  }

  // Process sale
  const processSale = async () => {
    if (cart.length === 0) return
    if (remainingMain > 0.01 && paymentMethod !== "credito") {
      toast.error("El monto recibido es insuficiente")
      return
    }
    if (paymentMethod === "credito" && !selectedClientId) {
      toast.error("Debe seleccionar un cliente para ventas a crédito")
      return
    }

    setProcessing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Generate sale number
      const today = new Date()
      const dateStr = today.toISOString().split("T")[0].replace(/-/g, "")
      const { count } = await supabase
        .from("sales")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString().split("T")[0])
      
      const saleNumber = `#VTA-${dateStr}-${String((count || 0) + 1).padStart(4, "0")}`

      // Get NCF (optional call to RPC function)
      let ncf = null
      if (selectedNcfType) {
        const { data: nextNcf, error: ncfError } = await supabase.rpc("get_next_ncf", { 
          ncf_type_param: selectedNcfType 
        })
        if (!ncfError) ncf = nextNcf
      }

      // Create sale
      const { data: saleData, error: saleError } = await supabase.from("sales").insert({
        number: saleNumber,
        ncf: ncf,
        ncf_type: selectedNcfType,
        subtotal: isDopBase ? subtotal / rate : subtotal,
        discount: isDopBase ? discountAmount / rate : discountAmount,
        total: totalUsd,
        total_bs: totalDop,
        exchange_rate: rate,
        payment_method: paymentMethod,
        client_id: selectedClientId || null,
        created_by: user?.id,
        status: paymentMethod === 'credito' ? 'pendiente' : 'completada'
      }).select().single()

      if (saleError) throw saleError

      // Create sale items
      const itemsToInsert = cart.map(item => ({
        sale_id: saleData.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: isDopBase ? item.unit_price / rate : item.unit_price,
        total: isDopBase ? item.total / rate : item.total
      }))

      await supabase.from("sale_items").insert(itemsToInsert)

      // Create payments or credits
      if (paymentMethod === "credito") {
        await supabase.from("credits").insert({
          client_id: selectedClientId,
          sale_id: saleData.id,
          total: totalMain,
          paid: 0,
          balance: totalMain,
          status: "pendiente"
        })
      }

      if (showMultiplePayments && payments.length > 0) {
        const paymentRecords = payments.map(p => ({
          sale_id: saleData.id,
          payment_method: p.method,
          amount_usd: p.amount_usd,
          amount_bs: p.amount_bs // this is DOP
        }))
        await supabase.from("sale_payments").insert(paymentRecords)
      } else if (paymentMethod !== "credito") {
        const recUsd = parseFloat(amountReceivedUsd) || 0
        const recDop = parseFloat(amountReceivedDop) || 0
        
        await supabase.from("sale_payments").insert({
          sale_id: saleData.id,
          payment_method: paymentMethod,
          // If both are 0, assume exact payment in USD (default) or DOP if USD is empty
          amount_usd: recUsd || (recDop ? 0 : totalUsd),
          amount_bs: recDop
        })
      }

      // Update stock
      for (const item of cart) {
        await supabase
          .from("products")
          .update({ stock: item.product.stock - Math.ceil(item.quantity) })
          .eq("id", item.product.id)
      }

      clearCart()
      setSelectedClientId("")
      setPaymentMethod("efectivo")
      setShowConfirmSale(false)

      const saleInfo = {
        business: businessProfile || { name: "Mi Negocio" },
        sale: {
          number: saleNumber,
          date: new Date(),
          ncf: ncf,
          ncf_type_name: ncfTypes.find(t => t.type === selectedNcfType)?.name,
          subtotal,
          discount: discountAmount,
          total: totalMain,
          total_bs: totalDop,
          exchange_rate: rate,
          payment_method: paymentMethod,
          isDopBase: isDopBase
        },
        items: cart.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.unit_price,
          total: item.total
        }))
      }
      
      setLastFinishedSale(saleInfo)
      setShowConfirmPrint(true)
      toast.success(`Venta ${saleNumber} procesada correctamente`)
    } catch (error: any) {
      console.error("Error processing sale:", error)
      toast.error(`Error al procesar la venta: ${error.message || "Error desconocido"}`)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Left side - Product search and cart */}
      <div className="flex-1 flex flex-col p-4 border-r border-border">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o escanear código de barras con pistola"
            className="w-full pl-10 pr-10 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <Maximize2 className="w-5 h-5" />
          </button>
          
          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-auto">
              {searchResults.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="w-full px-4 py-3 text-left hover:bg-muted flex items-center justify-between border-b border-border last:border-0"
                >
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Código: {product.code} | Stock: {product.stock} {product.sells_by_weight ? "KG" : "UNIT"} | {formatMain(product.price)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <CartIcon className="w-5 h-5 text-primary" />
            <span className="font-semibold">Carrito</span>
            <span className="ml-1 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              {cart.length}
            </span>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">El carrito está vacío</p>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CartIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">Cód: {item.product.code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-8 h-8 rounded bg-background border border-border flex items-center justify-center hover:bg-muted"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => setQuantity(item.product.id, parseFloat(e.target.value) || 0)}
                          className="w-16 text-center py-1 rounded border border-border bg-background"
                          step={(item.product.sells_by_weight || (item.product.unit && ["Kilogramos (kg)", "Litros (L)", "Metros (m)", "Gramos (g)", "Libras (lb)", "Galones"].includes(item.product.unit))) ? "0.001" : "1"}
                        />
                        <span className="text-[10px] text-muted-foreground uppercase">
                          {item.product.unit ? item.product.unit.split("(")[0].trim().slice(0,3) : (item.product.sells_by_weight ? "KG" : "")}
                        </span>
                      </div>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-8 h-8 rounded bg-background border border-border flex items-center justify-center hover:bg-muted"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-right w-24">
                      <p className="font-bold text-sm">{formatMain(item.total)}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        {formatMain(item.unit_price)}/{item.product.sells_by_weight ? "KG" : "u"}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="w-8 h-8 rounded bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Total */}
          <div className="p-4 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Total:</span>
              <div className="text-right">
                <p className="text-3xl font-black text-primary tracking-tight">{formatMain(totalMain)}</p>
                {!isDopBase && (
                  <div className="flex items-center justify-end gap-2 mt-0.5">
                    <p className="text-[11px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50">
                      {formatSecondary(totalMain)}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70">Tasa: {rate.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Payment */}
      <div className="w-80 flex flex-col p-4 bg-card">
        {/* Discount */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">Descuento</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={discountValue || ""}
              onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="flex-1 px-3 py-2 rounded-lg border border-input bg-background"
            />
            <button
              onClick={() => setDiscountType("percent")}
              className={`px-3 py-2 rounded-lg border ${discountType === "percent" ? "bg-primary text-primary-foreground" : "border-input"}`}
            >
              %
            </button>
            <button
              onClick={() => setDiscountType("fixed")}
              className={`px-2 py-1 flex-1 text-xs rounded-lg border ${discountType === "fixed" ? "bg-primary text-primary-foreground" : "border-input"}`}
            >
              {currencySymbol}
            </button>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">Método de Pago</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPaymentMethod("efectivo")}
              className={`p-3 rounded-lg border flex flex-col items-center gap-1 ${paymentMethod === "efectivo" ? "bg-emerald-500 text-white border-emerald-500" : "border-input hover:bg-muted"}`}
            >
              <DollarSign className="w-5 h-5" />
              <span className="text-xs">Efectivo</span>
            </button>
            <button
              onClick={() => setPaymentMethod("tarjeta")}
              className={`p-3 rounded-lg border flex flex-col items-center gap-1 ${paymentMethod === "tarjeta" ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-muted"}`}
            >
              <CreditCard className="w-5 h-5" />
              <span className="text-xs">Tarjeta</span>
            </button>
            <button
              onClick={() => setPaymentMethod("transferencia")}
              className={`p-3 rounded-lg border flex flex-col items-center gap-1 ${paymentMethod === "transferencia" ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-muted"}`}
            >
              <ArrowLeftRight className="w-5 h-5" />
              <span className="text-xs">Transferencia</span>
            </button>
            <button
              onClick={() => setPaymentMethod("credito")}
              className={`p-3 rounded-lg border flex flex-col items-center gap-1 ${paymentMethod === "credito" ? "bg-amber-500 text-white border-amber-500" : "border-input hover:bg-muted"}`}
            >
              <User className="w-5 h-5" />
              <span className="text-xs">Crédito/Fiado</span>
            </button>
          </div>

          <div className="mt-4">
            <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Tipo de Comprobante (NCF)</label>
            <select
              value={selectedNcfType}
              onChange={(e) => setSelectedNcfType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="">Sin Comprobante</option>
              {ncfTypes.map(type => (
                <option key={type.type} value={type.type}>{type.name}</option>
              ))}
            </select>
          </div>

          {paymentMethod === "credito" && (
            <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Seleccionar Cliente *</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="">-- Seleccionar --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Amount Received */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Monto Recibido</label>
            <button
              onClick={() => setShowMultiplePayments(!showMultiplePayments)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <ArrowLeftRight className="w-3 h-3" />
              Múltiples
            </button>
          </div>
          
          {showMultiplePayments && payments.length > 0 && (
            <div className="space-y-1 mb-3">
              {payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] bg-muted/50 p-1.5 rounded border border-border/50">
                  <div className="flex items-center gap-1.5">
                    <span className="capitalize font-medium">{p.method}</span>
                    <span className="text-[10px] text-muted-foreground">({p.amount_usd > 0 ? "USD" : "DOP"})</span>
                  </div>
                  <span className="font-bold">{p.amount_usd > 0 ? formatUsd(p.amount_usd) : formatDop(p.amount_bs)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  value={amountReceivedDop}
                  onChange={(e) => {
                    setAmountReceivedDop(e.target.value)
                  }}
                  placeholder={`Monto en RD$`}
                  className="w-full pl-3 pr-10 py-2.5 rounded-lg border border-input bg-background font-bold text-lg focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase">DOP</span>
              </div>
            </div>

            {!isDopBase && (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={amountReceivedUsd}
                    onChange={(e) => {
                      setAmountReceivedUsd(e.target.value)
                    }}
                    placeholder={`Monto en USD`}
                    className="w-full pl-3 pr-10 py-2.5 rounded-lg border border-input bg-background font-bold text-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase">USD</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Change */}
        <div className="mb-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm">Vuelto:</span>
            <span className={`font-black text-lg ${changeMain >= 0 ? "text-emerald-500" : "text-destructive"}`}>
              {formatMain(Math.max(0, changeMain))}
            </span>
          </div>
          {!isDopBase && (
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>Equivalente:</span>
              <span>{formatSecondary(Math.max(0, changeMain))}</span>
            </div>
          )}
          {remainingMain > 0.01 && paymentMethod !== "credito" && (
            <div className="mt-2 pt-2 border-t border-destructive/20">
              <div className="flex items-center justify-between text-destructive">
                <span className="text-xs font-bold uppercase">Resta:</span>
                <span className="font-black">{formatMain(remainingMain)}</span>
              </div>
              {!isDopBase && (
                <p className="text-right text-[10px] text-destructive/70">
                  {formatSecondary(remainingMain)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-auto space-y-2">
          <button
            onClick={() => setShowConfirmSale(true)}
            disabled={cart.length === 0 || processing || (remainingMain > 0.01 && paymentMethod !== "credito")}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {processing ? "Procesando..." : "Procesar Venta"}
          </button>
          <button
            onClick={clearCart}
            className="w-full py-3 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium rounded-lg transition-colors"
          >
            Limpiar Carrito
          </button>
        </div>

        {/* Modal Confirmar Venta */}
        {showConfirmSale && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <div className="bg-card rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4 border border-border animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 text-emerald-500">
                <CheckCircle2 className="w-8 h-8" />
                <h3 className="text-xl font-bold italic">Confirmar Venta</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                ¿Desea completar la venta por un total de <span className="font-bold text-foreground">{formatMain(totalMain)}</span>?
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowConfirmSale(false)}
                  className="flex-1 py-2 rounded-lg border border-input hover:bg-muted transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={processSale}
                  className="flex-1 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors font-medium"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Confirmar Impresión */}
        {showConfirmPrint && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <div className="bg-card rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4 border border-border animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 text-primary">
                <Printer className="w-8 h-8" />
                <h3 className="text-xl font-bold italic">Imprimir Ticket</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Venta completada con éxito. ¿Desea imprimir el ticket de venta?
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowConfirmPrint(false)}
                  className="flex-1 py-2 rounded-lg border border-input hover:bg-muted transition-colors font-medium"
                >
                  No, Cerrar
                </button>
                <button
                  onClick={() => {
                    generateTicketPDF(lastFinishedSale)
                    setShowConfirmPrint(false)
                  }}
                  className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
                >
                  Si, Imprimir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
