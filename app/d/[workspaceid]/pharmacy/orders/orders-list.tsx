"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import OrderDetailsModal from "./components/OrderDetailsModal";
import CreateOrderModal from "./components/CreateOrderModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pill,
  Search,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  XCircle,
  PauseCircle,
  RefreshCw,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type Order = {
  orderid: string;
  patientid: string | null;
  status: string;
  source: string;
  priority: string;
  notes: string | null;
  openehrorderid: string | null;
  createdat: string;
  updatedat: string;
  patientfirst: string | null;
  patientlast: string | null;
  prescriberid: string | null;
  prescribername: string | null;
  items: { drugid?: string; drugname: string; quantity: number; unitprice: string | null; dosage?: string; quantitydispensed?: number }[];
  totalAmount: number;
  paymentStatus: string;
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  PENDING: { label: "Pending", variant: "secondary", icon: Clock },
  IN_PROGRESS: { label: "In Progress", variant: "default", icon: Package },
  DISPENSED: { label: "Dispensed", variant: "outline", icon: CheckCircle2 },
  PARTIALLY_DISPENSED: { label: "Partial", variant: "secondary", icon: AlertCircle },
  CANCELLED: { label: "Cancelled", variant: "destructive", icon: XCircle },
  ON_HOLD: { label: "On Hold", variant: "secondary", icon: PauseCircle },
};

const PRIORITY_COLORS: Record<string, string> = {
  routine: "bg-gray-100 text-gray-700",
  urgent: "bg-orange-100 text-orange-700",
  stat: "bg-red-100 text-red-700 font-semibold",
};

