import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRouter from './routes/auth';
import applicationsRouter from './routes/applications';
import workflowsRouter from './routes/workflows';
import contactsRouter from './routes/contacts';
import permitTypesRouter from './routes/permitTypes';
import inspectionsRouter from './routes/inspections';
import usersRouter from './routes/users';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/workflows', workflowsRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/permit-types', permitTypesRouter);
app.use('/api/inspections', inspectionsRouter);
app.use('/api/users', usersRouter);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
