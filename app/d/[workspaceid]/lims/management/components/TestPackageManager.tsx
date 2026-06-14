"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, X, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TestPackage {
  packageid: string;
  packagename: string;
  description?: string;
  price: string;
  isactive: boolean;
  tests: PackageTest[];
  createdat?: string;
  createdbyname?: string;
}

interface PackageTest {
  itemid?: string;
  testcode: string;
  testname: string;
}

interface TestReference {
  testcode: string;
  testname: string;
  labtype?: string;
}

interface TestPackageManagerProps {
  workspaceid: string;
}

export default function TestPackageManager({ workspaceid }: TestPackageManagerProps) {
  const [packages, setPackages] = useState<TestPackage[]>([]);
  const [availableTests, setAvailableTests] = useState<TestReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingPackage, setEditingPackage] = useState<TestPackage | null>(null);
  const [deletePackageId, setDeletePackageId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [testSearchTerm, setTestSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    packagename: "",
    description: "",
    price: "",
    tests: [] as PackageTest[],
  });

  useEffect(() => {
    fetchPackages();
    fetchAvailableTests();
  }, [workspaceid]);

  const fetchPackages = async () => {
    try {
      const res = await fetch(`/api/d/${workspaceid}/lims/test-packages`);
      if (res.ok) {
        const data = await res.json();
        setPackages(data);
      }
    } catch (error) {
      console.error("Error fetching packages:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTests = async () => {
    try {
      const res = await fetch(`/api/d/${workspaceid}/lims/reference-ranges`);
      if (res.ok) {
        const data = await res.json();
        setAvailableTests(data);
      }
    } catch (error) {
      console.error("Error fetching tests:", error);
    }
  };

  const handleOpenDialog = (pkg?: TestPackage) => {
    if (pkg) {
      setEditingPackage(pkg);
      setFormData({
        packagename: pkg.packagename,
        description: pkg.description || "",
        price: pkg.price,
        tests: pkg.tests || [],
      });
    } else {
      setEditingPackage(null);
      setFormData({
        packagename: "",
        description: "",
        price: "",
        tests: [],
      });
    }
    setShowDialog(true);
  };

  const handleAddTest = (test: TestReference) => {
    if (!formData.tests.find(t => t.testcode === test.testcode)) {
      setFormData({
        ...formData,
        tests: [...formData.tests, { testcode: test.testcode, testname: test.testname }],
      });
    }
    setTestSearchTerm("");
  };

  const handleRemoveTest = (testcode: string) => {
    setFormData({
      ...formData,
      tests: formData.tests.filter(t => t.testcode !== testcode),
    });
  };

  const handleSave = async () => {
    if (!formData.packagename || !formData.price || formData.tests.length === 0) {
      alert("Please fill in package name, price, and add at least one test");
      return;
    }

    try {
      const url = editingPackage
        ? `/api/d/${workspaceid}/lims/test-packages/${editingPackage.packageid}`
        : `/api/d/${workspaceid}/lims/test-packages`;
      
      const method = editingPackage ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await fetchPackages();
        setShowDialog(false);
      } else {
        const error = await res.json();
        alert(`Error: ${error.error || "Failed to save package"}`);
      }
    } catch (error) {
      console.error("Error saving package:", error);
      alert("Failed to save package");
    }
  };

  const handleDelete = async () => {
    if (!deletePackageId) return;

    try {
      const res = await fetch(`/api/d/${workspaceid}/lims/test-packages/${deletePackageId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchPackages();
        setShowDeleteDialog(false);
        setDeletePackageId(null);
      } else {
        alert("Failed to delete package");
      }
    } catch (error) {
      console.error("Error deleting package:", error);
      alert("Failed to delete package");
    }
  };

  const filteredPackages = packages.filter(pkg =>
    pkg.packagename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTests = availableTests.filter(test =>
    (test.testname.toLowerCase().includes(testSearchTerm.toLowerCase()) ||
     test.testcode.toLowerCase().includes(testSearchTerm.toLowerCase())) &&
    !formData.tests.find(t => t.testcode === test.testcode)
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Test Packages</CardTitle>
          <Button onClick={() => handleOpenDialog()} size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Package
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search packages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Packages Table */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading packages...</div>
        ) : filteredPackages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No test packages found. Click "New Package" to create one.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPackages.map((pkg) => (
                  <TableRow key={pkg.packageid}>
                    <TableCell className="font-medium">{pkg.packagename}</TableCell>
                    <TableCell className="max-w-xs truncate">{pkg.description || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{pkg.tests?.length || 0} tests</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">${pkg.price}</TableCell>
                    <TableCell>
                      {pkg.isactive ? (
                        <Badge variant="default" className="bg-green-600">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(pkg)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletePackageId(pkg.packageid);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Add/Edit Package Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPackage ? "Edit" : "New"} Test Package</DialogTitle>
            <DialogDescription>
              Create a package of tests with a bundled price
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Package Name */}
            <div>
              <Label htmlFor="packagename">Package Name *</Label>
              <Input
                id="packagename"
                value={formData.packagename}
                onChange={(e) => setFormData({ ...formData, packagename: e.target.value })}
                placeholder="e.g., Basic Health Checkup"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the package..."
                rows={2}
              />
            </div>

            {/* Price */}
            <div>
              <Label htmlFor="price">Package Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
              />
            </div>

            {/* Tests in Package */}
            <div>
              <Label>Tests in Package *</Label>
              <div className="mt-2 space-y-2">
                {formData.tests.length === 0 ? (
                  <div className="text-sm text-muted-foreground border rounded p-3">
                    No tests added yet. Search and add tests below.
                  </div>
                ) : (
                  <div className="border rounded-md">
                    {formData.tests.map((test) => (
                      <div
                        key={test.testcode}
                        className="flex items-center justify-between p-2 border-b last:border-b-0"
                      >
                        <div>
                          <span className="font-medium text-sm">{test.testcode}</span>
                          <span className="text-sm text-muted-foreground ml-2">- {test.testname}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTest(test.testcode)}
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Add Tests */}
            <div>
              <Label>Add Tests</Label>
              <div className="relative mt-2">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tests to add..."
                  value={testSearchTerm}
                  onChange={(e) => setTestSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              {testSearchTerm && filteredTests.length > 0 && (
                <div className="mt-2 border rounded-md max-h-48 overflow-y-auto">
                  {filteredTests.slice(0, 10).map((test) => (
                    <button
                      key={test.testcode}
                      type="button"
                      className="w-full text-left p-2 hover:bg-blue-50 border-b last:border-b-0 flex items-center justify-between"
                      onClick={() => handleAddTest(test)}
                    >
                      <div>
                        <span className="font-medium text-sm">{test.testcode}</span>
                        <span className="text-sm text-muted-foreground ml-2">- {test.testname}</span>
                        {test.labtype && (
                          <Badge variant="outline" className="ml-2 text-xs">{test.labtype}</Badge>
                        )}
                      </div>
                      <Plus className="h-4 w-4 text-blue-600" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              {editingPackage ? "Update" : "Create"} Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Package?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the test package.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