export default function PharmacyOrdersPage({
  workspaceid,
  userName,
  userId,
  orderidFromUrl,
}: {
  workspaceid: string;
  userName: string;
  userId: string;
  orderidFromUrl?: string | null;
}) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editOrderData, setEditOrderData] = useState<any>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Handle orderid from URL (e.g., from reminder link)
  useEffect(() => {
    if (orderidFromUrl) {
      const editMode = searchParams.get("edit") === "true";
      if (editMode) {
        // Open CreateOrderModal in edit mode
        fetch(`/api/d/${workspaceid}/pharmacy-orders/${orderidFromUrl}`)
          .then(r => r.json())
          .then(data => {
            // Merge order, patient, and items into the format CreateOrderModal expects
            const mergedOrder = {
              ...data.order,
              patientid: data.patient?.patientid || null,
              patientfirst: data.patient?.firstname || null,
              patientlast: data.patient?.lastname || null,
              middlename: data.patient?.middlename || null,
              phone: data.patient?.phone || null,
              email: data.patient?.email || null,
              address: data.patient?.address || null,
              gender: data.patient?.gender || null,
              dateofbirth: data.patient?.dateofbirth || null,
              nationalid: data.patient?.nationalid || null,
              items: data.items || [],
            };
            setEditOrderData(mergedOrder);
            setIsCreateModalOpen(true);
          })
          .catch(() => {
            setSelectedOrder(orderidFromUrl);
            setIsModalOpen(true);
          });
      } else {
        // Open OrderDetailsModal
        setSelectedOrder(orderidFromUrl);
        setIsModalOpen(true);
      }
    }
  }, [orderidFromUrl, searchParams, workspaceid]);

  // Fetch order counts on mount (lightweight)
  const { data: countsData } = useQuery({
    queryKey: ["pharmacy-orders-counts", workspaceid],
    queryFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-orders/counts`);
      if (!res.ok) throw new Error("Failed to fetch counts");
      const data = await res.json();
      return data.counts || { all: 0, PENDING: 0, IN_PROGRESS: 0, DISPENSED: 0 };
    },
    staleTime: 30000,
    // A pharmacy queue has to notice work arriving. These counts sat behind
    // refetchOnWindowFocus: false with nothing else to refresh them, so the
    // badges only changed on a hard reload.
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });

  // Use React Query to cache orders - fetch when search is active or filters are set
  const { data: rawOrders = [], isLoading: loading, refetch } = useQuery({
    queryKey: ["pharmacy-orders", workspaceid, statusFilter, dateFilter, search],
    queryFn: async () => {
      // Build query string with status and search filters (dateFilter handled client-side)
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      // Only send search parameter if it has content
      if (search.trim()) params.append("search", search.trim());
      
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-orders${qs}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      return data.orders || [];
    },
    staleTime: 10 * 1000,
    // An order a doctor sends here should appear without the pharmacist
    // reloading the page. With refetchOnMount and refetchOnWindowFocus both
    // off and nothing polling, this list refetched only when a filter changed:
    // returning to the Orders tab, or coming back to the window after serving
    // a customer, redisplayed whatever had been fetched the first time. A
    // prescription that arrived in between was simply not on the screen, and
    // nothing said so.
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 30000,
    enabled: true,
  });

  // Apply date filtering on client side
  const orders = useMemo(() => {
    if (dateFilter === "all") return rawOrders;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return rawOrders.filter((order: any) => {
      const orderDate = new Date(order.createdat);
      
      if (dateFilter === "day") {
        const orderDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
        return orderDay.getTime() === today.getTime();
      }
      
      if (dateFilter === "week") {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return orderDate >= weekAgo;
      }
      
      if (dateFilter === "month") {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return orderDate >= monthAgo;
      }
      
      return true;
    });
  }, [rawOrders, dateFilter]);

  const handleSync = () => {
    setSyncMessage(null);
    syncMutation.mutate();
  };

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/d/${workspaceid}/pharmacy-orders/sync`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Sync failed");
      return res.json();
    },
    onSuccess: (data) => {
      setSyncMessage(`Synced ${data.synced} new, ${data.skipped} existing`);
      queryClient.invalidateQueries({ queryKey: ["pharmacy-orders", workspaceid] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-orders-counts", workspaceid] });
    },
    onError: () => {
      setSyncMessage("Network error during sync");
    },
  });

  // Removed auto-sync on page load - sync only when user clicks refresh

  const filtered = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    return orders.filter((o) => {
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      const matchesSearch =
        !search ||
        `${o.patientfirst} ${o.patientlast}`.toLowerCase().includes(search.toLowerCase()) ||
        o.orderid.toLowerCase().includes(search.toLowerCase());
      
      // Date filtering
      const orderDate = new Date(o.createdat);
      let matchesDate = true;
      if (dateFilter === "day") {
        matchesDate = orderDate >= today;
      } else if (dateFilter === "week") {
        matchesDate = orderDate >= weekAgo;
      } else if (dateFilter === "month") {
        matchesDate = orderDate >= monthAgo;
      }
      
      return matchesStatus && matchesSearch && matchesDate;
    });
  }, [orders, statusFilter, dateFilter, search]);

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  }, [filtered, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [statusFilter, dateFilter, search]);

  // Use counts from API or fallback to filtered orders when searching
  const counts = countsData || {
    all: orders.length,
    PENDING: orders.filter((o) => o.status === "PENDING").length,
    IN_PROGRESS: orders.filter((o) => o.status === "IN_PROGRESS").length,
    DISPENSED: orders.filter((o) => o.status === "DISPENSED").length,
  };

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 p-4 pt-0 space-y-3">
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2">
            {syncMessage && (
              <span className="text-xs text-muted-foreground">{syncMessage}</span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncMutation.isPending}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              {syncMutation.isPending ? "Syncing..." : "Refresh"}
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-2 bg-[#618FF5] border-blue-400 text-white hover:bg-[#618FF5] hover:border-blue-900"
            >
              Prescription Order
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
     <div className="grid grid-cols-3 gap-2">
  <Card className="h-9 shadow-sm bg-gray-100 border-purple-200">
    <CardContent className="flex items-center justify-center h-full px-3">
      <p className="text-sm font-bold">Total orders {counts.all}</p>
    </CardContent>
  </Card>

  <Card className="h-9 shadow-sm bg-gray-100 border-green-200">
    <CardContent className="flex items-center justify-center h-full px-3">
      <p className="text-sm font-bold">Complete {counts.DISPENSED}</p>
    </CardContent>
  </Card>

  <Card className="h-9 shadow-sm bg-gray-100 border-yellow-200">
    <CardContent className="flex items-center justify-center h-full px-3">
      <p className="text-sm font-bold">Pending {counts.PENDING}</p>
    </CardContent>
  </Card>
</div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient name or order ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={dateFilter} onValueChange={(value) => { setDateFilter(value); refetch(); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Date filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); refetch(); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="DISPENSED">Dispensed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Scrollable Table Section */}
      <div className="flex-1 min-h-0 flex flex-col px-4 pb-4">
        <Card className="flex-1 min-h-0 flex flex-col">
        <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
          {!search.trim() ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-lg font-medium text-gray-700 mb-1">Search to View Orders</p>
              <p className="text-sm text-muted-foreground">Enter patient name, national ID, or order ID to find orders</p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
              <p className="text-sm font-medium text-gray-700">Searching orders...</p>
              <p className="text-xs text-muted-foreground mt-1">Please wait while we find matching orders</p>
            </div>
          ) : paginatedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="bg-muted/50">Order ID</TableHead>
                  <TableHead className="bg-muted/50">Patient</TableHead>
                  <TableHead className="bg-muted/50">Prescriber</TableHead>
                  <TableHead className="bg-muted/50">Products</TableHead>
                  <TableHead className="bg-muted/50">Date</TableHead>
                  <TableHead className="bg-muted/50">Payment Status</TableHead>
                  <TableHead className="bg-muted/50">Order Status</TableHead>
                  <TableHead className="text-right bg-muted/50">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((order) => {
                  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                  const StatusIcon = cfg.icon;
                  return (
                    <TableRow 
                      key={order.orderid}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedOrder(order.orderid);
                        setIsModalOpen(true);
                      }}
                    >
                      <TableCell className="font-mono text-xs">
                        {order.orderid.slice(0, 8)}…
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.patientfirst && order.patientlast
                          ? `${order.patientfirst} ${order.patientlast}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {order.prescribername || "—"}
                      </TableCell>
                      <TableCell className="max-w-[250px]">
                        {order.items && order.items.length > 0 ? (
                          <div className="text-xs space-y-1">
                            {order.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="text-muted-foreground truncate"
                                title={`${item.drugname} (${item.quantity})`}
                              >
                                {item.drugname} ({(item.quantity || 0) - (item.quantitydispensed || 0)})
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(order.createdat).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            order.paymentStatus === "PAID" ? "default" : 
                            order.paymentStatus === "UNPAID" ? "destructive" : 
                            order.paymentStatus === "PARTIALLY_PAID" ? "secondary" :
                            "outline"
                          }
                          className={
                            order.paymentStatus === "PAID" ? "bg-green-600" : 
                            order.paymentStatus === "UNPAID" ? "bg-red-100 text-red-700" : 
                            order.paymentStatus === "PARTIALLY_PAID" ? "bg-orange-100 text-orange-700" :
                            "bg-gray-100 text-gray-600"
                          }
                        >
                          {order.paymentStatus === "PARTIALLY_PAID" ? "Partially Paid" : order.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {order.status === "PENDING" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Edit order"
                              onClick={(e) => {
                                e.stopPropagation();
                                fetch(`/api/d/${workspaceid}/pharmacy-orders/${order.orderid}`)
                                  .then(r => r.json())
                                  .then(data => {
                                    setEditOrderData({
                                      ...data.order,
                                      patientid: data.patient?.patientid || order.patientid || "",
                                      patientfirst: data.patient?.firstname || order.patientfirst || "",
                                      patientlast: data.patient?.lastname || order.patientlast || "",
                                      middlename: data.patient?.middlename || null,
                                      nationalid: data.patient?.nationalid || null,
                                      dateofbirth: data.patient?.dateofbirth || null,
                                      phone: data.patient?.phone || null,
                                      email: data.patient?.email || null,
                                      address: data.patient?.address || null,
                                      gender: data.patient?.gender || null,
                                      priority: data.order?.priority || order.priority,
                                      notes: data.order?.notes || order.notes,
                                      prescribername: data.order?.prescribername || null,
                                      items: (data.items || []).map((item: any) => ({
                                        drugid: item.drugid || "",
                                        drugname: item.drugname,
                                        quantity: item.quantity,
                                        dosage: item.dosage || "",
                                      })),
                                    });
                                    setIsCreateModalOpen(true);
                                  })
                                  .catch(() => {
                                    setEditOrderData({
                                      orderid: order.orderid,
                                      patientid: order.patientid || "",
                                      patientfirst: order.patientfirst || "",
                                      patientlast: order.patientlast || "",
                                      priority: order.priority,
                                      notes: order.notes,
                                      items: order.items.map((item: any) => ({
                                        drugid: item.drugid || "",
                                        drugname: item.drugname,
                                        quantity: item.quantity,
                                        dosage: item.dosage || "",
                                      })),
                                    });
                                    setIsCreateModalOpen(true);
                                  });
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {order.status === "PENDING" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete order"
                              disabled={deletingOrderId === order.orderid}
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!confirm("Are you sure you want to delete this order? This action cannot be undone.")) return;
                                setDeletingOrderId(order.orderid);
                                try {
                                  const res = await fetch(
                                    `/api/d/${workspaceid}/pharmacy-orders/${order.orderid}`,
                                    { method: "DELETE" }
                                  );
                                  if (res.ok) {
                                    queryClient.invalidateQueries({ queryKey: ["pharmacy-orders", workspaceid] });
                                    queryClient.invalidateQueries({ queryKey: ["pharmacy-orders-counts", workspaceid] });
                                  } else {
                                    const data = await res.json();
                                    alert(data.error || "Failed to delete order");
                                  }
                                } catch (err) {
                                  alert("Failed to delete order");
                                } finally {
                                  setDeletingOrderId(null);
                                }
                              }}
                            >
                              {deletingOrderId === order.orderid ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0"
                            title="View details"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order.orderid);
                              setIsModalOpen(true);
                            }}
                          >
                            <Search className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

        {/* Pagination Controls - fixed below the card */}
        {!loading && search.trim() && totalPages > 1 && (
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border rounded-md bg-card shadow-sm">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} orders
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="gap-1 border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={currentPage === page ? "w-8 h-8 p-0 bg-blue-600 hover:bg-blue-700" : "w-8 h-8 p-0 border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700"}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="gap-1 border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        workspaceid={workspaceid}
        orderid={selectedOrder || ""}
        open={isModalOpen && selectedOrder !== null}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedOrder(null);
        }}
      />

      {/* Create Order Modal */}
      <CreateOrderModal
        workspaceid={workspaceid}
        userName={userName}
        userId={userId}
        open={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditOrderData(null);
        }}
        onSuccess={(orderId) => {
          queryClient.invalidateQueries({ queryKey: ["pharmacy-orders", workspaceid] });
          queryClient.invalidateQueries({ queryKey: ["pharmacy-orders-counts", workspaceid] });
          setIsCreateModalOpen(false);
          const wasEditing = !!editOrderData;
          setEditOrderData(null);
          // Redirect to POS after creating a new order (not when editing)
          if (!wasEditing && orderId) {
            window.location.href = `/d/${workspaceid}/pos?orderId=${orderId}`;
          }
        }}
        editOrder={editOrderData}
      />
    </div>
  );
}
