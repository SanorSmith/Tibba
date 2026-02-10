'use client';

import patientsJson from '@/data/finance/patients.json';
import insuranceJson from '@/data/finance/insurance.json';
import stakeholdersJson from '@/data/finance/stakeholders.json';
import invoicesJson from '@/data/finance/invoices.json';
import suppliersJson from '@/data/finance/suppliers.json';
import purchasesJson from '@/data/finance/purchases.json';
import inventoryJson from '@/data/finance/inventory.json';
import accountingJson from '@/data/finance/accounting.json';

import type {
  FinancePatient,
  InsuranceProvider,
  PatientInsurance,
  Stakeholder,
  MedicalService,
  ServiceShareTemplate,
  MedicalInvoice,
  InvoiceItem,
  InvoiceShare,
  InvoiceReturn,
  ReturnItem,
  Supplier,
  PurchaseRequest,
  PRItem,
  PRApproval,
  PurchaseOrder,
  POItem,
  Warehouse,
  InventoryItem,
  Stock,
  StockMovement,
  ChartOfAccount,
  CostCenter,
  JournalEntry,
  JournalEntryLine,
  FinanceDataStore,
} from '@/types/finance';

// =============================================================================
// FINANCE DATA STORE CLASS
// =============================================================================

class FinanceStore {
  private STORAGE_KEY = 'tibbna_finance_data';

