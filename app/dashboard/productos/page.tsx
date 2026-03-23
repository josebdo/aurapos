"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useExchangeRate } from "@/lib/hooks/use-exchange-rate"
import { toast } from "sonner"
import type { Product, Category } from "@/lib/types"
import { 
  Package, 
  Search, 
  Plus, 
  RefreshCw, 
  Edit2, 
  X,
  FileText,
} from "lucide-react"

const supabase = createClient()

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingProductState, setEditingProductState] = useState<Product | null>(null)
  const [tenantInfo, setTenantInfo] = useState<any>(null)
  const { rate, formatMain, currencySymbol } = useExchangeRate()

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    barcode: "",
    name: "",
    description: "",
    category_id: "",
    price: "",
    cost: "",
    stock: "",
    min_stock: "",
    unit: "Unidad (pieza)",
    uses_lots: false,
    uses_serial: false,
    sells_by_weight: false,
    expiry_date: "", // Added
  })

  const [categoryData, setCategoryData] = useState({
    name: "",
    description: "", // Added
  })

  // Load data
  const loadData = async () => {
    setLoading(true)
    const [productsRes, categoriesRes, tenantRes] = await Promise.all([
      supabase.from("products").select("*, category:categories(*)").eq("is_active", true).order("name"),
      supabase.from("categories").select("*").order("name"),
      supabase.from("profiles").select("*, tenants(*, subscription_plans(*))").single()
    ])
    if (productsRes.data) setProducts(productsRes.data)
    if (categoriesRes.data) setCategories(categoriesRes.data)
    if (tenantRes.data?.tenants) setTenantInfo(tenantRes.data.tenants)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Generate code
  const generateCode = () => {
    const timestamp = Date.now().toString(36).toUpperCase()
    setFormData(prev => ({ ...prev, code: `PROD-${timestamp}` }))
  }

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Plan limit check for new products
      if (!editingProductState && tenantInfo?.subscription_plans) {
        const limit = tenantInfo.subscription_plans.product_limit
        if (limit !== -1 && products.length >= limit) {
          toast.error(`Has alcanzado el límite de ${limit} productos de tu plan ${tenantInfo.subscription_plans.name}. Mejora tu plan para agregar más.`)
          return
        }
      }

      // Validation for scale barcode (must be 6 digits if provided)
      if (formData.barcode && !/^\d{6}$/.test(formData.barcode)) {
        alert("El Código Base Balanza debe ser un número de exactamente 6 dígitos")
        return
      }

      const productData = {
        code: formData.code,
        barcode: formData.barcode || null,
        name: formData.name,
        description: formData.description || null,
        category_id: formData.category_id || null,
        price: parseFloat(formData.price) || 0,
        cost: parseFloat(formData.cost) || 0,
        stock: parseInt(formData.stock) || 0,
        min_stock: parseInt(formData.min_stock) || 0,
        unit: formData.unit,
        uses_lots: formData.uses_lots,
        uses_serial: formData.uses_serial,
        sells_by_weight: formData.sells_by_weight,
      }

      let res;
      if (editingProductState) {
        res = await supabase.from("products").update(productData).eq("id", editingProductState.id).select().single()
      } else {
        res = await supabase.from("products").insert(productData).select().single()
      }

      const product = res.data
      if (product && formData.uses_lots && parseInt(formData.stock) > 0 && !editingProductState) {
        // Create initial lot if uses_lots and has stock (only for new products)
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0")
        const lotNumber = `LOT-${date}-${random}`

        await supabase.from("lots").insert({
          product_id: product.id,
          number: lotNumber,
          initial_quantity: parseInt(formData.stock),
          quantity: parseInt(formData.stock),
          cost: parseFloat(formData.cost) || 0,
          expiry_date: formData.expiry_date || null,
          status: 'activo'
        })
      }

      setShowModal(false)
      setEditingProductState(null)
      resetForm()
      loadData()
      toast.success(editingProductState ? "Producto actualizado correctamente" : "Producto creado correctamente")
    } catch (error) {
      console.error("Error saving product:", error)
      toast.error("Error al guardar el producto")
    }
  }

  // Handle category submit
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await supabase.from("categories").insert({ 
        name: categoryData.name, 
        description: categoryData.description 
      })
      setCategoryData({ name: "", description: "" })
      setShowCategoryModal(false)
      loadData()
      toast.success("Categoría creada correctamente")
    } catch (error) {
      console.error("Error saving category:", error)
      toast.error("Error al guardar la categoría")
    }
  }

  // Edit product
  const handleEdit = (product: Product) => {
    setEditingProductState(product)
    setFormData({
      code: product.code,
      barcode: product.barcode || "",
      name: product.name,
      description: product.description || "",
      category_id: product.category_id || "",
      price: product.price.toString(),
      cost: product.cost.toString(),
      stock: product.stock.toString(),
      min_stock: product.min_stock.toString(),
      unit: product.unit,
      uses_lots: product.uses_lots,
      uses_serial: product.uses_serial,
      sells_by_weight: product.sells_by_weight,
      expiry_date: "", // Default for editing (usually managed in Lots section)
    })
    setShowModal(true)
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      code: "",
      barcode: "",
      name: "",
      description: "",
      category_id: "",
      price: "",
      cost: "",
      stock: "",
      min_stock: "",
      unit: "Unidad (pieza)",
      uses_lots: false,
      uses_serial: false,
      sells_by_weight: false,
      expiry_date: "",
    })
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gestión de Productos</h1>
            <p className="text-sm text-muted-foreground">Administra tu catálogo de productos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-4 py-2 border border-input rounded-lg hover:bg-muted flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nueva Categoría
          </button>
          <button
            onClick={() => { resetForm(); setEditingProductState(null); setShowModal(true) }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <p className="text-sm text-muted-foreground">Total: <span className="font-semibold text-foreground">{products.length} productos</span></p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-lg">
          <Search className="w-4 h-4" />
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 rounded-lg border border-input bg-background"
        >
          <option value="">Todas las categorías</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <button
          onClick={loadData}
          className="px-4 py-2 border border-input rounded-lg hover:bg-muted flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
        <button className="px-4 py-2 border border-input rounded-lg hover:bg-muted flex items-center gap-2">
          <FileText className="w-4 h-4" />
          PDF
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">PRODUCTO</th>
                <th className="text-left p-4 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">CATEGORÍA</th>
                <th className="text-right p-4 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">PRECIO ({currencySymbol})</th>
                <th className="text-right p-4 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">COSTO ({currencySymbol})</th>
                <th className="text-right p-4 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">STOCK</th>
                <th className="text-center p-4 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">Cargando...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">No hay productos</td>
                </tr>
              ) : (
                filteredProducts.map(product => (
                  <tr key={product.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">Código: {product.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {product.category?.name || "-"}
                    </td>
                    <td className="p-4 text-right font-bold text-sm">{formatMain(product.price)}</td>
                    <td className="p-4 text-right text-muted-foreground text-sm font-medium">{formatMain(product.cost)}</td>
                    <td className="p-4 text-right">
                      <span className={`font-medium ${product.stock < product.min_stock ? "text-destructive" : ""}`}>
                        {product.stock} {product.sells_by_weight ? "KG" : "UNIDADES"}
                      </span>
                      {product.min_stock > 0 && (
                        <p className="text-xs text-muted-foreground">Mín: {product.min_stock}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border text-sm text-muted-foreground">
          Mostrando {filteredProducts.length} productos
        </div>
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">{editingProductState ? "Editar Producto" : "Nuevo Producto"}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Código *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                      className="flex-1 px-3 py-2 rounded-lg border border-input bg-background"
                      required
                    />
                    <button type="button" onClick={generateCode} className="px-3 py-2 bg-muted rounded-lg text-sm">
                      Generar
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Código Base Balanza (6 dígitos, opcional)</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "")
                      if (val.length <= 6) setFormData(prev => ({ ...prev, barcode: val }))
                    }}
                    placeholder="000103"
                    maxLength={6}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Para productos vendidos por peso (prefijo 20).</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Categoría *</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                >
                  <option value="">Seleccionar categoría</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Nombre *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Precio ({currencySymbol}) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    step="0.01"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Costo ({currencySymbol}) *</label>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                    step="0.01"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Unidad de Medida</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                >
                  <option value="Unidad (pieza)">Unidad (pieza)</option>
                  <option value="Kilogramos (kg)">Kilogramos (kg)</option>
                  <option value="Litros (L)">Litros (L)</option>
                  <option value="Metros (m)">Metros (m)</option>
                  <option value="Gramos (g)">Gramos (g)</option>
                  <option value="Libras (lb)">Libras (lb)</option>
                  <option value="Docena">Docena</option>
                  <option value="Galones">Galones</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.sells_by_weight}
                    onChange={(e) => setFormData(prev => ({ ...prev, sells_by_weight: e.target.checked }))}
                    className="w-4 h-4 rounded border-input"
                  />
                  <span className="text-sm">Se vende por peso/cantidad decimal</span>
                </label>
              </div>

              <div className="bg-amber-500/10 p-4 rounded-lg">
                <h3 className="font-medium flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-amber-500" />
                  Control de Lotes y Series
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.uses_lots}
                      onChange={(e) => setFormData(prev => ({ ...prev, uses_lots: e.target.checked }))}
                      className="w-4 h-4 rounded border-input"
                    />
                    <div>
                      <span className="text-sm font-medium">Usa Lotes</span>
                      <p className="text-xs text-muted-foreground">Permite rastrear productos por lotes con fechas de vencimiento</p>
                    </div>
                  </label>
                  {formData.uses_lots && (
                    <div className="pl-6 pt-2 animate-in slide-in-from-top-2 duration-200">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Fecha de Vencimiento del Lote Inicial</label>
                      <input
                        type="date"
                        value={formData.expiry_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.uses_serial}
                      onChange={(e) => setFormData(prev => ({ ...prev, uses_serial: e.target.checked }))}
                      className="w-4 h-4 rounded border-input"
                    />
                    <div>
                      <span className="text-sm font-medium">Usa Series/Números de Serie</span>
                      <p className="text-xs text-muted-foreground">Rastrea productos individuales por número de serie único</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Stock Inicial *</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Para ajustar el stock, ve a la sección Inventario</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Stock Mínimo</label>
                  <input
                    type="number"
                    value={formData.min_stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_stock: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-input rounded-lg hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  {editingProductState ? "Actualizar" : "Crear Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Nueva Categoría</h2>
              <button onClick={() => setShowCategoryModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCategorySubmit} className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nombre de la Categoría *</label>
                <input
                  type="text"
                  value={categoryData.name}
                  onChange={(e) => setCategoryData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Alimentos, Bebidas, Limpieza..."
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Comentario / Descripción</label>
                <textarea
                  value={categoryData.description}
                  onChange={(e) => setCategoryData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Notas adicionales sobre la categoría..."
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none text-sm"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 border border-input rounded-lg hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  Crear Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
