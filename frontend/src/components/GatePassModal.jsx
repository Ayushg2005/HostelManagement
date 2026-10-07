import React, { useRef } from 'react';
import { X, Printer, CheckCircle, ShieldCheck } from 'lucide-react';

const GatePassModal = ({ isOpen, onClose, passData }) => {
  const printRef = useRef(null);

  if (!isOpen || !passData) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    const originalContents = document.body.innerHTML;

    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload(); // Reload to restore React state cleanly after print mutation
  };

  const isLateEntry = passData.type === 'LATE_ENTRY';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            Digital Gate Pass
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Area */}
        <div className="p-6 overflow-y-auto custom-scrollbar" ref={printRef}>
          <div className="bg-white text-slate-900 rounded-xl p-6 shadow-inner border-2 border-slate-200 print:border-none print:shadow-none print:m-0 print:p-4">
            
            {/* Pass Header */}
            <div className="text-center border-b-2 border-slate-200 pb-4 mb-4">
              <h1 className="text-2xl font-black uppercase tracking-wider text-slate-800">
                BMSCE Hostel
              </h1>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mt-1">
                Official Security Pass
              </p>
            </div>

            {/* Pass Status & ID */}
            <div className="flex justify-between items-center mb-6">
              <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full flex items-center gap-1 text-xs font-bold uppercase tracking-wide">
                <CheckCircle className="w-4 h-4" />
                {passData.status}
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 font-bold uppercase">Pass ID</p>
                <p className="text-sm font-mono font-bold text-slate-700">{passData.passId}</p>
              </div>
            </div>

            {/* Student Info */}
            <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">Student Name</p>
                <p className="font-bold text-slate-800">{passData.student?.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">USN</p>
                <p className="font-bold text-slate-800">{passData.student?.usn || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">Room</p>
                <p className="font-bold text-slate-800">
                  {passData.student?.roomId?.number ? `${passData.student.roomId.number} (Floor ${passData.student.roomId.floor})` : 'Unassigned'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">Contact</p>
                <p className="font-bold text-slate-800">{passData.contactNumber || 'N/A'}</p>
              </div>
            </div>

            {/* Request Details */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-200 pb-2 mb-3">
                {isLateEntry ? 'Late Entry Details' : 'Leave Details'}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm font-medium">Departure/Start:</span>
                  <span className="text-slate-800 text-sm font-bold">
                    {new Date(passData.startDate).toLocaleString()}
                  </span>
                </div>
                {passData.endDate && !isLateEntry && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-sm font-medium">Expected Return:</span>
                    <span className="text-slate-800 text-sm font-bold">
                      {new Date(passData.endDate).toLocaleString()}
                    </span>
                  </div>
                )}
                {isLateEntry && passData.eta && (
                  <div className="flex justify-between items-center bg-amber-50 p-2 rounded border border-amber-100">
                    <span className="text-amber-800 text-sm font-bold">Estimated Time of Arrival (ETA):</span>
                    <span className="text-amber-900 text-sm font-black">
                      {new Date(passData.eta).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <span className="text-slate-500 text-sm font-medium block mb-1">Reason:</span>
                  <p className="text-slate-800 text-sm italic">{passData.reason}</p>
                </div>
              </div>
            </div>

            {/* Approval Footer */}
            <div className="mt-8 pt-4 border-t-2 border-slate-200 flex justify-between items-end">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Authorized By</p>
                <p className="font-bold text-slate-800">{passData.reviewedBy?.name || 'Warden'}</p>
                <p className="text-xs text-slate-500">
                  {passData.reviewedAt ? new Date(passData.reviewedAt).toLocaleString() : 'N/A'}
                </p>
              </div>
              <div className="text-right">
                {/* Placeholder for QR or official stamp */}
                <div className="w-16 h-16 border-2 border-emerald-500 rounded flex items-center justify-center opacity-80">
                  <span className="text-[10px] font-black text-emerald-600 uppercase text-center leading-tight transform -rotate-12">
                    Valid<br/>Pass
                  </span>
                </div>
              </div>
            </div>
            
            {/* Print instruction - hidden in print mode */}
            <p className="text-center text-[10px] text-slate-400 mt-4 print:hidden">
              Please present this digital pass or a printed copy at the main security gate.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default GatePassModal;
