-- Se descontinúa la Malla de Seguro Zero Trust (decisión de la marca: el monto
-- cobrado era muy bajo frente a la cobertura ofrecida).
-- Sólo queda como tarifa no reembolsable la de servicio ApapachaPet ($4.500).
-- Las reservas antiguas (insurance_included = true) sí pagaron el seguro, así que
-- para ellas se mantiene el descuento histórico de $7.000.

ALTER TABLE public.bookings ALTER COLUMN insurance_included SET DEFAULT false;

CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  b            public.bookings%ROWTYPE;
  v_actor      text;
  v_host       uuid;
  v_days       int;
  v_percent    int;
  v_refundable int;
  v_refund     int;
  v_fees       int;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva no encontrada.'; END IF;
  IF b.status IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'La reserva ya está finalizada o cancelada.';
  END IF;

  IF b.service_type = 'space' THEN
    SELECT host_id INTO v_host FROM public.spaces WHERE id = b.service_id;
  ELSE
    SELECT host_id INTO v_host FROM public.visiters WHERE id = b.service_id;
  END IF;

  IF b.owner_id = auth.uid() THEN
    v_actor := 'owner';
  ELSIF v_host = auth.uid() THEN
    v_actor := 'host';
  ELSIF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin) THEN
    v_actor := 'admin';
  ELSE
    RAISE EXCEPTION 'No autorizado para cancelar esta reserva.';
  END IF;

  v_days := b.start_date - current_date;
  IF v_actor IN ('host', 'admin') THEN
    v_percent := 100;
  ELSIF b.payment_status IS DISTINCT FROM 'paid' THEN
    v_percent := 100;
  ELSIF v_days >= 7 THEN
    v_percent := 100;
  ELSIF v_days >= 2 THEN
    v_percent := 50;
  ELSE
    v_percent := 0;
  END IF;

  -- Tarifa de servicio (4500) + seguro histórico (2500) si la reserva lo incluía
  v_fees := 4500 + CASE WHEN COALESCE(b.insurance_included, false) THEN 2500 ELSE 0 END;

  IF b.payment_status IS DISTINCT FROM 'paid' THEN
    v_refundable := 0;
  ELSE
    v_refundable := GREATEST(0, b.total_price - v_fees);
  END IF;
  v_refund := round(v_refundable * v_percent / 100.0);

  UPDATE public.bookings SET
    status              = 'cancelled',
    cancelled_by        = v_actor,
    cancelled_at        = now(),
    cancellation_reason = p_reason,
    refund_percent      = v_percent,
    refund_amount       = v_refund
  WHERE id = p_booking_id;

  IF v_actor = 'owner' AND v_host IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (v_host, 'booking_cancelled', 'Reserva cancelada por el cliente',
            'El cliente canceló una reserva. Esas fechas quedaron libres nuevamente.',
            jsonb_build_object('booking_id', p_booking_id));
  ELSE
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (b.owner_id, 'booking_cancelled', 'Tu reserva fue cancelada',
            CASE WHEN v_refund > 0
                 THEN 'Se procesará un reembolso de $' || v_refund || ' CLP.'
                 ELSE 'Tu reserva fue cancelada.' END,
            jsonb_build_object('booking_id', p_booking_id));
  END IF;

  BEGIN
    PERFORM private.call_send_email(jsonb_build_object(
      'type', 'booking_cancelled',
      'record', row_to_json((SELECT r FROM public.bookings r WHERE r.id = p_booking_id))::jsonb,
      'actor', v_actor,
      'refund_amount', v_refund,
      'refund_percent', v_percent,
      'notify_host', (v_actor = 'owner')
    ));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('actor', v_actor, 'refund_percent', v_percent,
                            'refund_amount', v_refund, 'paid', (b.payment_status = 'paid'));
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_booking(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid, text) TO authenticated;