  initialize(): void {
    if (typeof window === 'undefined') return;
    const existing = localStorage.getItem(this.STORAGE_KEY);
    if (!existing) {
      const initial: FinanceDataStore = {
        patients: patientsJson.patients as unknown as FinancePatient[],
        insurance_providers: insuranceJson.insurance_providers as unknown as InsuranceProvider[],
        patient_insurances: insuranceJson.patient_insurances as unknown as PatientInsurance[],
        stakeholders: stakeholdersJson.stakeholders as unknown as Stakeholder[],
        medical_services: stakeholdersJson.medical_services as unknown as MedicalService[],
        service_share_templates: stakeholdersJson.service_share_templates as unknown as ServiceShareTemplate[],
        invoices: invoicesJson.invoices as unknown as MedicalInvoice[],
        invoice_items: invoicesJson.invoice_items as unknown as InvoiceItem[],
        invoice_shares: invoicesJson.invoice_shares as unknown as InvoiceShare[],
        returns: invoicesJson.returns as unknown as InvoiceReturn[],
        return_items: invoicesJson.return_items as unknown as ReturnItem[],
        suppliers: suppliersJson.suppliers as unknown as Supplier[],
        purchase_requests: purchasesJson.purchase_requests as unknown as PurchaseRequest[],
        pr_items: purchasesJson.pr_items as unknown as PRItem[],
        pr_approvals: purchasesJson.pr_approvals as unknown as PRApproval[],
        purchase_orders: purchasesJson.purchase_orders as unknown as PurchaseOrder[],
        po_items: purchasesJson.po_items as unknown as POItem[],
        warehouses: inventoryJson.warehouses as unknown as Warehouse[],
        inventory_items: inventoryJson.inventory_items as unknown as InventoryItem[],
        stock: inventoryJson.stock as unknown as Stock[],
        stock_movements: inventoryJson.stock_movements as unknown as StockMovement[],
        chart_of_accounts: accountingJson.chart_of_accounts as unknown as ChartOfAccount[],
        cost_centers: accountingJson.cost_centers as unknown as CostCenter[],
        journal_entries: accountingJson.journal_entries as unknown as JournalEntry[],
        journal_entry_lines: accountingJson.journal_entry_lines as unknown as JournalEntryLine[],
        version: 1,
        lastUpdated: new Date().toISOString(),
      };
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(initial));
      } catch (err) {
        console.error('Failed to initialize finance store:', err);
      }
    }
  }

  // ===========================================================================
  // GENERIC HELPERS
  // ===========================================================================

  private getData(): FinanceDataStore | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  private saveData(data: FinanceDataStore): boolean {
    try {
      data.lastUpdated = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch { return false; }
  }

  private updateSection<K extends keyof FinanceDataStore>(section: K, value: FinanceDataStore[K]): boolean {
    const store = this.getData();
    if (!store) return false;
    store[section] = value;
    return this.saveData(store);
  }

  // ===========================================================================
  // PATIENTS
  // ===========================================================================

  getPatients(): FinancePatient[] {
    return this.getData()?.patients ?? (patientsJson.patients as unknown as FinancePatient[]);
  }
  getPatient(id: string): FinancePatient | undefined {
    return this.getPatients().find(p => p.patient_id === id);
  }
  addPatient(p: FinancePatient): boolean {
    const list = [...this.getPatients(), p];
    return this.updateSection('patients', list);
  }
  updatePatient(id: string, updates: Partial<FinancePatient>): boolean {
    const list = this.getPatients();
    const idx = list.findIndex(p => p.patient_id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...updates };
    return this.updateSection('patients', list);
  }
  deletePatient(id: string): boolean {
    return this.updateSection('patients', this.getPatients().filter(p => p.patient_id !== id));
  }

  // ===========================================================================
  // INSURANCE PROVIDERS
  // ===========================================================================

  getInsuranceProviders(): InsuranceProvider[] {
    return this.getData()?.insurance_providers ?? (insuranceJson.insurance_providers as unknown as InsuranceProvider[]);
  }
  getInsuranceProvider(id: string): InsuranceProvider | undefined {
    return this.getInsuranceProviders().find(p => p.provider_id === id);
  }
  addInsuranceProvider(p: InsuranceProvider): boolean {
    return this.updateSection('insurance_providers', [...this.getInsuranceProviders(), p]);
  }
  updateInsuranceProvider(id: string, updates: Partial<InsuranceProvider>): boolean {
    const list = this.getInsuranceProviders();
    const idx = list.findIndex(p => p.provider_id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...updates };
    return this.updateSection('insurance_providers', list);
  }
  deleteInsuranceProvider(id: string): boolean {
    return this.updateSection('insurance_providers', this.getInsuranceProviders().filter(p => p.provider_id !== id));
  }

  // ===========================================================================
  // PATIENT INSURANCES
  // ===========================================================================

  getPatientInsurances(): PatientInsurance[] {
    return this.getData()?.patient_insurances ?? (insuranceJson.patient_insurances as unknown as PatientInsurance[]);
  }
  getPatientInsurancesByPatient(patientId: string): PatientInsurance[] {
    return this.getPatientInsurances().filter(pi => pi.patient_id === patientId);
  }
  addPatientInsurance(pi: PatientInsurance): boolean {
    return this.updateSection('patient_insurances', [...this.getPatientInsurances(), pi]);
  }
  updatePatientInsurance(id: string, updates: Partial<PatientInsurance>): boolean {
    const list = this.getPatientInsurances();
    const idx = list.findIndex(pi => pi.insurance_id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...updates };
    return this.updateSection('patient_insurances', list);
  }
  deletePatientInsurance(id: string): boolean {
    return this.updateSection('patient_insurances', this.getPatientInsurances().filter(pi => pi.insurance_id !== id));
  }

  // ===========================================================================
  // STAKEHOLDERS
  // ===========================================================================

  getStakeholders(): Stakeholder[] {
    return this.getData()?.stakeholders ?? (stakeholdersJson.stakeholders as unknown as Stakeholder[]);
  }
  getStakeholder(id: string): Stakeholder | undefined {
    return this.getStakeholders().find(s => s.stakeholder_id === id);
  }
  addStakeholder(s: Stakeholder): boolean {
    return this.updateSection('stakeholders', [...this.getStakeholders(), s]);
  }
  updateStakeholder(id: string, updates: Partial<Stakeholder>): boolean {
    const list = this.getStakeholders();
    const idx = list.findIndex(s => s.stakeholder_id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...updates };
    return this.updateSection('stakeholders', list);
  }
  deleteStakeholder(id: string): boolean {
    return this.updateSection('stakeholders', this.getStakeholders().filter(s => s.stakeholder_id !== id));
  }

  // ===========================================================================
  // MEDICAL SERVICES
  // ===========================================================================

  getMedicalServices(): MedicalService[] {
    return this.getData()?.medical_services ?? (stakeholdersJson.medical_services as unknown as MedicalService[]);
  }
  getMedicalService(id: string): MedicalService | undefined {
    return this.getMedicalServices().find(s => s.service_id === id);
  }
  addMedicalService(s: MedicalService): boolean {
    return this.updateSection('medical_services', [...this.getMedicalServices(), s]);
  }
  updateMedicalService(id: string, updates: Partial<MedicalService>): boolean {
    const list = this.getMedicalServices();
    const idx = list.findIndex(s => s.service_id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...updates };
    return this.updateSection('medical_services', list);
  }
  deleteMedicalService(id: string): boolean {
    return this.updateSection('medical_services', this.getMedicalServices().filter(s => s.service_id !== id));
  }

  // ===========================================================================
  // SERVICE SHARE TEMPLATES
  // ===========================================================================

  getServiceShareTemplates(): ServiceShareTemplate[] {
    return this.getData()?.service_share_templates ?? (stakeholdersJson.service_share_templates as unknown as ServiceShareTemplate[]);
  }
  getTemplatesByService(serviceId: string): ServiceShareTemplate[] {
    return this.getServiceShareTemplates().filter(t => t.service_id === serviceId);
  }
  addServiceShareTemplate(t: ServiceShareTemplate): boolean {
    return this.updateSection('service_share_templates', [...this.getServiceShareTemplates(), t]);
  }
  deleteServiceShareTemplate(id: string): boolean {
    return this.updateSection('service_share_templates', this.getServiceShareTemplates().filter(t => t.template_id !== id));
  }

  // ===========================================================================
  // INVOICES
  // ===========================================================================

  getInvoices(): MedicalInvoice[] {
    return this.getData()?.invoices ?? (invoicesJson.invoices as unknown as MedicalInvoice[]);
  }
  getInvoice(id: string): MedicalInvoice | undefined {
    return this.getInvoices().find(i => i.invoice_id === id);
  }
  getInvoicesByPatient(patientId: string): MedicalInvoice[] {
    return this.getInvoices().filter(i => i.patient_id === patientId);
  }
  addInvoice(inv: MedicalInvoice): boolean {
    return this.updateSection('invoices', [...this.getInvoices(), inv]);
  }
  updateInvoice(id: string, updates: Partial<MedicalInvoice>): boolean {
    const list = this.getInvoices();
    const idx = list.findIndex(i => i.invoice_id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...updates };
    return this.updateSection('invoices', list);
  }
  deleteInvoice(id: string): boolean {
    return this.updateSection('invoices', this.getInvoices().filter(i => i.invoice_id !== id));
  }

  // ===========================================================================
  // INVOICE ITEMS
  // ===========================================================================

  getInvoiceItems(): InvoiceItem[] {
    return this.getData()?.invoice_items ?? (invoicesJson.invoice_items as unknown as InvoiceItem[]);
  }
  getItemsByInvoice(invoiceId: string): InvoiceItem[] {
    return this.getInvoiceItems().filter(i => i.invoice_id === invoiceId);
  }
  addInvoiceItem(item: InvoiceItem): boolean {
    return this.updateSection('invoice_items', [...this.getInvoiceItems(), item]);
  }
  addInvoiceItems(items: InvoiceItem[]): boolean {
    return this.updateSection('invoice_items', [...this.getInvoiceItems(), ...items]);
  }
  deleteInvoiceItemsByInvoice(invoiceId: string): boolean {
    return this.updateSection('invoice_items', this.getInvoiceItems().filter(i => i.invoice_id !== invoiceId));
  }

  // ===========================================================================
  // INVOICE SHARES
  // ===========================================================================

  getInvoiceShares(): InvoiceShare[] {
    return this.getData()?.invoice_shares ?? (invoicesJson.invoice_shares as unknown as InvoiceShare[]);
  }
  getSharesByInvoice(invoiceId: string): InvoiceShare[] {
    return this.getInvoiceShares().filter(s => s.invoice_id === invoiceId);
  }
  getSharesByStakeholder(stakeholderId: string): InvoiceShare[] {
    return this.getInvoiceShares().filter(s => s.stakeholder_id === stakeholderId);
  }
  addInvoiceShares(shares: InvoiceShare[]): boolean {
    return this.updateSection('invoice_shares', [...this.getInvoiceShares(), ...shares]);
  }
  updateInvoiceShare(id: string, updates: Partial<InvoiceShare>): boolean {
    const list = this.getInvoiceShares();
    const idx = list.findIndex(s => s.share_id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...updates };
    return this.updateSection('invoice_shares', list);
  }

  // ===========================================================================
  // RETURNS
  // ===========================================================================

  getReturns(): InvoiceReturn[] {
    return this.getData()?.returns ?? (invoicesJson.returns as unknown as InvoiceReturn[]);
  }
  getReturn(id: string): InvoiceReturn | undefined {
    return this.getReturns().find(r => r.return_id === id);
  }
  addReturn(r: InvoiceReturn): boolean {
    return this.updateSection('returns', [...this.getReturns(), r]);
  }
  updateReturn(id: string, updates: Partial<InvoiceReturn>): boolean {
    const list = this.getReturns();
    const idx = list.findIndex(r => r.return_id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...updates };
    return this.updateSection('returns', list);
  }

  getReturnItems(): ReturnItem[] {
    return this.getData()?.return_items ?? (invoicesJson.return_items as unknown as ReturnItem[]);
  }
  getReturnItemsByReturn(returnId: string): ReturnItem[] {
    return this.getReturnItems().filter(ri => ri.return_id === returnId);
  }
  addReturnItems(items: ReturnItem[]): boolean {
    return this.updateSection('return_items', [...this.getReturnItems(), ...items]);
  }

  // ===========================================================================
  // SUPPLIERS
  // ===========================================================================

  getSuppliers(): Supplier[] {
    return this.getData()?.suppliers ?? (suppliersJson.suppliers as unknown as Supplier[]);
  }
  getSupplier(id: string): Supplier | undefined {
    return this.getSuppliers().find(s => s.supplier_id === id);
  }
  addSupplier(s: Supplier): boolean {
    return this.updateSection('suppliers', [...this.getSuppliers(), s]);
  }
  updateSupplier(id: string, updates: Partial<Supplier>): boolean {
    const list = this.getSuppliers();
    const idx = list.findIndex(s => s.supplier_id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...updates };
    return this.updateSection('suppliers', list);
  }
  deleteSupplier(id: string): boolean {
    return this.updateSection('suppliers', this.getSuppliers().filter(s => s.supplier_id !== id));
  }

  // ===========================================================================
  // PURCHASE REQUESTS
  // ===========================================================================

  getPurchaseRequests(): PurchaseRequest[] {
    return this.getData()?.purchase_requests ?? (purchasesJson.purchase_requests as unknown as PurchaseRequest[]);
  }
  getPurchaseRequest(id: string): PurchaseRequest | undefined {
    return this.getPurchaseRequests().find(pr => pr.pr_id === id);
  }
  addPurchaseRequest(pr: PurchaseRequest): boolean {
    return this.updateSection('purchase_requests', [...this.getPurchaseRequests(), pr]);
  }
  updatePurchaseRequest(id: string, updates: Partial<PurchaseRequest>): boolean {
    const list = this.getPurchaseRequests();
    const idx = list.findIndex(pr => pr.pr_id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...updates };
    return this.updateSection('purchase_requests', list);
  }
  deletePurchaseRequest(id: string): boolean {
    return this.updateSection('purchase_requests', this.getPurchaseRequests().filter(pr => pr.pr_id !== id));
  }

  getPRItems(): PRItem[] {
    return this.getData()?.pr_items ?? (purchasesJson.pr_items as unknown as PRItem[]);
  }
  getPRItemsByPR(prId: string): PRItem[] {
    return this.getPRItems().filter(i => i.pr_id === prId);
  }
  addPRItems(items: PRItem[]): boolean {
    return this.updateSection('pr_items', [...this.getPRItems(), ...items]);
  }

  getPRApprovals(): PRApproval[] {
    return this.getData()?.pr_approvals ?? (purchasesJson.pr_approvals as unknown as PRApproval[]);
  }
  addPRApproval(a: PRApproval): boolean {
    return this.updateSection('pr_approvals', [...this.getPRApprovals(), a]);
  }

  // ===========================================================================
  // PURCHASE ORDERS
  // ===========================================================================

  getPurchaseOrders(): PurchaseOrder[] {
    return this.getData()?.purchase_orders ?? (purchasesJson.purchase_orders as unknown as PurchaseOrder[]);
  }
  getPurchaseOrder(id: string): PurchaseOrder | undefined {
    return this.getPurchaseOrders().find(po => po.po_id === id);
  }
  addPurchaseOrder(po: PurchaseOrder): boolean {
    return this.updateSection('purchase_orders', [...this.getPurchaseOrders(), po]);
  }
  updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>): boolean {
    const list = this.getPurchaseOrders();
    const idx = list.findIndex(po => po.po_id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...updates };
    return this.updateSection('purchase_orders', list);
  }
  deletePurchaseOrder(id: string): boolean {
    return this.updateSection('purchase_orders', this.getPurchaseOrders().filter(po => po.po_id !== id));
  }

  getPOItems(): POItem[] {
    return this.getData()?.po_items ?? (purchasesJson.po_items as unknown as POItem[]);
  }
  getPOItemsByPO(poId: string): POItem[] {
    return this.getPOItems().filter(i => i.po_id === poId);
  }
  addPOItems(items: POItem[]): boolean {
    return this.updateSection('po_items', [...this.getPOItems(), ...items]);
  }

  // ===========================================================================
  // WAREHOUSES
  // ===========================================================================

  getWarehouses(): Warehouse[] {
    return this.getData()?.warehouses ?? (inventoryJson.warehouses as unknown as Warehouse[]);
  }
  getWarehouse(id: string): Warehouse | undefined {
    return this.getWarehouses().find(w => w.warehouse_id === id);
  }
  addWarehouse(w: Warehouse): boolean {
    return this.updateSection('warehouses', [...this.getWarehouses(), w]);
  }
  updateWarehouse(id: string, updates: Partial<Warehouse>): boolean {
    const list = this.getWarehouses();
    const idx = list.findIndex(w => w.warehouse_id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...updates };
    return this.updateSection('warehouses', list);
  }

  // ===========================================================================
  // INVENTORY ITEMS
  // ===========================================================================

  getInventoryItems(): InventoryItem[] {
    return this.getData()?.inventory_items ?? (inventoryJson.inventory_items as unknown as InventoryItem[]);
  }
  getInventoryItem(id: string): InventoryItem | undefined {
    return this.getInventoryItems().find(i => i.item_id === id);
  }
  addInventoryItem(item: InventoryItem): boolean {
    return this.updateSection('inventory_items', [...this.getInventoryItems(), item]);
  }
  updateInventoryItem(id: string, updates: Partial<InventoryItem>): boolean {
    const list = this.getInventoryItems();
    const idx = list.findIndex(i => i.item_id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...updates };
    return this.updateSection('inventory_items', list);
  }

  // ===========================================================================
  // STOCK
  // ===========================================================================

  getStock(): Stock[] {
    return this.getData()?.stock ?? (inventoryJson.stock as unknown as Stock[]);
  }
  getStockByWarehouse(warehouseId: string): Stock[] {
    return this.getStock().filter(s => s.warehouse_id === warehouseId);
  }
  getStockByItem(itemId: string): Stock[] {
    return this.getStock().filter(s => s.item_id === itemId);
  }
  updateStock(id: string, updates: Partial<Stock>): boolean {
    const list = this.getStock();
    const idx = list.findIndex(s => s.stock_id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...updates };
    return this.updateSection('stock', list);
  }
  addStock(s: Stock): boolean {
    return this.updateSection('stock', [...this.getStock(), s]);
  }

  // ===========================================================================
  // STOCK MOVEMENTS
  // ===========================================================================

  getStockMovements(): StockMovement[] {
    return this.getData()?.stock_movements ?? (inventoryJson.stock_movements as unknown as StockMovement[]);
  }
  addStockMovement(m: StockMovement): boolean {
    return this.updateSection('stock_movements', [...this.getStockMovements(), m]);
  }

  // ===========================================================================
  // CHART OF ACCOUNTS
  // ===========================================================================

  getChartOfAccounts(): ChartOfAccount[] {
    return this.getData()?.chart_of_accounts ?? (accountingJson.chart_of_accounts as unknown as ChartOfAccount[]);
  }
  getAccount(id: string): ChartOfAccount | undefined {
    return this.getChartOfAccounts().find(a => a.account_id === id);
  }
  addAccount(a: ChartOfAccount): boolean {
    return this.updateSection('chart_of_accounts', [...this.getChartOfAccounts(), a]);
  }
  updateAccount(id: string, updates: Partial<ChartOfAccount>): boolean {
    const list = this.getChartOfAccounts();
    const idx = list.findIndex(a => a.account_id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...updates };
    return this.updateSection('chart_of_accounts', list);
  }

  // ===========================================================================
  // COST CENTERS
  // ===========================================================================

  getCostCenters(): CostCenter[] {
    return this.getData()?.cost_centers ?? (accountingJson.cost_centers as unknown as CostCenter[]);
  }
  getCostCenter(id: string): CostCenter | undefined {
    return this.getCostCenters().find(c => c.cost_center_id === id);
  }
  addCostCenter(c: CostCenter): boolean {
    return this.updateSection('cost_centers', [...this.getCostCenters(), c]);
  }
  updateCostCenter(id: string, updates: Partial<CostCenter>): boolean {
    const list = this.getCostCenters();
    const idx = list.findIndex(c => c.cost_center_id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...updates };
    return this.updateSection('cost_centers', list);
  }

  // ===========================================================================
  // JOURNAL ENTRIES
  // ===========================================================================

  getJournalEntries(): JournalEntry[] {
    return this.getData()?.journal_entries ?? (accountingJson.journal_entries as unknown as JournalEntry[]);
  }
  getJournalEntry(id: string): JournalEntry | undefined {
    return this.getJournalEntries().find(je => je.entry_id === id);
  }
  addJournalEntry(je: JournalEntry): boolean {
    return this.updateSection('journal_entries', [...this.getJournalEntries(), je]);
  }
  updateJournalEntry(id: string, updates: Partial<JournalEntry>): boolean {
    const list = this.getJournalEntries();
    const idx = list.findIndex(je => je.entry_id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...updates };
    return this.updateSection('journal_entries', list);
  }

  getJournalEntryLines(): JournalEntryLine[] {
    return this.getData()?.journal_entry_lines ?? (accountingJson.journal_entry_lines as unknown as JournalEntryLine[]);
  }
  getLinesByEntry(entryId: string): JournalEntryLine[] {
    return this.getJournalEntryLines().filter(l => l.entry_id === entryId);
  }
  addJournalEntryLines(lines: JournalEntryLine[]): boolean {
    return this.updateSection('journal_entry_lines', [...this.getJournalEntryLines(), ...lines]);
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const financeStore = new FinanceStore();
