export type Role = "admin" | "staff" | "client";
export type PaymentMethod = "cash" | "qr" | "transfer";
export type MovementType = "income" | "expense";
export type CashStatus = "open" | "closed";
export type ProductType = "consumable" | "rental";
export type SaleItemType = "consumable" | "rental" | "service";

export interface Profile {
  id: string;
  role: Role;
  full_name: string | null;
  phone: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  full_name: string;
  document_number: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Locker {
  id: string;
  code: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SaleLocker {
  id: string;
  sale_id: string;
  locker_id: string;
  unit_price: number;
  released_at: string | null;
  created_at: string;
  locker?: Locker;
}

/** Producto del inventario: comida/snacks/bebidas (consumable) o alquiler (rental, ej. shorts) */
export interface Product {
  id: string;
  name: string;
  type: ProductType;
  price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/** Línea de producto (o de "entrada sin casillero") dentro de una venta */
export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  product_type: SaleItemType;
  quantity: number;
  unit_price: number;
  line_total: number;
  returned_at: string | null;
  created_at: string;
  product?: Product;
}

export interface Sale {
  id: string;
  sale_number: number;
  customer_id: string | null;
  user_id: string | null;
  cash_register_id: string | null;
  subtotal: number;
  discount_percentage: number;
  discount_amount: number;
  total: number;
  payment_method: PaymentMethod;
  created_at: string;
  customer?: Customer;
  seller?: Profile;
  sale_lockers?: SaleLocker[];
  sale_items?: SaleItem[];
}

export interface CashRegister {
  id: string;
  opened_by: string | null;
  closed_by: string | null;
  opening_amount: number;
  opened_at: string;
  closed_at: string | null;
  status: CashStatus;
  total_cash: number;
  total_qr: number;
  total_transfer: number;
  total_other_income: number;
  total_expenses: number;
  closing_balance: number;
  counted_cash_amount: number | null;
  cash_difference: number | null;
  notes: string | null;
  opener?: Profile;
  closer?: Profile;
}

export interface CashMovement {
  id: string;
  cash_register_id: string;
  type: MovementType;
  concept: string;
  amount: number;
  user_id: string | null;
  created_at: string;
  user?: Profile;
}

export interface BusinessSettings {
  id: number;
  business_name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  locker_price: number;
  no_locker_price: number;
  discount_enabled: boolean;
  discount_default_percentage: number;
  updated_at: string;
}

/** Casillero enriquecido con su estado actual (derivado en el cliente) */
export interface LockerWithStatus extends Locker {
  occupied: boolean;
  saleLockerId?: string;
  customerName?: string;
  saleId?: string;
}

/** Producto enriquecido con disponibilidad actual (derivado en el cliente) */
export interface ProductWithAvailability extends Product {
  activeRentals: number; // solo aplica a type === 'rental'
  available: number; // consumable: stock_quantity; rental: stock_quantity - activeRentals
  lowStock: boolean;
}

/** Ítem del carrito de venta, antes de confirmarse */
export interface CartProductLine {
  product: ProductWithAvailability;
  quantity: number;
}
