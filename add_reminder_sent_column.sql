-- ADICIONAR COLUNA REMINDER_SENT NA TABELA APPOINTMENTS
-- Para controlar quais agendamentos já receberam lembrete

-- Adicionar coluna reminder_sent
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Criar índice para otimizar consultas de lembretes
CREATE INDEX IF NOT EXISTS idx_appointments_reminder 
ON appointments (appointment_date, reminder_sent, status) 
WHERE status IN ('agendado', 'confirmado');

-- Verificar estrutura atualizada
SELECT 
    'COLUNA REMINDER_SENT ADICIONADA' as status,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'appointments' 
AND column_name = 'reminder_sent';

-- Verificar alguns registros
SELECT 
    'SAMPLE APPOINTMENTS' as info,
    id,
    client_name,
    appointment_date,
    status,
    reminder_sent,
    created_at
FROM appointments 
ORDER BY created_at DESC 
LIMIT 5;