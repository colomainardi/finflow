import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const port = process.env.PORT || 8080;

try {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();

  if (!supabaseUrl || !supabaseKey) {
    console.error('[⚠️ FinFlow] ATENCIÓN: Falta configurar SUPABASE_URL o la KEY en las variables de entorno.');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Webhook Principal
  app.post('/webhook', async (req: Request, res: Response) => {
    // 🔍 CONSOLE.LOG ESTRATÉGICO: Imprime todo lo que manda SendPulse para ver el formato real de los campos
    console.log(`[Webhook] BODY RECIBIDO COMPLETO:`, JSON.stringify(req.body));

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

    if (!phone) {
      res.status(400).json({ error: 'Falta el campo "phone"' });
      return;
    }

    try {
      const cleanedPhone = phone.toString().replace(/\D/g, ''); 
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', cleanedPhone)
        .maybeSingle();

      if (userError || !userData) {
        console.error('[Supabase] Usuario no encontrado:', cleanedPhone, userError);
        res.status(404).json({ error: 'Usuario no registrado' });
        return;
      }

      const parsedAmount = amount ? parseFloat(amount.toString()) : 0;
      const parsedCuotas = cuotas ? parseInt(cuotas.toString(), 10) : 1;

      const { data, error: insertError } = await supabase
        .from('transactions')
        .insert([
          { 
            user_id: userData.id, 
            amount: parsedAmount, 
            type: type || 'gasto', 
            category: category || 'Otros', 
            description: description || raw_message || 'WhatsApp', 
            transaction_date: transaction_date || new Date().toISOString(), 
            currency: currency || 'ARS',
            payment_method: payment_method || 'efectivo',
            cuotas: parsedCuotas,
            raw_message: raw_message || ''
          }
        ])
        .select();

      if (insertError) {
        console.error('[Supabase] Error al insertar:', insertError);
        res.status(500).json({ error: 'Error de inserción' });
        return;
      }

      res.status(200).json({ message: 'OK', id: data[0]?.id });
      return;

    } catch (webhookError) {
      console.error('[Error Webhook interno]:', webhookError);
      res.status(500).json({ error: 'Internal Error' });
      return;
    }
  });

} catch (initError) {
  console.error('[Fatal] Error crítico durante la inicialización del cliente Supabase:', initError);
}

// Ruta Base de chequeo
app.get('/', (req: Request, res: Response) => {
  res.json({ status: "FinFlow Agent Online 🚀" });
});

// Forzamos el arranque pase lo que pase
app.listen(port, () => {
  console.log(`FinFlow Server escuchando en puerto ${port} 🎉`);
});