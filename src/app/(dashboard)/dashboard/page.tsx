import Link from 'next/link';
import { 
  Users, 
  UserCircle, 
  Calendar, 
  Building2, 
  FlaskConical, 
  Pill,
  Hospital,
  Package,
  DollarSign,
  ArrowUpRight,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import dashboardData from '@/data/dashboard.json';

export default function DashboardPage() {
  const { metrics, activity, facilities } = dashboardData;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Administrator Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your workspace statistics and quick actions</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Patients</CardTitle>
              <Users className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalPatients}</div>
              <p className="text-xs text-gray-500 mt-1">Registered in system</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Staff Members</CardTitle>
              <UserCircle className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.staffMembers}</div>
              <p className="text-xs text-gray-500 mt-1">Active staff</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Appointments</CardTitle>
              <Calendar className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalAppointments}</div>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Departments</CardTitle>
              <Building2 className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.departments}</div>
              <p className="text-xs text-gray-500 mt-1">Active departments</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-info">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Today's Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-info">{activity.todayAppointments}</div>
              <p className="text-xs text-gray-500 mt-1">Scheduled for today</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-warning">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{activity.pendingAppointments}</div>
              <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-success">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-success" />
                <span className="text-2xl font-bold text-success">{activity.systemStatus}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">All systems operational</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Facilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Laboratories</CardTitle>
              <FlaskConical className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{facilities.laboratories}</div>
              <p className="text-xs text-gray-500 mt-1">Lab facilities</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pharmacies</CardTitle>
              <Pill className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{facilities.pharmacies}</div>
              <p className="text-xs text-gray-500 mt-1">Pharmacy locations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Growth</CardTitle>
              <ArrowUpRight className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">+{facilities.totalRegistrations}</div>
              <p className="text-xs text-gray-500 mt-1">Total registrations</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/patients">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Manage Patients</h3>
                  <p className="text-sm text-gray-500">View and edit patient records</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/hr/employees">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
                  <UserCircle className="w-6 h-6 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Manage Staff</h3>
                  <p className="text-sm text-gray-500">Add or edit staff members</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/appointments">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">View Appointments</h3>
                  <p className="text-sm text-gray-500">Manage all appointments</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/departments">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 bg-info-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-info" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Departments</h3>
                  <p className="text-sm text-gray-500">Manage hospital departments</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/laboratories">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FlaskConical className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Laboratories</h3>
                  <p className="text-sm text-gray-500">Manage lab facilities</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/pharmacies">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                  <Pill className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Pharmacies</h3>
                  <p className="text-sm text-gray-500">Manage pharmacy locations</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/services">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Hospital className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Services</h3>
                  <p className="text-sm text-gray-500">Hospital services catalog</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/inventory">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Inventory</h3>
                  <p className="text-sm text-gray-500">Stock management</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/finance">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Finance</h3>
                  <p className="text-sm text-gray-500">Financial management</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
