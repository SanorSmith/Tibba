/**
 * Client Component: LabTechDashboard
 * - Lab technician dashboard with tabs for different sections
 * - Orders, Work-list, Validation, Sample Management, etc.
 */
"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  ClipboardList,
  ListChecks,
  CheckCircle2,
  TestTube2,
  Bell,
  Users,
  Settings,
  Home,
  ScanBarcode,
  ClipboardCheck,
  FlaskConical,
  Receipt,
  PackageMinus,
  Truck,
  LayoutDashboard,
} from "lucide-react";
import OrdersTab from "./components/OrdersTab";
import RegisterSample from "./components/RegisterSample";
import WorklistsTab from "./components/WorklistsTab";
import ValidationTab from "./components/ValidationTab";
import SampleManagementTab from "./components/SampleManagementTab";
import NotificationTab from "./components/NotificationTab";
import ContactsTab from "./components/ContactsTab";
import LabManagementTab from "./components/LabManagementTab";
import QCCalibrationTab from "./components/QCCalibrationTab";
import LabDashboard from "./components/LabDashboard";
import LabInventory from "./components/LabInventory";
import PullPanel from "./components/PullPanel";
import ProcurementPanel from "./components/ProcurementPanel";
import BillingTab from "./components/BillingTab";
import { useWorkspace } from "@/hooks/use-workspace";

// Inventory and Billing touch stock and money, so — unlike the rest of this
// dashboard, which is open to any workspace member — they're restricted to
// the roles that already get equivalent access in Pharmacy/POS.
const INVENTORY_BILLING_ROLES = new Set(["lab_technician", "administrator"]);

