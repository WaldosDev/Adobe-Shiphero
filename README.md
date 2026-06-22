# Middleware Adobe Commerce - ShipHero

Starter técnico basado en el RFC `Middleware de Integración Adobe Commerce ↔ ShipHero`.

## Objetivo

Centralizar la comunicación entre Adobe Commerce y ShipHero para pedidos, inventario, tracking, webhooks, bitácora, idempotencia, reintentos y reprocesos. La capa queda preparada para sustituir ShipHero por Oracle WMS sin cambiar el contrato principal que consume Adobe.

## Arquitectura

- `POST /api/adobe/orders`: recibe pedidos de Adobe y los encola.
- `POST /webhooks/shiphero`: recibe webhooks de ShipHero, responde rápido y procesa en background.
- `BullMQ + Redis`: cola de eventos, reintentos y jobs fallidos.
- `ShipHeroClient`: conector GraphQL hacia `https://public-api.shiphero.com/graphql`.
- `AdobeClient`: conector REST hacia Adobe Commerce.
- `workers`: procesan pedidos, tracking e inventario de forma asíncrona.

## Ejecutar local

```bash
cp .env.example .env
docker compose up -d
npm install
npm run dev
```

En otra terminal:

```bash
npm run worker
```

Healthcheck:

```bash
curl http://localhost:8080/health
```

## Payload base de pedido

```bash
curl -X POST http://localhost:8080/api/adobe/orders \
  -H "content-type: application/json" \
  -d '{
    "order_number": "100000123",
    "source": "Adobe Commerce",
    "warehouse": "Waldos Ecommerce",
    "customer": {
      "name": "Nombre Cliente",
      "email": "cliente@dominio.com",
      "phone": "5512345678"
    },
    "shipping_address": {
      "street1": "Calle 1",
      "street2": "Interior / Referencia",
      "city": "Ciudad de México",
      "state": "CDMX",
      "postal_code": "01234",
      "country": "MX"
    },
    "shipping_method": "ESTAFETA_STANDARD",
    "items": [
      { "sku": "SKU123", "quantity": 2, "name": "Producto ejemplo" }
    ]
  }'
```

## Pendientes para producción

- Reemplazar la idempotencia en memoria por PostgreSQL con índices únicos por `order_number`, `shipment_id`, `webhook_id` y `sku + warehouse + timestamp`.
- Persistir bitácora de request/response/status/request_id/payload resumido por 12 meses.
- Agregar DLQ explícita y pantalla de reprocesos.
- Validar el `OrderCreateInput` real contra el schema de ShipHero de la cuenta.
- Confirmar webhooks disponibles y firma/headers reales de ShipHero.
- Agregar dashboard administrativo para monitoreo, búsqueda, reproceso y alertas.
- Definir mapeos finales Adobe MSI source ↔ ShipHero warehouse.
