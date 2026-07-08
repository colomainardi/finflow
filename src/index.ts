import express, { Request, Response } from 'express';
import { supabase } from './supabase';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.get('/', (req: Request, res: Response) => {
  res.send({ status: 'FinFlow Agent Online 🚀' });
});

app.post('/webhook', async (req: Request, res: Response) => {
  // Ahora recibimos 'phone' desde SendPulse en lugar de user_id directo
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

  try {
    // 1. Buscamos el UUID del usuario usando su número de teléfono
    const cleanedPhone = phone.replace(/\D/g, ''); // Limpia caracteres raros del string si los hay
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('phone', cleanedPhone)
      .single();

    if (userError || !userData) {
      console.error('Usuario no encontrado para el teléfono:', cleanedPhone, userError);
      return res.status(404).json({ error: 'Usuario no registrado en FinFlow' });
    }

    const resolvedUserId = userData.id;

    // 2. Insertamos en la tabla 'transactions' mapeando el UUID obtenido
    const { data, error } = await supabase
      .from('transactions')
      .insert([
        { 
          user_id: resolvedUserId, 
          amount: parseFloat(amount), // Asegura que sea procesado como número numérico
          type: type || 'gasto', 
          category: category || 'Otros', 
          description: description || raw_message, 
          transaction_date: transaction_date || new Date().toISOString().split('T')[0], 
          currency: currency || 'ARS',
          payment_method: payment_method || 'efectivo',
          cuotas: cuotas ? parseInt(cuotas) : 1,
          raw_message: raw_message
        }
      ])
      .select();

    if (error) {
      console.error('Error al insertar en Supabase:', error);
      return res.status(500).json({ error: 'Fallo al registrar la transacción en la BD' });
    }

    return res.status(200).json({
      message: 'Transacción guardada con éxito',
      id: data[0].id
    });

  } catch (err) {
    console.error('Error inesperado en el webhook:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});