export type AdobeOrderPayload = {
  order_number: string;
  source: string;
  warehouse: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  shipping_address: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  shipping_method: string;
  items: Array<{
    sku: string;
    quantity: number;
    name?: string;
  }>;
};

export type TrackingPayload = {
  order_number: string;
  shipment_id: string;
  carrier: string;
  tracking_number: string;
  tracking_url?: string;
  shipped_at: string;
  items: Array<{ sku: string; quantity: number }>;
};

export type InventoryPayload = {
  sku: string;
  shiphero_warehouse: string;
  adobe_source: string;
  on_hand: number;
  allocated: number;
  available: number;
  updated_at: string;
};

export type QueueJobName =
  | "adobe.order.created"
  | "shiphero.webhook.received"
  | "shiphero.inventory.sync"
  | "shiphero.tracking.sync";
