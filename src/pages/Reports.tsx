import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useDashboard } from '../contexts/DashboardContext';
import { subDays, format, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from 'date-fns';
import { Loader2, BarChart3, TrendingUp, ShoppingBag, Scissors } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ReportData {
  daily_revenue: { date: string; total: number }[];
  top_items: { name: string; total: number }[];
  total_revenue: number;
  total_count: number;
}

const Reports: React.FC = () => {
  const { barbershop } = useDashboard();
  const [salesReport, setSalesReport] = useState<ReportData | null>(null);
  const [servicesReport, setServicesReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    const fetchReports = async () => {
      if (!barbershop?.id) return;
      setLoading(true);

      const [salesRes, servicesRes] = await Promise.all([
        supabase.rpc('get_sales_report', {
          p_barbershop_id: barbershop.id,
          p_start_date: dateRange.from,
          p_end_date: dateRange.to,
        }),
        supabase.rpc('get_services_report', {
          p_barbershop_id: barbershop.id,
          p_start_date: dateRange.from,
          p_end_date: dateRange.to,
        })
      ]);

      if (salesRes.error) console.error("Error fetching sales report:", salesRes.error);
      else setSalesReport(salesRes.data);
      
      if (servicesRes.error) console.error("Error fetching services report:", servicesRes.error);
      else setServicesReport(servicesRes.data);

      setLoading(false);
    };

    fetchReports();
  }, [barbershop?.id, dateRange]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  
  const setDatePreset = (preset: 'last7' | 'last30' | 'thisMonth' | 'thisYear') => {
    const today = new Date();
    let fromDate: Date;
    let toDate: Date = today;

    switch(preset) {
        case 'last7': fromDate = subDays(today, 7); break;
        case 'last30': fromDate = subDays(today, 30); break;
        case 'thisMonth': fromDate = startOfMonth(today); toDate = endOfMonth(today); break;
        case 'thisYear': fromDate = startOfYear(today); toDate = endOfYear(today); break;
    }
    setDateRange({ from: format(fromDate, 'yyyy-MM-dd'), to: format(toDate, 'yyyy-MM-dd') });
  }

  const formatCurrency = (value: number) => `R$ ${(value / 100).toFixed(2)}`;
  const formatDate = (tickItem: string) => format(parseISO(tickItem), 'dd/MM');

  const renderReportSection = (title: string, data: ReportData | null, icon: React.ReactNode, colorClass: string) => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className={`text-xl font-bold flex items-center mb-4 ${colorClass}`}>{icon} {title}</h3>
      {loading ? <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8" /></div> : !data ? <p>Erro ao carregar dados.</p> : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6 text-center">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Faturamento Total</p>
              <p className="text-2xl font-bold">{formatCurrency(data.total_revenue)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Total de Itens</p>
              <p className="text-2xl font-bold">{data.total_count}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <h4 className="font-semibold mb-2">Faturamento por Dia</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.daily_revenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDate} />
                  <YAxis tickFormatter={(val) => formatCurrency(val)} />
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Legend />
                  <Line type="monotone" dataKey="total" name="Faturamento" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Top 5 Itens</h4>
              <div className="space-y-2">
                {data.top_items.map((item, index) => (
                  <div key={index} className="bg-gray-50 p-2 rounded-md text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium truncate pr-2">{item.name}</span>
                      <span className="font-bold">{formatCurrency(item.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold flex items-center"><BarChart3 className="w-6 h-6 mr-2"/> Relatórios</h2>
        <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setDatePreset('last7')} className="text-xs px-3 py-1 bg-gray-200 rounded-full hover:bg-gray-300">7 Dias</button>
            <button onClick={() => setDatePreset('last30')} className="text-xs px-3 py-1 bg-gray-200 rounded-full hover:bg-gray-300">30 Dias</button>
            <button onClick={() => setDatePreset('thisMonth')} className="text-xs px-3 py-1 bg-gray-200 rounded-full hover:bg-gray-300">Este Mês</button>
            <button onClick={() => setDatePreset('thisYear')} className="text-xs px-3 py-1 bg-gray-200 rounded-full hover:bg-gray-300">Este Ano</button>
            <input type="date" name="from" value={dateRange.from} onChange={handleDateChange} className="text-sm p-1 border rounded-md"/>
            <span className="text-sm">até</span>
            <input type="date" name="to" value={dateRange.to} onChange={handleDateChange} className="text-sm p-1 border rounded-md"/>
        </div>
      </div>
      
      {renderReportSection("Relatório de Serviços", servicesReport, <Scissors className="w-5 h-5 mr-2"/>, "text-blue-600")}
      {renderReportSection("Relatório de Vendas de Produtos", salesReport, <ShoppingBag className="w-5 h-5 mr-2"/>, "text-green-600")}
    </div>
  );
};

export default Reports;
