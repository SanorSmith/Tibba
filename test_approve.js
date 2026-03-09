const response = await fetch('http://localhost:3000/api/hr/leaves/requests/47eb9c9e-cb18-446b-9ca7-8f39a2d71c27/approve', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    approver_id: '00000000-0000-0000-0000-000000000001',
    approver_name: 'Test User',
    action: 'APPROVE'
  }),
});

const result = await response.json();
console.log('Status:', response.status);
console.log('Result:', result);
