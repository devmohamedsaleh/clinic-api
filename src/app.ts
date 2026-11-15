import express from 'express';
import prisma from './lib/prisma';
import patientsRouter from './modules/patients/patients.routes';
import { errorHandler } from './modules/patients/error.middleware';
import dentalServicesRouter from './modules/dental-services/dental-services.routes';
import dentistsRouter from './modules/dentists/dentists.routes';
import treatmentPlansRouter from './modules/treatment-plans/treatment-plans.routes';
import appointmentsRouter from './modules/appointments/appointments.routes';
import dentalVisits from './modules/dental-visits/dental-visits.routes'



const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health/db', async (req, res) => {
  const result = await prisma.$queryRaw<{ version: string }[]>`SELECT version() AS version`;
  res.json({ db: 'ok', version: result[0].version });
});

app.use('/patients', patientsRouter);
app.use('/dentists', dentistsRouter);
app.use('/services', dentalServicesRouter);   
app.use('/treatment-plans', treatmentPlansRouter);
app.use('/appointments', appointmentsRouter);
app.use('/dental-visit', dentalVisits);


app.use(errorHandler);

export default app;