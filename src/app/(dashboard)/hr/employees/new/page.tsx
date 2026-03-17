'use client';

import React from 'react';

export default function TestEmployeePage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Employee Form</h1>
      <p>If you can see this, the basic routing works.</p>
      
      <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ccc' }}>
        <h2>Form Fields Test</h2>
        
        <div style={{ marginBottom: '15px' }}>
          <label>First Name:</label>
          <input type="text" placeholder="Enter first name" style={{ marginLeft: '10px', padding: '5px' }} />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label>Last Name:</label>
          <input type="text" placeholder="Enter last name" style={{ marginLeft: '10px', padding: '5px' }} />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label>Basic Salary:</label>
          <input type="number" placeholder="Enter salary" style={{ marginLeft: '10px', padding: '5px' }} />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label>Housing Allowance:</label>
          <input type="number" placeholder="Enter housing allowance" style={{ marginLeft: '10px', padding: '5px' }} />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label>Transport Allowance:</label>
          <input type="number" placeholder="Enter transport allowance" style={{ marginLeft: '10px', padding: '5px' }} />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label>Meal Allowance:</label>
          <input type="number" placeholder="Enter meal allowance" style={{ marginLeft: '10px', padding: '5px' }} />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label>Payment Frequency:</label>
          <select style={{ marginLeft: '10px', padding: '5px' }}>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </div>
        
        <button style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#3B82F6', color: 'white', border: 'none', borderRadius: '5px' }}>
          Create Employee
        </button>
      </div>
    </div>
  );
}
