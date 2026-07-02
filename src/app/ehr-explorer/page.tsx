"use client";

import { useState } from "react";

export default function EHRExplorer() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState("summary");
  const [ehrId, setEhrId] = useState("");
  const [compositionUid, setCompositionUid] = useState("");

  const fetchData = async (endpoint: string, body?: any) => {
    setLoading(true);
    setError("");
    setData(null);

    try {
      const url = body 
        ? "/api/ehr-explorer"
        : `/api/ehr-explorer?endpoint=${endpoint}`;
      
      const options: RequestInit = {
        method: body ? "POST" : "GET",
        headers: { "Content-Type": "application/json" },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const res = await fetch(url, options);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to fetch data");
      }

      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (viewName: string) => {
    setView(viewName);
    setData(null);
    setError("");

    switch (viewName) {
      case "summary":
        fetchData("/summary");
        break;
      case "patients":
        fetchData("/patients");
        break;
      case "compositions":
        fetchData("/compositions");
        break;
      case "procedures":
        fetchData("/procedures");
        break;
      case "price":
        fetchData("/price");
        break;
    }
  };

  const handlePatientQuery = () => {
    if (!ehrId) {
      setError("Please enter EHR ID");
      return;
    }
    fetchData(`/patient/${ehrId}`);
  };

  const handleCompositionQuery = () => {
    if (!ehrId || !compositionUid) {
      setError("Please enter both EHR ID and Composition UID");
      return;
    }
    fetchData(`/composition`, { ehrId, compositionUid });
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">EHRbase Database Explorer</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => handleView("summary")}
          className="p-4 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Database Summary
        </button>
        <button
          onClick={() => handleView("patients")}
          className="p-4 bg-green-500 text-white rounded hover:bg-green-600"
        >
          All Patients
        </button>
        <button
          onClick={() => handleView("compositions")}
          className="p-4 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          All Compositions
        </button>
        <button
          onClick={() => handleView("procedures")}
          className="p-4 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Procedures/Operations
        </button>
        <button
          onClick={() => handleView("price")}
          className="p-4 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Price Data
        </button>
      </div>

      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">Query Specific Data</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Patient Query (EHR ID)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={ehrId}
                onChange={(e) => setEhrId(e.target.value)}
                placeholder="Enter EHR ID"
                className="flex-1 p-2 border rounded"
              />
              <button
                onClick={handlePatientQuery}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Query
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Composition Query</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={ehrId}
                onChange={(e) => setEhrId(e.target.value)}
                placeholder="EHR ID"
                className="p-2 border rounded"
              />
              <input
                type="text"
                value={compositionUid}
                onChange={(e) => setCompositionUid(e.target.value)}
                placeholder="Composition UID"
                className="p-2 border rounded"
              />
              <button
                onClick={handleCompositionQuery}
                className="col-span-2 px-4 py-2 bg-blue-500 text-white rounded"
              >
                Query
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2">Loading...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {data && (
        <div className="bg-white border rounded p-4 overflow-auto">
          <h3 className="font-semibold mb-2">Results</h3>
          <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
