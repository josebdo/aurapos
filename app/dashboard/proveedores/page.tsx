"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Supplier } from "@/lib/types"
import { Users, Search, Plus, RefreshCw, Edit2, X, Phone, Mail, MapPin } from "lucide-react"

const supabase = createClient()

export default function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    rif: "",
    phone: "",
    email: "",
    address: "",
    contact_name: "",
    notes: "",
  })

  const loadData = async () => {
    setLoading(true)
    const { data } = await supabase.from("suppliers").select("*").eq("is_active", true).order("name")
    if (data) setSuppliers(data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.rif?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const supplierData = {
        name: formData.name,
        rif: formData.rif || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        contact_name: formData.contact_name || null,
        notes: formData.notes || null,
      }

      if (editingSupplier) {
        await supabase.from("suppliers").update(supplierData).eq("id", editingSupplier.id)
      } else {
        await supabase.from("suppliers").insert(supplierData)
      }

      setShowModal(false)
      setEditingSupplier(null)
      resetForm()
      loadData()
    } catch (error) {
      console.error("Error saving supplier:", error)
      alert("Error al guardar el proveedor")
    }
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name,
      rif: supplier.rif || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      contact_name: supplier.contact_name || "",
      notes: supplier.notes || "",
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      rif: "",
      phone: "",
      email: "",
      address: "",
      contact_name: "",
      notes: "",
    })
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gestión de Proveedores</h1>
            <p className="text-sm text-muted-foreground">Administra tus proveedores</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setEditingSupplier(null); setShowModal(true) }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Proveedor
        </button>
      </div>

      {/* Stats */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <p className="text-sm text-muted-foreground">Total: <span className="font-semibold text-foreground">{suppliers.length} proveedores</span></p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar proveedor..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background"
          />
        </div>
        <button onClick={loadData} className="px-4 py-2 border border-input rounded-lg hover:bg-muted flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">Cargando...</div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">No hay proveedores</div>
        ) : (
          filteredSuppliers.map(supplier => (
            <div key={supplier.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                    {supplier.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold">{supplier.name}</h3>
                    {supplier.rif && <p className="text-xs text-muted-foreground">RNC: {supplier.rif}</p>}
                  </div>
                </div>
                <button
                  onClick={() => handleEdit(supplier)}
                  className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{supplier.email}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{supplier.address}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">{editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
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
                <label className="text-sm font-medium mb-1 block">RNC</label>
                <input
                  type="text"
                  value={formData.rif}
                  onChange={(e) => setFormData(prev => ({ ...prev, rif: e.target.value }))}
                  placeholder="101-0XXX-X"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Dirección</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Persona de Contacto</label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-input rounded-lg hover:bg-muted">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  {editingSupplier ? "Actualizar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
