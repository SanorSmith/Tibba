"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, X, Search, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
  labtype?: string;
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
  grouptests?: string;
}

interface TestPackageManagerProps {
  workspaceid: string;
}

export default function TestPackageManager({ workspaceid }: TestPackageManagerProps) {
  const [packages, setPackages] = useState<TestPackage[]>([]);
  const [availableTests, setAvailableTests] = useState<TestReference[]>([]);
  const [laboratories, setLaboratories] = useState<{value: string; label: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingPackage, setEditingPackage] = useState<TestPackage | null>(null);
  const [deletePackageId, setDeletePackageId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [testSearchTerm, setTestSearchTerm] = useState("");
  const [selectedLab, setSelectedLab] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    packagename: "",
    description: "",
    labtype: "",
    price: "",
    tests: [] as PackageTest[],
  });

  // Get unique test groups (panels) from available tests based on selected lab
  const testGroups = availableTests
    .filter(test => !selectedLab || test.labtype?.toLowerCase() === selectedLab.toLowerCase())
    .map(test => test.grouptests)
    .filter((value): value is string => !!value && value.trim() !== '')
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort()
    .map(group => ({ value: group, label: group }));

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
      // Use the same test catalog API as the lab order form
      const res = await fetch(`/api/test-catalog?workspaceid=${workspaceid}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Build a map of test ID -> panel name from testPackages
          const testToPanelMap: Record<string, string> = {};
          Object.values(data.testPackages || {}).forEach((pkg: any) => {
            if (pkg.tests && pkg.name) {
              pkg.tests.forEach((testId: string) => {
                testToPanelMap[testId] = pkg.name;
              });
            }
          });

          // Convert individualTests record to array with panel info
          const tests = Object.values(data.individualTests || {}).map((test: any) => ({
            testcode: test.code,
            testname: test.name,
            labtype: test.category,
            grouptests: testToPanelMap[test.id] || '', // Get panel from package mapping
          }));
          setAvailableTests(tests);

          // Extract laboratories from API response (same as lab order form)
          const labs = Object.values(data.laboratories || {}).map((lab: any) => ({
            value: lab.id,
            label: lab.name,
          }));
          setLaboratories(labs);
        }
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
        labtype: pkg.labtype || "",
        price: pkg.price,
        tests: pkg.tests || [],
      });
      setCurrentStep(4); // Skip to test selection for editing
    } else {
      setEditingPackage(null);
      setFormData({
        packagename: "",
        description: "",
        labtype: "",
        price: "",
        tests: [],
      });
      setSelectedLab("");
      setCurrentStep(1);
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
        body: JSON.stringify({
          ...formData,
          labtype: formData.labtype || selectedLab || null, // Ensure labtype is always set
        }),
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

  // Get test codes already in the package
  const selectedTestCodes = formData.tests.map(t => t.testcode);

  // Filter tests for display - show all matching tests including already selected ones
  const filteredTests = availableTests.filter(test => {
    // Always show tests that are already in the package (from any lab)
    const isAlreadySelected = selectedTestCodes.includes(test.testcode);
    // For new tests, filter by selected lab and group
    const matchesLab = !selectedLab || test.labtype?.toLowerCase() === selectedLab.toLowerCase();
    // For group filtering, do exact match on panel name
    const matchesGroup = !selectedGroup ||
                        selectedGroup === "all" ||
                        (test.grouptests && test.grouptests.toLowerCase() === selectedGroup.toLowerCase());
    // Show if: already selected OR matches current filters
    return isAlreadySelected || (matchesLab && matchesGroup);
  });

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

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep >= step
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step}
                </div>
                {step < 4 && (
                  <div
                    className={`w-12 h-1 ${
                      currentStep > step ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="space-y-4 py-4">
            {/* Step 1: Package Details */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="packagename">Step 1: Package Name *</Label>
                  <Input
                    id="packagename"
                    value={formData.packagename}
                    onChange={(e) => setFormData({ ...formData, packagename: e.target.value })}
                    placeholder="e.g., Basic Health Checkup"
                  />
                </div>

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

                <Button
                  onClick={() => setCurrentStep(2)}
                  disabled={!formData.packagename || !formData.price}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Next: Select Laboratory
                </Button>
              </div>
            )}

            {/* Step 2: Select Laboratory */}
            {currentStep === 2 && (
              <div className="space-y-4">
                {formData.tests.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-sm font-medium text-green-900">
                      {formData.tests.length} test{formData.tests.length !== 1 ? 's' : ''} already selected
                    </p>
                    <p className="text-xs text-green-700">
                      You can add more tests from another laboratory
                    </p>
                  </div>
                )}
                <div>
                  <Label>Step 2: Select Laboratory *</Label>
                  <Select 
                    value={selectedLab} 
                    onValueChange={(value) => {
                      setSelectedLab(value);
                      setFormData(prev => ({ ...prev, labtype: value }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose laboratory department" />
                    </SelectTrigger>
                    <SelectContent>
                      {laboratories.map((lab) => (
                        <SelectItem key={lab.value} value={lab.value}>
                          {lab.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setCurrentStep(3)}
                    disabled={!selectedLab}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Next: Select Test Group
                  </Button>
                </div>
                {formData.tests.length > 0 && (
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentStep(4)}
                    className="w-full text-sm"
                  >
                    Skip to Review ({formData.tests.length} tests selected)
                  </Button>
                )}
              </div>
            )}

            {/* Step 3: Select Test Group */}
            {currentStep === 3 && (
              <div className="space-y-4">
                {formData.tests.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-sm font-medium text-green-900">
                      {formData.tests.length} test{formData.tests.length !== 1 ? 's' : ''} already selected
                    </p>
                  </div>
                )}
                <div>
                  <Label>Step 3: Select Test Group (Optional)</Label>
                  <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a test group or skip to select individual tests" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tests</SelectItem>
                      {testGroups.map((group) => (
                        <SelectItem key={group.value} value={group.value}>
                          {group.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select a specific test group or choose "All Tests" to see all available tests
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setCurrentStep(4)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Next: Select Tests
                  </Button>
                </div>
                {formData.tests.length > 0 && (
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentStep(4)}
                    className="w-full text-sm"
                  >
                    Skip to Review ({formData.tests.length} tests selected)
                  </Button>
                )}
              </div>
            )}

            {/* Step 4: Select Tests */}
            {currentStep === 4 && (
              <div className="space-y-4">
                {/* Current Selection Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        {formData.tests.length} test{formData.tests.length !== 1 ? 's' : ''} in package
                      </p>
                      <p className="text-xs text-blue-700">
                        Package Lab: <span className="font-semibold">{laboratories.find(l => l.value === formData.labtype)?.label || formData.labtype || 'Not set'}</span>
                      </p>
                      <p className="text-xs text-blue-700">
                        Current filter: {laboratories.find(l => l.value === selectedLab)?.label || 'All Labs'}
                        {selectedGroup && selectedGroup !== "all"
                          ? ` > ${testGroups.find(g => g.value === selectedGroup)?.label || selectedGroup}`
                          : ' > All Groups'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Keep current tests and labtype, reset filters, go back to add more from different lab
                        setSelectedLab("");
                        setSelectedGroup("all");
                        setTestSearchTerm("");
                        setCurrentStep(2);
                      }}
                      className="text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add from Another Lab
                    </Button>
                  </div>
                </div>

                {/* Tests in Package */}
                {formData.tests.length > 0 && (
                  <div>
                    <Label className="text-sm">Tests Already in Package</Label>
                    <div className="mt-2 border rounded-md max-h-32 overflow-y-auto">
                      {formData.tests.map((test) => (
                        <div
                          key={test.testcode}
                          className="flex items-center justify-between p-2 border-b last:border-b-0 hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-sm">{test.testcode}</span>
                            <span className="text-sm text-muted-foreground">- {test.testname}</span>
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
                  </div>
                )}

                {/* Select More Tests */}
                <div>
                  <Label className="text-sm mb-2 block">
                    Add Tests from {selectedGroup && selectedGroup !== "all"
                      ? testGroups.find(g => g.value === selectedGroup)?.label || selectedGroup
                      : `${laboratories.find(l => l.value === selectedLab)?.label || 'Selected Lab'} - All Groups`}
                  </Label>

                  {/* Test Dropdown */}
                  <div className="space-y-2">
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (value && value !== "_none_") {
                          const test = availableTests.find(t => t.testcode === value);
                          if (test) handleAddTest(test);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a test to add..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {filteredTests.filter(t => !selectedTestCodes.includes(t.testcode)).length === 0 ? (
                          <SelectItem value="_none_" disabled>
                            No tests available in this group
                          </SelectItem>
                        ) : (
                          filteredTests
                            .filter(test => !selectedTestCodes.includes(test.testcode))
                            .map((test) => (
                              <SelectItem key={test.testcode} value={test.testcode}>
                                <div className="flex items-center justify-between w-full">
                                  <span className="font-medium">{test.testcode}</span>
                                  <span className="text-muted-foreground ml-2">- {test.testname}</span>
                                </div>
                              </SelectItem>
                            ))
                        )}
                      </SelectContent>
                    </Select>

                    {/* Quick Add Buttons */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs h-8"
                        onClick={() => {
                          // Add all visible filtered tests
                          const newTests = filteredTests
                            .filter(t => !selectedTestCodes.includes(t.testcode))
                            .map(t => ({ testcode: t.testcode, testname: t.testname }));
                          setFormData({ ...formData, tests: [...formData.tests, ...newTests] });
                        }}
                        disabled={filteredTests.filter(t => !selectedTestCodes.includes(t.testcode)).length === 0}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add All ({filteredTests.filter(t => !selectedTestCodes.includes(t.testcode)).length})
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs h-8"
                        onClick={() => {
                          // Remove all visible filtered tests
                          const visibleTestCodes = filteredTests.map(t => t.testcode);
                          setFormData({
                            ...formData,
                            tests: formData.tests.filter(t => !visibleTestCodes.includes(t.testcode))
                          });
                        }}
                        disabled={filteredTests.filter(t => selectedTestCodes.includes(t.testcode)).length === 0}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Remove All ({filteredTests.filter(t => selectedTestCodes.includes(t.testcode)).length})
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
                    {filteredTests.filter(t => !selectedTestCodes.includes(t.testcode)).length} tests available from selected group
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(3)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={formData.tests.length === 0}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {editingPackage ? "Update" : "Create"} Package
                  </Button>
                </div>
              </div>
            )}
          </div>

          {currentStep !== 4 && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
            </DialogFooter>
          )}
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
