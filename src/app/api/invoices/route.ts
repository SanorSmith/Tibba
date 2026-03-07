import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Updated: Fixed duplicate PUT handlers - 2026-03-07
// Fixed controlled input warnings - 2026-03-07

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in environment variables');
}

const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
}) : null;

export async function GET(request: NextRequest) {
  try {
    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) as total FROM invoices');
    const total = parseInt(countResult.rows[0].total);

    // Get invoices with pagination
    const invoicesResult = await pool.query(`
      SELECT 
        id,
        invoice_number,
        invoice_date,
        patient_id,
        patient_name,
        patient_name_ar,
        subtotal,
        discount_percentage,
        discount_amount,
        total_amount,
        insurance_company_id,
        insurance_coverage_amount,
        insurance_coverage_percentage,
        patient_responsibility,
        amount_paid,
        balance_due,
        status,
        payment_method,
        payment_date,
        notes,
        createdat,
        updatedat
      FROM invoices
      ORDER BY createdat DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return NextResponse.json({
      success: true,
      data: invoicesResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch invoices',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/invoices - Request received');
    
    if (!pool) {
      console.error('Database pool not configured');
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    // Generate invoice number if not provided
    const invoice_number = body.invoice_number || `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    
    const {
      invoice_date,
      patient_id,
      patient_name,
      patient_name_ar,
      insurance_company_id,
      status,
      payment_method,
      payment_date,
      notes,
      items
    } = body;
    
    // Get service prices for items that don't have unit_price
    let servicePrices: Record<string, number> = {};
    if (items && Array.isArray(items)) {
      console.log('Items received:', items);
      const serviceCodes = items
        .filter(item => !item.unit_price && (item.service_id || item.item_code))
        .map(item => item.service_id || item.item_code);
      
      console.log('Service codes to fetch:', serviceCodes);
      
      if (serviceCodes.length > 0) {
        try {
          // Try to fetch by code first (for frontend compatibility)
          const pricesResult = await pool.query(
            `SELECT code, id, price FROM services WHERE code = ANY($1) OR id = ANY($1)`,
            [serviceCodes]
          );
          console.log('Price query result:', pricesResult.rows);
          servicePrices = pricesResult.rows.reduce((acc, row) => {
            // Store by both code and id for flexibility
            acc[row.code] = parseFloat(row.price) || 0;
            acc[row.id] = parseFloat(row.price) || 0;
            return acc;
          }, {} as Record<string, number>);
          console.log('Fetched service prices:', servicePrices);
        } catch (priceError) {
          console.error('Error fetching service prices:', priceError);
          // Continue without prices - will use 0 as default
        }
      }
    }
    
    // Calculate totals from items if not provided
    const calculatedSubtotal = items && Array.isArray(items) 
      ? items.reduce((sum, item) => {
          const serviceId = item.service_id || item.item_code || '';
          const unitPrice = item.unit_price || servicePrices[serviceId] || 0;
          const quantity = item.quantity || 1;
          const itemTotal = unitPrice * quantity;
          console.log(`Item: ${serviceId}, unitPrice: ${unitPrice}, quantity: ${quantity}, total: ${itemTotal}`);
          return sum + itemTotal;
        }, 0)
      : 0;
    
    console.log('Calculated subtotal:', calculatedSubtotal);
    console.log('Body subtotal:', body.subtotal);
    const subtotal = body.subtotal ?? calculatedSubtotal;
    console.log('Final subtotal:', subtotal);
    const discount_percentage = body.discount_percentage ?? 0;
    const discount_amount = body.discount_amount ?? Math.round(subtotal * discount_percentage / 100);
    const total_amount = body.total_amount ?? (subtotal - discount_amount);
    const insurance_coverage_percentage = body.insurance_coverage_percentage ?? 0;
    const insurance_coverage_amount = body.insurance_coverage_amount ?? Math.round(total_amount * insurance_coverage_percentage / 100);
    const patient_responsibility = body.patient_responsibility ?? (total_amount - insurance_coverage_amount);
    const amount_paid = body.amount_paid ?? 0;
    const balance_due = body.balance_due ?? (patient_responsibility - amount_paid);
    
    console.log('Generated invoice number:', invoice_number);
    console.log('Calculated values:', {
      subtotal,
      discount_percentage,
      discount_amount,
      total_amount,
      insurance_coverage_percentage,
      insurance_coverage_amount,
      patient_responsibility,
      amount_paid,
      balance_due
    });

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Insert main invoice record
      const invoiceResult = await pool.query(`
        INSERT INTO invoices (
          invoice_number,
          invoice_date,
          patient_id,
          patient_name,
          patient_name_ar,
          subtotal,
          discount_percentage,
          discount_amount,
          total_amount,
          insurance_company_id,
          insurance_coverage_amount,
          insurance_coverage_percentage,
          patient_responsibility,
          amount_paid,
          balance_due,
          status,
          payment_method,
          payment_date,
          notes,
          createdat,
          updatedat
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW()
        ) RETURNING *
      `, [
        invoice_number,
        invoice_date,
        patient_id,
        patient_name,
        patient_name_ar,
        subtotal,
        discount_percentage,
        discount_amount,
        total_amount,
        insurance_company_id,
        insurance_coverage_amount,
        insurance_coverage_percentage,
        patient_responsibility,
        amount_paid,
        balance_due,
        status,
        payment_method,
        payment_date,
        notes
      ]);

      const newInvoice = invoiceResult.rows[0];

      // Insert invoice items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        console.log(`Inserting ${items.length} invoice items`);
        
        for (const item of items) {
          const serviceId = item.service_id || item.item_code || '';
          const unitPrice = item.unit_price || servicePrices[serviceId] || 0;
          const quantity = item.quantity || 1;
          const totalPrice = item.subtotal || item.total_price || (quantity * unitPrice);
          
          const itemData = {
            invoice_id: newInvoice.id,
            service_id: serviceId,
            service_name: item.service_name || item.item_name || '',
            service_name_ar: item.service_name_ar || item.item_name_ar || '',
            quantity: quantity,
            unit_price: unitPrice,
            total_price: totalPrice
          };
          
          console.log('Inserting item:', itemData);
          
          await pool.query(`
            INSERT INTO invoice_items (
              invoice_id,
              service_id,
              service_name,
              service_name_ar,
              quantity,
              unit_price,
              total_price
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7
            )
          `, [
            itemData.invoice_id,
            itemData.service_id,
            itemData.service_name,
            itemData.service_name_ar,
            itemData.quantity,
            itemData.unit_price,
            itemData.total_price
          ]);
        }
        console.log('All items inserted successfully');
      }

      // Commit transaction
      await pool.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Invoice created successfully',
        data: newInvoice
      });

    } catch (error) {
      // Rollback on error
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error creating invoice:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to create invoice',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    // Get invoice ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const invoiceId = pathParts[pathParts.length - 1];

    if (!invoiceId || invoiceId === 'invoices') {
      return NextResponse.json(
        { error: 'Invoice ID is required in URL path' },
        { status: 400 }
      );
    }

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Delete invoice items first
      await pool.query('DELETE FROM invoice_items WHERE invoice_id = $1', [invoiceId]);

      // Delete invoice
      const result = await pool.query('DELETE FROM invoices WHERE id = $1 RETURNING *', [invoiceId]);

      if (result.rows.length === 0) {
        await pool.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }

      // Commit transaction
      await pool.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Invoice deleted successfully'
      });

    } catch (error) {
      // Rollback on error
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete invoice',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

