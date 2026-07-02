'use client';

import { useState } from 'react';
import { Scissors, FlaskConical, ImageIcon, Info, BedDouble, ClipboardList, Activity, AlertTriangle } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   LAB ORDER DIALOG
   ───────────────────────────────────────────────────────────────────────────── */
function LabOrderDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white/95 border rounded-lg p-6 shadow-lg w-[80vw] max-h-[85vh] overflow-y-auto">
        <div className="flex flex-col gap-2 text-left pb-2">
          <h2 className="text-lg font-semibold">Order Laboratory Tests</h2>
        </div>
        <div className="grid gap-4 py-2" style={{ gridTemplateColumns: '1fr 2fr 1fr' }}>
          {/* Step 1 */}
          <div className="border-r pr-4 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FlaskConical className="h-5 w-5" />
                <label className="text-base font-semibold">Step 1: Laboratory or Package</label>
              </div>
              <div className="mb-3">
                <label className="text-xs text-muted-foreground mb-1 block">Select Laboratory Department</label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs">
                  <option value="">Choose a laboratory...</option>
                  <option value="hematology">Hematology</option>
                  <option value="biochemistry">Biochemistry</option>
                  <option value="microbiology">Microbiology</option>
                  <option value="pathology">Pathology</option>
                </select>
              </div>
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-xs text-muted-foreground">OR select a package directly</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Select Test Package</label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs">
                  <option value="">Choose a test package...</option>
                  <option value="cbc">Complete Blood Count (CBC)</option>
                  <option value="bmp">Basic Metabolic Panel</option>
                  <option value="lipid">Lipid Panel</option>
                  <option value="liver">Liver Function Tests</option>
                </select>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList className="h-5 w-5" />
                <label className="text-base font-semibold">Step 2: Test Groups</label>
              </div>
              <p className="text-sm text-muted-foreground">Select a laboratory first</p>
            </div>
          </div>

          {/* Step 3 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="h-5 w-5" />
              <label className="text-base font-semibold">Step 3: Review Tests</label>
            </div>
            <p className="text-sm text-muted-foreground">Select test groups first</p>
          </div>

          {/* Order Summary */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="h-5 w-5" />
              <label className="text-base font-semibold">Order Summary</label>
            </div>
            <p className="text-sm text-muted-foreground">Select tests in Step 3 and click Add</p>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4">
          <button onClick={onClose} className="inline-flex items-center justify-center rounded-md text-sm font-medium border bg-background shadow-xs hover:bg-accent h-9 px-4 py-2">
            Cancel
          </button>
          <button disabled className="inline-flex items-center justify-center rounded-md text-sm font-medium text-white shadow-xs h-9 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
            Order Tests
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   RADIOLOGY DIALOG
   ───────────────────────────────────────────────────────────────────────────── */
function RadiologyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white/95 border rounded-lg p-6 shadow-lg w-[65vw] max-h-[90vh] overflow-y-auto">
        <div className="flex flex-col gap-2 text-left pb-2">
          <h2 className="text-lg font-semibold">New Imaging Request</h2>
          <p className="text-muted-foreground text-sm">Create an imaging examination request</p>
        </div>
        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Request Name *</label>
            <select className="w-full px-3 py-2 border rounded-md text-sm">
              <option value="">Select imaging type</option>
              <optgroup label="X-Ray">
                <option>Chest X-Ray</option>
                <option>Abdominal X-Ray</option>
                <option>Spine X-Ray</option>
                <option>Extremity X-Ray</option>
              </optgroup>
              <optgroup label="Ultrasound">
                <option>Abdominal Ultrasound</option>
                <option>Pelvic Ultrasound</option>
                <option>Cardiac Ultrasound (Echo)</option>
                <option>Thyroid Ultrasound</option>
              </optgroup>
              <optgroup label="CT Scan">
                <option>CT Scan - Head</option>
                <option>CT Scan - Chest</option>
                <option>CT Scan - Abdomen</option>
                <option>CT Angiography</option>
              </optgroup>
              <optgroup label="MRI">
                <option>MRI - Brain</option>
                <option>MRI - Spine</option>
                <option>MRI - Abdomen</option>
                <option>MRI - Joints</option>
              </optgroup>
              <optgroup label="Other Imaging">
                <option>Mammography</option>
                <option>Bone Density Scan (DEXA)</option>
                <option>PET Scan</option>
                <option>Fluoroscopy</option>
              </optgroup>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <textarea rows={2} placeholder="Brief description of the imaging request..." className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Clinical Indication</label>
            <textarea rows={2} placeholder="Reason for imaging request..." className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Target Body Site</label>
            <input type="text" placeholder="e.g., Chest, Abdomen, Left knee" className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Patient Requirement</label>
            <input type="text" placeholder="Special patient requirements..." className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Comment</label>
            <textarea rows={2} placeholder="Additional comments..." className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <button onClick={onClose} className="inline-flex items-center justify-center rounded-md text-sm font-medium border bg-background shadow-xs hover:bg-accent h-9 px-4 py-2">
            Cancel
          </button>
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium text-white shadow-xs h-9 px-4 py-2 bg-blue-600 hover:bg-blue-700">
            Create Request
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SERVICE ORDER SECTION (reusable for sections 2–5)
   ───────────────────────────────────────────────────────────────────────────── */
function ServiceOrderBlock({ showLabDialog, showRadiologyDialog }: { showLabDialog: () => void; showRadiologyDialog: () => void }) {
  return (
    <div className="flex gap-3">
      <button onClick={showLabDialog} className="inline-flex items-center gap-2 rounded-md text-sm font-medium border bg-background shadow-xs hover:bg-accent h-9 px-4 py-2">
        <FlaskConical className="h-4 w-4" />
        Order Lab Tests
      </button>
      <button onClick={showRadiologyDialog} className="inline-flex items-center gap-2 rounded-md text-sm font-medium border bg-background shadow-xs hover:bg-accent h-9 px-4 py-2">
        <ImageIcon className="h-4 w-4" />
        Order Radiology Image
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
   ───────────────────────────────────────────────────────────────────────────── */
export default function DemoOperationsPage() {
  const [labOpen, setLabOpen] = useState(false);
  const [radiologyOpen, setRadiologyOpen] = useState(false);
  const [checkInDate, setCheckInDate] = useState('');
  const [lengthOfStay, setLengthOfStay] = useState('');
  const [unplannedWardRoom, setUnplannedWardRoom] = useState('');
  const [actualCheckOutDate, setActualCheckOutDate] = useState('');

  // Calculate check-out date
  const getCheckOutDate = () => {
    if (!checkInDate || !lengthOfStay) return 'Auto-calculated';
    const checkIn = new Date(checkInDate);
    const days = parseInt(lengthOfStay) || 0;
    if (isNaN(days) || days <= 0) return 'Auto-calculated';
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + days);
    return checkOut.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Calculate extra days (actual vs planned)
  const getExtraDays = () => {
    if (!checkInDate || !lengthOfStay || !actualCheckOutDate) return null;
    const checkIn = new Date(checkInDate);
    const plannedDays = parseInt(lengthOfStay) || 0;
    const plannedCheckOut = new Date(checkIn);
    plannedCheckOut.setDate(plannedCheckOut.getDate() + plannedDays);
    const actualCheckOut = new Date(actualCheckOutDate);
    const diffTime = actualCheckOut.getTime() - plannedCheckOut.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return diffDays;
    return null;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Scissors className="h-5 w-5" />
          Schedule Operation
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Complete surgical workflow — from scheduling to post-operative care</p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
         SECTION 1: Operation Details
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-background border rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#4684c2] text-white text-xs font-bold">1</span>
          <h2 className="text-base font-semibold">Operation Details</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Core surgical information including procedure, scheduling, and clinical assessment</p>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="flex items-center gap-2 font-medium text-sm">Operation Name *</label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs">
                <option value="">Select operation</option>
                <option value="appendectomy">Appendectomy</option>
                <option value="cholecystectomy">Cholecystectomy</option>
                <option value="hernia-repair">Hernia Repair</option>
                <option value="knee-replacement">Knee Replacement</option>
                <option value="cataract-surgery">Cataract Surgery</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-2 font-medium text-sm">Operation Date &amp; Time *</label>
              <input type="datetime-local" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="flex items-center gap-2 font-medium text-sm">Operation Type</label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs">
                <option value="elective">Elective</option>
                <option value="emergency">Emergency</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-2 font-medium text-sm">Operation Room</label>
              <input type="text" placeholder="e.g., OR-1" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-2 font-medium text-sm">Anesthesia Type</label>
              <input type="text" placeholder="e.g., General" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-2 font-medium text-sm">Price</label>
              <input type="number" placeholder="e.g., 5000" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="flex items-center gap-2 font-medium text-sm">Diagnosis</label>
            <textarea rows={2} placeholder="Enter diagnosis..." className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <label className="flex items-center gap-2 font-medium text-sm">Pre-operative Assessment</label>
            <textarea rows={2} placeholder="Enter pre-operative assessment..." className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
         SECTION 2: Pre-Operation Services
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-background border rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#4684c2] text-white text-xs font-bold">2</span>
          <h2 className="text-base font-semibold">Pre-Operation Services</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Admission details and preparatory services required before the operation</p>

        <div className="space-y-4">
          {/* Room & Admission */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="flex items-center gap-2 font-medium text-sm">
                <BedDouble className="h-4 w-4" />
                Ward Room
              </label>
              <input type="text" placeholder="e.g., 204-A" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-2 font-medium text-sm">Check-in Date</label>
              <input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs" />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-2 font-medium text-sm">Length of Stay</label>
              <input type="number" placeholder="e.g., 3" value={lengthOfStay} onChange={(e) => setLengthOfStay(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-2 font-medium text-sm">Check-out Date</label>
              <div className="flex h-9 w-full items-center rounded-md border border-dashed border-input bg-muted/30 px-3 py-1 text-sm text-muted-foreground">
                {getCheckOutDate()}
              </div>
            </div>
          </div>

          {/* Operation Room & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="flex items-center gap-2 font-medium text-sm">Operation Room</label>
              <input type="text" placeholder="e.g., OR-1" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-2 font-medium text-sm">Operation Date &amp; Time</label>
              <input type="datetime-local" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs" />
            </div>
          </div>

          {/* Order Buttons */}
          <ServiceOrderBlock showLabDialog={() => setLabOpen(true)} showRadiologyDialog={() => setRadiologyOpen(true)} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
         SECTION 3: Services During Operation
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-background border rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#4684c2] text-white text-xs font-bold">3</span>
          <h2 className="text-base font-semibold">Services During Operation</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Additional diagnostic services required during the surgical procedure</p>

        <ServiceOrderBlock showLabDialog={() => setLabOpen(true)} showRadiologyDialog={() => setRadiologyOpen(true)} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
         SECTION 4: Post-Operation Services
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-background border rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#4684c2] text-white text-xs font-bold">4</span>
          <h2 className="text-base font-semibold">Post-Operation Services</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Follow-up diagnostics and services required after the operation</p>

        <ServiceOrderBlock showLabDialog={() => setLabOpen(true)} showRadiologyDialog={() => setRadiologyOpen(true)} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
         SECTION 5: Unplanned Services
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-background border rounded-lg p-6 shadow-sm border-amber-200">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold">5</span>
          <h2 className="text-base font-semibold flex items-center gap-2">
            Unplanned Services
            <span className="relative group">
              <Info className="h-4 w-4 text-amber-500 cursor-help" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-md bg-gray-900 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Record any unexpected services that were performed during the operation that were not part of the original plan.
              </span>
            </span>
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Services performed due to unforeseen circumstances during the procedure</p>

        <div className="space-y-4">
          {/* Extended Stay Calculation */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="flex items-center gap-2 font-medium text-sm">
                <BedDouble className="h-4 w-4" />
                Ward Room
              </label>
              <input type="text" placeholder="e.g., 204-A" value={unplannedWardRoom} onChange={(e) => setUnplannedWardRoom(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-2 font-medium text-sm">Actual Check-out Date</label>
              <input type="date" value={actualCheckOutDate} onChange={(e) => setActualCheckOutDate(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs" />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-2 font-medium text-sm">Extra Days</label>
              <div className="flex h-9 w-full items-center rounded-md border border-dashed border-amber-300 bg-amber-50/50 px-3 py-1 text-sm text-amber-700 font-medium">
                {getExtraDays() !== null ? `+${getExtraDays()} days` : 'Calculated when filled'}
              </div>
            </div>
          </div>

          {/* Note about unpaid services */}
          {getExtraDays() !== null && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                <span className="font-semibold">Unpaid Service:</span> {getExtraDays()} extra day(s) will be added to the invoice for extended stay beyond planned discharge.
              </p>
            </div>
          )}

          <ServiceOrderBlock showLabDialog={() => setLabOpen(true)} showRadiologyDialog={() => setRadiologyOpen(true)} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
         FOOTER ACTIONS
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
        <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
          Cancel
        </button>
        <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium text-white shadow-xs h-9 px-4 py-2 bg-[#4684c2] hover:bg-[#3a6fa0]">
          <Scissors className="h-4 w-4" />
          Schedule Operation
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
         DIALOGS
         ═══════════════════════════════════════════════════════════════════════ */}
      <LabOrderDialog open={labOpen} onClose={() => setLabOpen(false)} />
      <RadiologyDialog open={radiologyOpen} onClose={() => setRadiologyOpen(false)} />
    </div>
  );
}
