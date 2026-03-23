export interface ExchangeRate {
  id: string
  rate: number
  source: string
  created_by: string | null
  created_at: string
}

export interface Category {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  code: string
  barcode: string | null
  name: string
  description: string | null
  category_id: string | null
  category?: Category
  price: number
  cost: number
  stock: number
  min_stock: number
  unit: string
  uses_lots: boolean
  uses_serial: boolean
  sells_by_weight: boolean
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  name: string
  rif: string | null
  phone: string | null
  email: string | null
  address: string | null
  contact_name: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Purchase {
  id: string
  number: string
  supplier_id: string | null
  supplier?: Supplier
  invoice_number: string | null
  invoice_date: string | null
  subtotal: number
  discount: number
  total: number
  total_bs: number
  exchange_rate: number
  status: 'pendiente' | 'completada' | 'cancelada'
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  items?: PurchaseItem[]
}

export interface PurchaseItem {
  id: string
  purchase_id: string
  product_id: string | null
  product?: Product
  quantity: number
  unit_cost: number
  total: number
  lot_id: string | null
  created_at: string
}

export interface Lot {
  id: string
  number: string
  product_id: string
  product?: Product
  quantity: number
  initial_quantity: number
  cost: number
  expiry_date: string | null
  status: 'activo' | 'agotado' | 'vencido'
  purchase_id: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  credit_limit: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Sale {
  id: string
  number: string
  client_id: string | null
  client?: Client
  subtotal: number
  discount: number
  total: number
  total_bs: number
  exchange_rate: number
  payment_method: string
  status: 'completada' | 'pendiente' | 'cancelada'
  is_credit: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  items?: SaleItem[]
  payments?: SalePayment[]
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string | null
  product?: Product
  lot_id: string | null
  quantity: number
  unit_price: number
  total: number
  created_at: string
}

export interface SalePayment {
  id: string
  sale_id: string
  payment_method: string
  amount_usd: number
  amount_bs: number
  reference: string | null
  created_at: string
}

export interface Credit {
  id: string
  client_id: string
  client?: Client
  sale_id: string
  sale?: Sale
  total: number
  paid: number
  balance: number
  due_date: string | null
  status: 'pendiente' | 'pagado' | 'vencido'
  created_at: string
  updated_at: string
}

export interface CreditPayment {
  id: string
  credit_id: string
  amount: number
  payment_method: string
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface SupplierPayment {
  id: string
  purchase_id: string
  amount: number
  amount_bs: number
  payment_method: string
  reference: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface InventoryAdjustment {
  id: string
  product_id: string
  product?: Product
  lot_id: string | null
  type: 'agregar' | 'restar'
  quantity: number
  reason: string
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface Profile {
  id: string
  username: string | null
  full_name: string | null
  role: 'super_admin' | 'saas_assistant' | 'admin' | 'manager' | 'cajero' | 'vendedor'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Backup {
  id: string
  filename: string
  size_bytes: number
  created_by: string | null
  created_at: string
}

// Cart types for POS
export interface CartItem {
  product: Product
  quantity: number
  lot_id?: string
  unit_price: number
  total: number
}

export interface PaymentEntry {
  method: 'efectivo' | 'tarjeta' | 'transferencia' | 'credito'
  amount_usd: number
  amount_bs: number
  reference?: string
}
