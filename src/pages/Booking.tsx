import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, User, Scissors, Check, Loader2, AlertCircle, ArrowLeft, Building, Mail, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, addDays, isSameDay, parse, addMinutes, isPast, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useParams } from 'react-router-dom';
import { supabase, Service, StaffMember } from '../lib/supabase';

interface BarbershopPublicInfo {
  name: string;
}

const Booking: React.FC = () => {
  const { barbershop_id } = useParams<{ barbershop_id: string }>();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clientDetails, setClientDetails] = useState({ name: '', email: '', phone: '' });

  const [barbershop, setBarbershop] = useState<BarbershopPublicInfo | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staffForService, setStaffForService] = useState<StaffMember[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInitialData = useCallback(async () => {
    if (!barbershop_id) {
      setError("ID da barbearia não encontrado.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: barbershopData, error: barbershopError } = await supabase
        .from('barbershops').select('name').eq('id', barbershop_id).single();
      if (barbershopError) throw new Error("Barbearia não encontrada ou link inválido.");
      setBarbershop(barbershopData);

      const { data: servicesData, error: servicesError } = await supabase
        .from('services').select('*').eq('barbershop_id', barbershop_id).eq('is_active', true);
      if (servicesError) throw new Error("Não foi possível carregar os serviços.");
      setServices(servicesData);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [barbershop_id]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const fetchStaffForService = useCallback(async (serviceId: string) => {
    if (!barbershop_id) return;
    setLoadingStaff(true);
    const { data, error } = await supabase.rpc('get_staff_for_service', {
      p_service_id: serviceId,
      p_barbershop_id: barbershop_id
    });

    if (error) {
      console.error("Error fetching staff for service:", error);
      setStaffForService([]);
    } else {
      setStaffForService(data);
    }
    setLoadingStaff(false);
  }, [barbershop_id]);

  useEffect(() => {
    if (selectedService) {
      fetchStaffForService(selectedService.id);
    }
  }, [selectedService, fetchStaffForService]);


  const generateTimeSlots = (start: string, end: string, interval: number) => {
    const slots = [];
    let currentTime = parse(start, 'HH:mm', new Date());
    const endTime = parse(end, 'HH:mm', new Date());
    while (currentTime < endTime) {
      slots.push(format(currentTime, 'HH:mm'));
      currentTime = addMinutes(currentTime, interval);
    }
    return slots;
  };

  const fetchAvailableTimes = useCallback(async () => {
    if (!selectedService || !selectedDate || !barbershop_id) return;
    
    setLoadingTimes(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const allSlots = generateTimeSlots('09:00', '18:00', selectedService.duration_minutes);

    const { data: bookedAppointments, error: bookedError } = await supabase
      .from('appointments')
      .select('start_time, end_time')
      .eq('barbershop_id', barbershop_id)
      .eq('appointment_date', dateStr)
      .in('status', ['agendado', 'confirmado']);

    if (bookedError) {
      console.error("Error fetching booked times:", bookedError);
      setAvailableTimes(allSlots);
      setLoadingTimes(false);
      return;
    }

    const bookedTimes = new Set(bookedAppointments.map(a => a.start_time));
    const today = startOfToday();
    const available = allSlots.filter(time => {
      const timeDate = parse(time, 'HH:mm', selectedDate);
      if (isSameDay(selectedDate, today) && isPast(timeDate)) {
        return false;
      }
      return !bookedTimes.has(time);
    });

    setAvailableTimes(available);
    setLoadingTimes(false);
  }, [selectedService, selectedDate, barbershop_id]);

  useEffect(() => {
    if (step === 3 && selectedService) {
      fetchAvailableTimes();
    }
  }, [step, selectedDate, selectedService, fetchAvailableTimes]);

  const handleNextStep = () => setStep(step + 1);
  const handlePrevStep = () => {
    setError(null);
    if (step === 2) {
      setSelectedService(null);
    }
    if (step === 3) {
        setSelectedStaff(null);
    }
    if (step === 4) {
        setSelectedTime('');
    }
    setStep(step - 1);
  };

  const handleClientDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClientDetails({ ...clientDetails, [e.target.name]: e.target.value });
  };

  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = addMinutes(startDate, duration);
    return format(endDate, 'HH:mm');
  };

  const handleConfirmBooking = async () => {
    if (!barbershop_id || !selectedService || !selectedTime) return;
    setSubmitting(true);
    setError(null);

    const { data: clientId, error: clientError } = await supabase.rpc('get_or_create_client_id', {
      p_barbershop_id: barbershop_id,
      p_client_name: clientDetails.name,
      p_client_phone: clientDetails.phone,
      p_client_email: clientDetails.email || null,
    });

    if (clientError || !clientId) {
      setError(`Erro ao processar cliente: ${clientError?.message || 'ID do cliente não retornado.'}`);
      setSubmitting(false);
      return;
    }
    
    const endTime = calculateEndTime(selectedTime, selectedService.duration_minutes);

    const { error: insertError } = await supabase.from('appointments').insert({
      barbershop_id,
      client_id: clientId,
      service_id: selectedService.id,
      staff_member_id: selectedStaff?.id,
      appointment_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: selectedTime,
      end_time: endTime,
      status: 'agendado',
      service_name: selectedService.name,
      service_price: selectedService.price,
      duration_minutes: selectedService.duration_minutes,
      client_name: clientDetails.name,
      client_phone: clientDetails.phone,
      client_email: clientDetails.email,
      staff_name: selectedStaff?.name || 'Qualquer Profissional',
    });

    if (insertError) {
      setError(`Erro ao confirmar agendamento: ${insertError.message}`);
      setSubmitting(false);
    } else {
      setStep(step + 1);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return services.map(s => (
          <div key={s.id} onClick={() => { setSelectedService(s); handleNextStep(); }}
               className="p-4 border rounded-lg cursor-pointer hover:bg-gray-100 hover:shadow-md transition-all flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-800">{s.name}</h3>
              <p className="text-sm text-gray-500">{s.duration_minutes} min</p>
            </div>
            <p className="font-bold text-lg text-gray-900">R${(s.price / 100).toFixed(2)}</p>
          </div>
        ));
      case 2:
        if (loadingStaff) {
          return <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin text-blue-600"/></div>;
        }
        return (
          <div className="grid grid-cols-2 gap-4">
            <div onClick={() => { setSelectedStaff(null); handleNextStep(); }}
                 className="p-4 border rounded-lg cursor-pointer hover:bg-gray-100 text-center flex flex-col items-center justify-center h-40 transition-all">
              <User className="w-16 h-16 text-gray-400 mb-2"/>
              <h3 className="font-semibold text-gray-800">Qualquer um</h3>
            </div>
            {staffForService.map(s => (
              <div key={s.id} onClick={() => { setSelectedStaff(s); handleNextStep(); }}
                   className="p-4 border rounded-lg cursor-pointer hover:bg-gray-100 text-center flex flex-col items-center justify-center h-40 transition-all">
                <img src={s.avatar_url || `https://ui-avatars.com/api/?name=${s.name.replace(' ', '+')}&background=random`} alt={s.name} className="w-16 h-16 rounded-full mx-auto mb-2 object-cover"/>
                <h3 className="font-semibold text-gray-800">{s.name}</h3>
              </div>
            ))}
          </div>
        );
      case 3:
        return (
          <>
            <div className="flex justify-around mb-6 overflow-x-auto pb-2">
              {Array.from({ length: 7 }, (_, i) => addDays(new Date(), i)).map(date => (
                <button key={date.toString()} onClick={() => setSelectedDate(date)}
                        className={`p-3 rounded-lg text-center transition-colors w-14 flex-shrink-0 mx-1 ${isSameDay(date, selectedDate) ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200'}`}>
                  <div className="text-xs capitalize">{format(date, 'EEE', { locale: ptBR })}</div>
                  <div className="font-bold text-lg">{format(date, 'd')}</div>
                </button>
              ))}
            </div>
            {loadingTimes ? <div className="flex justify-center items-center h-24"><Loader2 className="animate-spin text-blue-600"/></div> : 
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {availableTimes.length > 0 ? availableTimes.map(time => (
                <button key={time} onClick={() => { setSelectedTime(time); handleNextStep(); }}
                        className="p-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium">
                  {time}
                </button>
              )) : <p className="col-span-full text-center text-gray-500 py-4">Nenhum horário disponível para esta data.</p>}
            </div>}
          </>
        );
      case 4:
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-xl text-center text-gray-800">Seus Dados</h3>
            {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 text-sm" role="alert"><p>{error}</p></div>}
            <div>
              <label className="text-sm font-medium text-gray-700">Nome Completo</label>
              <div className="relative mt-1"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/><input type="text" name="name" value={clientDetails.name} onChange={handleClientDetailChange} required className="w-full pl-10 p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"/></div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">E-mail</label>
              <div className="relative mt-1"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/><input type="email" name="email" value={clientDetails.email} onChange={handleClientDetailChange} required className="w-full pl-10 p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"/></div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Telefone (WhatsApp)</label>
              <div className="relative mt-1"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/><input type="tel" name="phone" value={clientDetails.phone} onChange={handleClientDetailChange} required className="w-full pl-10 p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"/></div>
            </div>
            <button onClick={handleConfirmBooking} disabled={submitting || !clientDetails.name || !clientDetails.email || !clientDetails.phone}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center justify-center">
              {submitting ? <Loader2 className="animate-spin" /> : 'Confirmar Agendamento'}
            </button>
          </div>
        );
      case 5:
        return (
          <div className="text-center py-8">
            <Check className="w-16 h-16 text-green-500 mx-auto mb-4 bg-green-100 rounded-full p-3" />
            <h2 className="text-2xl font-bold mb-2 text-gray-900">Agendamento Confirmado!</h2>
            <p className="text-gray-600 mb-4">Seu horário na <strong>{barbershop?.name}</strong> foi agendado com sucesso.</p>
            <div className="bg-gray-100 p-4 rounded-lg text-left space-y-2 mb-4">
              <p><strong>Serviço:</strong> {selectedService?.name}</p>
              <p><strong>Profissional:</strong> {selectedStaff?.name || 'Qualquer Profissional'}</p>
              <p><strong>Data:</strong> {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })} às {selectedTime}</p>
              <p className="font-bold text-lg border-t pt-2 mt-2"><strong>Total:</strong> R${(selectedService?.price || 0) / 100}</p>
            </div>
            <p className="text-sm text-gray-500">Você receberá um e-mail de confirmação em breve.</p>
          </div>
        );
      default: return null;
    }
  };

  if (loading) return <div className="pt-20 pb-16 min-h-screen bg-gray-100 flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>;
  if (error && step === 1) return <div className="pt-20 pb-16 min-h-screen bg-gray-100 flex items-center justify-center p-4"><div className="text-center bg-white p-8 rounded-lg shadow-lg"><AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" /><h2 className="text-xl font-bold text-red-700">Ocorreu um erro</h2><p className="text-gray-600 mt-2">{error}</p></div></div>;

  const stepTitles = ["Escolha o Serviço", "Escolha o Profissional", "Escolha Data e Hora", "Seus Dados", "Confirmado!"];

  return (
    <div className="pt-20 pb-16 min-h-screen bg-gray-100 flex items-center justify-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl w-full mx-auto bg-white rounded-lg shadow-xl p-6 sm:p-8">
        <div className="text-center mb-6">
          <Building className="w-12 h-12 mx-auto text-blue-600 mb-2" />
          <h1 className="text-2xl font-bold text-gray-900">{barbershop?.name}</h1>
          <p className="text-gray-600 font-semibold">{stepTitles[step - 1]}</p>
        </div>
        
        {step > 1 && step < 5 && (
          <button onClick={handlePrevStep} className="text-sm text-blue-600 mb-4 font-semibold hover:underline flex items-center"><ArrowLeft className="w-4 h-4 mr-1"/> Voltar</button>
        )}

        <div className="space-y-4">{renderStepContent()}</div>
      </motion.div>
    </div>
  );
};

export default Booking;
