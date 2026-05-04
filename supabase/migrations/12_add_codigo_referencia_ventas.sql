-- Agregar campo codigo_referencia a ventas (voucher, N° operación, recibo)
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS codigo_referencia text;

-- Agregar numero_ticket auto-incremental a ventas (comprobante de venta)
CREATE SEQUENCE IF NOT EXISTS ventas_numero_ticket_seq START 1;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS numero_ticket integer DEFAULT nextval('ventas_numero_ticket_seq');
