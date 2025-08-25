import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase, Barbershop, Service, StaffMember, Appointment, Client, Product } from '../lib/supabase';

type AddedProduct = { product: Product; quantity: number };
type AppointmentModalData = Appointment | Partial<Appointment> | null;
type ClientModalData = Partial<Client> | null;
type ClientDetailModalData = Client | null;
type SaleModalData = { client?: Client } | null;
type AlertModalContent = { title: string; message: string };

interface DashboardContextType {
  barbershop: Barbershop | null;
  services: Service[];
  staff: StaffMember[];
  products: Product[];
  clients: Client[];
  loading: boolean;
  refetchData: () => void;
  
  isAppointmentModalOpen: boolean;
  appointmentModalData: AppointmentModalData;
  openAppointmentModal: (data?: AppointmentModalData) => void;
  closeAppointmentModal: () => void;

  isClientModalOpen: boolean;
  clientModalData: ClientModalData;
  openClientModal: (data: ClientModalData) => void;
  closeClientModal: () => void;

  isClientDetailModalOpen: boolean;
  clientDetailModalData: ClientDetailModalData;
  openClientDetailModal: (data: ClientDetailModalData) => void;
  closeClientDetailModal: () => void;

  isSaleModalOpen: boolean;
  saleModalData: SaleModalData;
  openSaleModal: (data?: SaleModalData) => void;
  closeSaleModal: () => void;

  isProductSelectionModalOpen: boolean;
  openProductSelectionModal: () => void;
  closeProductSelectionModal: () => void;

  isAlertModalOpen: boolean;
  alertModalContent: AlertModalContent;
  openAlertModal: (content: AlertModalContent) => void;
  closeAlertModal: () => void;

  // Sale Form State
  saleItems: AddedProduct[];
  handleSelectProductForSale: (product: Product) => void;
  handleRemoveProductFromSale: (productId: string) => void;
  handleSaleItemQuantityChange: (productId: string, quantity: number) => void;
  resetSaleItems: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [appointmentModalData, setAppointmentModalData] = useState<AppointmentModalData>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientModalData, setClientModalData] = useState<ClientModalData>(null);
  const [isClientDetailModalOpen, setIsClientDetailModalOpen] = useState(false);
  const [clientDetailModalData, setClientDetailModalData] = useState<ClientDetailModalData>(null);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [saleModalData, setSaleModalData] = useState<SaleModalData>(null);
  const [isProductSelectionModalOpen, setIsProductSelectionModalOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertModalContent, setAlertModalContent] = useState<AlertModalContent>({ title: '', message: '' });

  // Sale Form State
  const [saleItems, setSaleItems] = useState<AddedProduct[]>([]);

  const openAlertModal = (content: AlertModalContent) => {
    setAlertModalContent(content);
    setIsAlertModalOpen(true);
  };

  const handleSelectProductForSale = (product: Product) => {
    setSaleItems(prev => {
      const existing = prev.find(p => p.product.id === product.id);
      if (existing) {
        return prev.map(p => p.product.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { product: product, quantity: 1 }];
    });
  };

  const handleRemoveProductFromSale = (productId: string) => {
    setSaleItems(prev => prev.filter(p => p.product.id !== productId));
  };

  const handleSaleItemQuantityChange = (productId: string, newQuantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (newQuantity > product.stock_quantity) {
      openAlertModal({
        title: "Estoque Insuficiente",
        message: `Apenas ${product.stock_quantity} unidades de "${product.name}" estão disponíveis em estoque.`,
      });
      setSaleItems(prev => prev.map(p => p.product.id === productId ? { ...p, quantity: product.stock_quantity } : p));
      return;
    }

    if (newQuantity < 1) {
      handleRemoveProductFromSale(productId);
      return;
    }
    setSaleItems(prev => prev.map(p => p.product.id === productId ? { ...p, quantity: newQuantity } : p));
  };

  const resetSaleItems = () => setSaleItems([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: barbershopData, error: barbershopError } = await supabase
        .from('barbershops')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      
      if (barbershopError) {
        console.error("Error fetching barbershop:", barbershopError);
        throw barbershopError;
      }

      setBarbershop(barbershopData);

      if (barbershopData) {
        const [servicesRes, staffRes, productsRes, clientsRes] = await Promise.all([
          supabase.from('services').select('*').eq('barbershop_id', barbershopData.id).order('name', { ascending: true }),
          supabase.from('staff_members').select('*').eq('barbershop_id', barbershopData.id).order('name', { ascending: true }),
          supabase.from('products').select('*').eq('barbershop_id', barbershopData.id).order('name', { ascending: true }),
          supabase.from('clients').select('*').eq('barbershop_id', barbershopData.id).order('name', { ascending: true })
        ]);

        if (servicesRes.error) throw servicesRes.error;
        setServices(servicesRes.data || []);

        if (staffRes.error) throw staffRes.error;
        setStaff(staffRes.data || []);

        if (productsRes.error) throw productsRes.error;
        setProducts(productsRes.data || []);

        if (clientsRes.error) throw clientsRes.error;
        setClients(clientsRes.data || []);
      } else {
        // Se não há barbearia, limpar os dados
        setServices([]);
        setStaff([]);
        setProducts([]);
        setClients([]);
        console.warn("No barbershop found for user:", user.id);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Limpar dados em caso de erro
      setBarbershop(null);
      setServices([]);
      setStaff([]);
      setProducts([]);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const value = {
    barbershop,
    services,
    staff,
    products,
    clients,
    loading,
    refetchData: fetchData,
    
    isAppointmentModalOpen,
    appointmentModalData,
    openAppointmentModal: (data: AppointmentModalData = null) => { setAppointmentModalData(data); setIsAppointmentModalOpen(true); },
    closeAppointmentModal: () => setIsAppointmentModalOpen(false),

    isClientModalOpen,
    clientModalData,
    openClientModal: (data: ClientModalData) => { setClientModalData(data); setIsClientModalOpen(true); },
    closeClientModal: () => setIsClientModalOpen(false),

    isClientDetailModalOpen,
    clientDetailModalData,
    openClientDetailModal: (data: ClientDetailModalData) => { setClientDetailModalData(data); setIsClientDetailModalOpen(true); },
    closeClientDetailModal: () => setIsClientDetailModalOpen(false),

    isSaleModalOpen,
    saleModalData,
    openSaleModal: (data: SaleModalData = null) => { 
      resetSaleItems();
      setSaleModalData(data); 
      setIsSaleModalOpen(true); 
    },
    closeSaleModal: () => setIsSaleModalOpen(false),

    isProductSelectionModalOpen,
    openProductSelectionModal: () => setIsProductSelectionModalOpen(true),
    closeProductSelectionModal: () => setIsProductSelectionModalOpen(false),

    isAlertModalOpen,
    alertModalContent,
    openAlertModal,
    closeAlertModal: () => setIsAlertModalOpen(false),

    saleItems,
    handleSelectProductForSale,
    handleRemoveProductFromSale,
    handleSaleItemQuantityChange,
    resetSaleItems,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