export default function LabTechDashboard({
  workspaceid,
}: {
  workspaceid: string;
}) {
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(
    new Set(["orders"])
  );
  const { workspace } = useWorkspace();
  const canManageInventoryBilling = INVENTORY_BILLING_ROLES.has(workspace.role);

  // Fetch unread notification count
  const { data: unreadCountData } = useQuery({
    queryKey: ["unread-notification-count", workspaceid],
    queryFn: async () => {
      const response = await fetch(`/api/lims/notifications?workspaceid=${workspaceid}&unreadOnly=true&countOnly=true`);
      if (!response.ok) return { count: 0 };
      const data = await response.json();
      return { count: data.count || 0 };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unreadCount = unreadCountData?.count || 0;

  const handleTabChange = (tabValue: string) => {
    setLoadedTabs((prev) => new Set(prev).add(tabValue));
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden pt-2">
      <Tabs
        defaultValue="orders"
        className="w-full flex-1 flex flex-col min-h-0 overflow-hidden"
        onValueChange={handleTabChange}
      >
        <TabsList className="flex w-full flex-nowrap gap-1 h-auto bg-transparent p-0 overflow-x-auto flex-shrink-0">
          <TabsTrigger
            value="orders"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
          >
            <ClipboardList className="h-4 w-4" />
            Orders
          </TabsTrigger>

          <TabsTrigger
            value="accessioning"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
          >
            <ScanBarcode className="h-4 w-4" />
            Register Sample
          </TabsTrigger>

          <TabsTrigger
            value="worklist"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
          >
            <ListChecks className="h-4 w-4" />
            Work-list
          </TabsTrigger>

          <TabsTrigger
            value="validation"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
          >
            <CheckCircle2 className="h-4 w-4" />
            Validation
          </TabsTrigger>

          <TabsTrigger
            value="samplestore"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
          >
            <TestTube2 className="h-4 w-4" />
            Sample Management
          </TabsTrigger>

          <TabsTrigger
            value="qc"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
          >
            <ClipboardCheck className="h-4 w-4" />
            QC & Calibration
          </TabsTrigger>

          <TabsTrigger
            value="notification"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
          >
            <div className="flex items-center gap-1">
              <Bell className="h-4 w-4" />
              <span>Notification</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs min-w-[20px] h-5 px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </div>
          </TabsTrigger>

          <TabsTrigger
            value="contacts"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
          >
            <Users className="h-4 w-4" />
            Contacts
          </TabsTrigger>

          <TabsTrigger
            value="lab-management"
            className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
          >
            <Settings className="h-4 w-4" />
            Lab Management
          </TabsTrigger>

          {canManageInventoryBilling && (
            <TabsTrigger
              value="overview"
              className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
            >
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </TabsTrigger>
          )}

          {canManageInventoryBilling && (
            <TabsTrigger
              value="inventory"
              className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
            >
              <FlaskConical className="h-4 w-4" />
              Inventory
            </TabsTrigger>
          )}

          {canManageInventoryBilling && (
            <TabsTrigger
              value="procurement"
              className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
            >
              <Truck className="h-4 w-4" />
              Procurement
            </TabsTrigger>
          )}

          {canManageInventoryBilling && (
            <TabsTrigger
              value="pull"
              className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
            >
              <PackageMinus className="h-4 w-4" />
              Pull Items
            </TabsTrigger>
          )}

          {canManageInventoryBilling && (
            <TabsTrigger
              value="billing"
              className="rounded-md data-[state=active]:bg-orange-500 data-[state=active]:text-white bg-[#4E95D9] text-white border border-gray-300 font-semibold px-2 py-2 flex items-center gap-1 text-sm"
            >
              <Receipt className="h-4 w-4" />
              Billing &amp; POS
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="orders" className="mt-2 flex-1 min-h-0 overflow-auto">
          <OrdersTab workspaceid={workspaceid} />
        </TabsContent>

        <TabsContent value="accessioning" className="mt-2 flex-1 min-h-0 overflow-auto">
          {loadedTabs.has("accessioning") && (
            <RegisterSample workspaceid={workspaceid} />
          )}
        </TabsContent>

        <TabsContent value="worklist" className="mt-2 flex-1 min-h-0 overflow-auto">
          {loadedTabs.has("worklist") && (
            <WorklistsTab workspaceid={workspaceid} />
          )}
        </TabsContent>

        <TabsContent value="qc" className="mt-2 flex-1 min-h-0 overflow-auto">
          {loadedTabs.has("qc") && (
            <QCCalibrationTab workspaceid={workspaceid} />
          )}
        </TabsContent>

        <TabsContent value="validation" className="mt-2 flex-1 min-h-0 overflow-auto">
          {loadedTabs.has("validation") && (
            <ValidationTab workspaceid={workspaceid} />
          )}
        </TabsContent>

        <TabsContent value="samplestore" className="mt-2 flex-1 min-h-0 overflow-auto">
          {loadedTabs.has("samplestore") && (
            <SampleManagementTab workspaceid={workspaceid} />
          )}
        </TabsContent>

        <TabsContent value="notification" className="mt-2 flex-1 min-h-0 overflow-auto">
          {loadedTabs.has("notification") && (
            <NotificationTab workspaceid={workspaceid} />
          )}
        </TabsContent>

        <TabsContent value="contacts" className="mt-2 flex-1 min-h-0 overflow-auto">
          {loadedTabs.has("contacts") && (
            <ContactsTab workspaceid={workspaceid} />
          )}
        </TabsContent>

        <TabsContent value="lab-management" className="mt-2 flex-1 min-h-0 overflow-auto">
          {loadedTabs.has("lab-management") && (
            <LabManagementTab workspaceid={workspaceid} />
          )}
        </TabsContent>

        {canManageInventoryBilling && (
          <TabsContent value="overview" className="mt-2 flex-1 min-h-0 overflow-auto">
            {loadedTabs.has("overview") && <LabDashboard workspaceid={workspaceid} />}
          </TabsContent>
        )}

        {canManageInventoryBilling && (
          <TabsContent value="inventory" className="mt-2 flex-1 min-h-0 overflow-auto">
            {loadedTabs.has("inventory") && <LabInventory workspaceid={workspaceid} />}
          </TabsContent>
        )}

        {canManageInventoryBilling && (
          <TabsContent value="procurement" className="mt-2 flex-1 min-h-0 overflow-auto">
            {loadedTabs.has("procurement") && <ProcurementPanel workspaceid={workspaceid} />}
          </TabsContent>
        )}

        {canManageInventoryBilling && (
          <TabsContent value="pull" className="mt-2 flex-1 min-h-0 overflow-auto">
            {loadedTabs.has("pull") && <PullPanel workspaceid={workspaceid} />}
          </TabsContent>
        )}

        {canManageInventoryBilling && (
          <TabsContent value="billing" className="mt-2 flex-1 min-h-0 overflow-auto">
            {loadedTabs.has("billing") && <BillingTab workspaceid={workspaceid} />}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
