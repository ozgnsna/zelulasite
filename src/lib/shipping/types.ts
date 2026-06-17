export type ShippingCarrierId = "dhl" | "navlungo";

/** Sipariş satırından kargo oluşturmak için minimum alanlar */
export type OrderShippingSource = {
  id: string;
  order_number: string;
  customer_name: string;
  email: string;
  phone: string;
  payment_status: string | null;
  shipping_address_json: unknown;
};

export type CreateShipmentSuccess = {
  ok: true;
  provider: ShippingCarrierId;
  trackingNumber: string;
  labelUrl: string | null;
  shippingStatus: string;
};

export type CreateShipmentFailure = {
  ok: false;
  error: string;
  code?: string;
};

export type CreateShipmentResult = CreateShipmentSuccess | CreateShipmentFailure;
