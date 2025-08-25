import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface WhatsAppMessage {
  id: string;
  client_phone: string;
  client_name: string;
  message_type: 'confirmation' | 'reminder' | 'custom';
  message_content: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sent_at: string;
}

interface WhatsAppSession {
  id: string;
  is_connected: boolean;
  status: string;
  phone_number?: string;
}

export const useWhatsApp = (barbershopId: string) => {
  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (barbershopId) {
      fetchSession();
      fetchMessages();
    }
  }, [barbershopId]);

  const fetchSession = async () => {
    try {
      const { data } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .single();

      if (data) {
        setSession(data);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp session:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (data) {
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp messages:', error);
    }
  };

  const sendMessage = async (
    clientPhone: string,
    clientName: string,
    messageType: 'confirmation' | 'reminder' | 'custom',
    messageContent: string,
    appointmentId?: string
  ) => {
    setLoading(true);
    try {
      // Salvar mensagem no banco como simulação
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .insert({
          barbershop_id: barbershopId,
          appointment_id: appointmentId,
          client_phone: clientPhone,
          client_name: clientName,
          message_type: messageType,
          message_content: messageContent,
          status: 'sent', // Simula como enviado em produção
          sent_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Em produção, apenas simula o envio
      console.log(`WhatsApp message simulated: ${clientPhone} - ${messageContent}`);

      await fetchMessages();
      return data;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };



  const sendAppointmentConfirmation = async (appointmentData: {
    id: string;
    client_name: string;
    client_phone: string;
    appointment_date: string;
    start_time: string;
    service_name: string;
    service_price: number;
  }) => {
    try {
      // Buscar template de confirmação
      const { data: template } = await supabase
        .from('whatsapp_templates')
        .select('message_template')
        .eq('barbershop_id', barbershopId)
        .eq('template_type', 'confirmation')
        .eq('is_active', true)
        .single();

      if (!template) {
        throw new Error('Template de confirmação não encontrado');
      }

      // Buscar dados da barbearia
      const { data: barbershop } = await supabase
        .from('barbershops')
        .select('name, address')
        .eq('id', barbershopId)
        .single();

      // Processar template
      const { data: processedMessage } = await supabase.rpc('process_whatsapp_template', {
        p_template: template.message_template,
        p_client_name: appointmentData.client_name,
        p_appointment_date: appointmentData.appointment_date,
        p_appointment_time: appointmentData.start_time,
        p_service_name: appointmentData.service_name,
        p_service_price: appointmentData.service_price,
        p_barbershop_name: barbershop?.name || '',
        p_barbershop_address: barbershop?.address || ''
      });

      return await sendMessage(
        appointmentData.client_phone,
        appointmentData.client_name,
        'confirmation',
        processedMessage,
        appointmentData.id
      );
    } catch (error) {
      console.error('Error sending appointment confirmation:', error);
      throw error;
    }
  };

  const sendAppointmentReminder = async (appointmentData: {
    id: string;
    client_name: string;
    client_phone: string;
    appointment_date: string;
    start_time: string;
    service_name: string;
  }) => {
    try {
      // Buscar template de lembrete
      const { data: template } = await supabase
        .from('whatsapp_templates')
        .select('message_template')
        .eq('barbershop_id', barbershopId)
        .eq('template_type', 'reminder')
        .eq('is_active', true)
        .single();

      if (!template) {
        throw new Error('Template de lembrete não encontrado');
      }

      // Buscar dados da barbearia
      const { data: barbershop } = await supabase
        .from('barbershops')
        .select('name')
        .eq('id', barbershopId)
        .single();

      // Processar template
      const { data: processedMessage } = await supabase.rpc('process_whatsapp_template', {
        p_template: template.message_template,
        p_client_name: appointmentData.client_name,
        p_appointment_date: appointmentData.appointment_date,
        p_appointment_time: appointmentData.start_time,
        p_service_name: appointmentData.service_name,
        p_service_price: 0,
        p_barbershop_name: barbershop?.name || '',
        p_barbershop_address: ''
      });

      return await sendMessage(
        appointmentData.client_phone,
        appointmentData.client_name,
        'reminder',
        processedMessage,
        appointmentData.id
      );
    } catch (error) {
      console.error('Error sending appointment reminder:', error);
      throw error;
    }
  };

  return {
    session,
    messages,
    loading,
    sendMessage,
    sendAppointmentConfirmation,
    sendAppointmentReminder,
    fetchSession,
    fetchMessages
  };
};