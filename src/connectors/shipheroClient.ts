import { config } from "../config.js";
import { logger } from "../logger.js";
import type { AdobeOrderPayload } from "../types/payloads.js";

type GraphQlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; path?: string[] }>;
};

export class ShipHeroRequestError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly errors?: Array<{ message: string; path?: string[] }>
  ) {
    super(message);
    this.name = "ShipHeroRequestError";
  }
}

export class ShipHeroClient {
  async request<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch(config.SHIPHERO_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.SHIPHERO_BEARER_TOKEN}`
      },
      body: JSON.stringify({ query, variables })
    });

    const body = (await response.json()) as GraphQlResponse<T>;
    if (!response.ok || body.errors?.length) {
      logger.error({ statusCode: response.status, errors: body.errors }, "ShipHero GraphQL request failed");
      throw new ShipHeroRequestError("ShipHero GraphQL request failed", response.status, body.errors);
    }

    return body.data as T;
  }

  async createOrder(order: AdobeOrderPayload) {
    if (config.DRY_RUN_EXTERNAL_APIS) {
      logger.info(
        { order_number: order.order_number, warehouse: order.warehouse, items: order.items.length },
        "Dry run: skipping ShipHero order_create"
      );
      return {
        order_create: {
          request_id: `dry-run-shiphero-${order.order_number}`,
          complexity: 0,
          order: {
            id: `dry-run-${order.order_number}`,
            order_number: order.order_number
          }
        }
      };
    }

    const mutation = `
      mutation CreateOrder($data: OrderCreateInput!) {
        order_create(data: $data) {
          request_id
          complexity
          order {
            id
            order_number
          }
        }
      }
    `;

    return this.request(mutation, {
      data: mapAdobeOrderToShipHero(order)
    });
  }

  async getAccountWarehouses() {
    const query = `
      query GetAccountWarehouses {
        account {
          request_id
          complexity
          data {
            id
            warehouses {
              id
              legacy_id
              identifier
              profile
            }
          }
        }
      }
    `;

    return this.request(query);
  }
}

function mapAdobeOrderToShipHero(order: AdobeOrderPayload) {
  return {
    order_number: order.order_number,
    warehouse: order.warehouse,
    source: order.source,
    email: order.customer.email,
    profile: "default",
    shipping_address: {
      name: order.customer.name,
      address1: order.shipping_address.street1,
      address2: order.shipping_address.street2,
      city: order.shipping_address.city,
      state: order.shipping_address.state,
      zip: order.shipping_address.postal_code,
      country: order.shipping_address.country,
      phone: order.customer.phone
    },
    shipping_lines: [
      {
        title: order.shipping_method,
        carrier: order.shipping_method
      }
    ],
    line_items: order.items.map((item) => ({
      sku: item.sku,
      quantity: item.quantity,
      product_name: item.name
    }))
  };
}
