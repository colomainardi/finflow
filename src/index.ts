import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Inicialización de Supabase con variables de entorno
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const port = process.env.PORT || 8080;

// Ruta base para verificar que el servicio responda online
app.get('/', (req: Request, res: Response) => {
  res.json({ status: "FinFlow Agent Online 🚀" });
});

// Webhook principal para procesar los datos de SendPulse
app.post('/webhook', async (req: Request, res: Response): Promise<any> => {
  const { 
    phone,
    amount, 
    category, 
    description, 
    type, 
    transaction_date, 
    currency, 
    payment_method, 
    cuotas, 
    raw_message 
  } = req.body;

  console.log(`[Webhook] Recibida petición para el teléfono: ${phone}, Monto: ${amount}`);

  if (!phone) {
    return res.status(400).json({ error: 'Falta el campo obligatorio "phone"' });
  }

  try {
    // 1. Limpiamos y buscamos el UUID del usuario mediante el teléfono
    const cleanedPhone = phone.toString().replace(/\D/g, ''); 
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('phone', cleanedPhone)
      .maybeSingle(); // Evita lanzar excepciones si no encuentra filas

    if (userError || !userData) {
      console.error('[Supabase] Usuario no encontrado para el teléfono:', cleanedPhone, userError);
      return res.status(404).json({ error: 'Usuario no registrado en la base de datos' });
    }

    const resolvedUserId = userData.id;

    // 2. Insertamos la transacción con los datos procesados por la IA
    const parsedAmount = amount ? parseFloat(amount.toString()) : 0;
    const parsedCuotas = cuotas ? parseInt(cuotas.toString(), 10) : 1;

    const { data, error: insertError } = await supabase
      .from('transactions')
      .insert([
        { 
          user_id: resolvedUserId, 
          amount: parsedAmount, 
          type: type || 'gasto', 
          category: category || 'Otros', 
          description: description || raw_message || 'Registro desde WhatsApp', 
          transaction_date: transaction_date || new Date().toISOString(), 
          currency: currency || 'ARS',
          payment_method: payment_method || 'efectivo',
          cuotas: parsedCuotas,
          raw_message: raw_message || ''
        }
      ])
      .select();

    if (insertError) {
      console.error('[Supabase] Error al insertar transacción:', insertError);
      return res.status(500).json({ error: 'Error al escribir en la tabla de transacciones' });
    }

    console.log('[Supabase] Transacción guardada con éxito con ID:', data[0]?.id);
    return res.status(200).json({
      message: 'Transacción guardada con éxito',
      id: data[0]?.id
    });

  } catch (err) {
    console.error('[Fatal] Error inesperado en el webhook:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Arrancar el servidor
app.listen(port, () => {
  console.log(`FinFlow Server corriendo exitosamente en el puerto ${port}`);
});