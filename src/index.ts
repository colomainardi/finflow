import express, { Request, Response } from 'express';

const app = express();
app.use(express.json());

// El puerto debe ser leído de la variable de entorno para Cloud Run
const PORT = process.env.PORT || 8080;

app.get('/', (req: Request, res: Response) => {
  res.send({ status: 'FinFlow Agent Online 🚀' });
});

// Este será el endpoint para SendPulse/WhatsApp después
app.post('/webhook', (req: Request, res: Response) => {
  console.log('Mensaje recibido:', req.body);
  res.status(200).send('EVENT_RECEIVED');
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});