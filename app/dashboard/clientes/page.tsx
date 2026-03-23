"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Client } from "@/lib/types"
import { Users, Search, Plus, RefreshCw, Edit2, X, Phone, Mail, MapPin, CreditCard } from "lucide-react"
import { toast } from "sonner"

const supabase = createClient()

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    credit_limit: "0",
  })

  const loadData = async () => {
    setLoading(true)
    const { data } = await supabase.from("clients").select("*").eq("is_active", true).order("name")
    if (data) setClients(data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const clientData = {
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        credit_limit: parseFloat(formData.credit_limit) || 0,
      }

      if (editingClient) {
        const { error } = await supabase.from("clients").update(clientData).eq("id", editingClient.id)
        if (error) throw error
        toast.success("Cliente actualizado correctamente")
      } else {
        const { error } = await supabase.from("clients").insert(clientData)
        if (error) throw error
        toast.success("Cliente creado correctamente")
      }

      setShowModal(false)
      setEditingClient(null)
      resetForm()
      loadData()
    } catch (error) {
      console.error("Error saving client:", error)
      toast.error("Error al guardar el cliente")
    }
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setFormData({
      name: client.name,
      phone: client.phone || "",
      email: client.email || "",
      address: client.address || "",
      credit_limit: client.credit_limit.toString(),
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      credit_limit: "0",
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
            <h1 className="text-2xl font-bold">Gestión de Clientes</h1>
            <p className="text-sm text-muted-foreground">Administra tus clientes y límites de crédito</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setEditingClient(null); setShowModal(true) }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </button>
      </div>

      {/* Stats */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <p className="text-sm text-muted-foreground">Total: <span className="font-semibold text-foreground">{clients.length} clientes</span></p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, email o teléfono..."
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
        ) : filteredClients.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">No hay clientes</div>
        ) : (
          filteredClients.map(client => (
            <div key={client.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold">{client.name}</h3>
                    <p className="text-xs text-muted-foreground">Límite: RD$ {client.credit_limit.toLocaleString()}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleEdit(client)}
                  className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                {client.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{client.address}</span>
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
              <h2 className="text-lg font-semibold">{editingClient ? "Editar Cliente" : "Nuevo Cliente"}</h2>
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
                <label className="text-sm font-medium mb-1 block">Límite de Crédito (RD$)</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="number"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData(prev => ({ ...prev, credit_limit: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-input rounded-lg hover:bg-muted">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  {editingClient ? "Actualizar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
