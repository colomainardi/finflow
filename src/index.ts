import express, { Request, Response } from 'express';
import { supabase } from './supabase';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.get('/', (req: Request, res: Response) => {
  res.send({ status: 'FinFlow Agent Online 🚀' });
});

app.post('/webhook', async (req: Request, res: Response) => {
  // Extraemos todos los campos que tiene tu tabla
  const { 
    user_id, 
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

  // Insertamos en la tabla 'transactions' respetando tu esquema
  const { data, error } = await supabase
    .from('transactions')
    .insert([
      { 
        user_id, // UUID del usuario
        amount, 
        type: type || 'expense', // Por defecto gasto si no viene
        category, 
        description, 
        transaction_date: transaction_date || new Date().toISOString().split('T')[0], // Fecha actual si no viene
        currency: currency || 'ARS',
        payment_method: payment_method || 'cash',
        cuotas: cuotas || 1,
        raw_message: raw_message || description, // Guardamos el texto original
      }
    ])
    .select();

  if (error) {
    console.error('Error en Supabase:', error);
    return res.status(500).json({ error: 'Fallo al registrar la transacción' });
  }

  res.status(200).json({
    message: 'Transacción guardada con éxito',
    id: data[0].id
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});