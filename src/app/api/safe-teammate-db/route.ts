import { NextRequest, NextResponse } from 'next/server';
import { safeTeammateDB } from '@/lib/safe-teammate-db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    const columns = searchParams.get('columns') || '*';
    const where = searchParams.get('where');
    const limit = searchParams.get('limit');

    if (!table) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }

    const result = await safeTeammateDB.readRecords(table, {
      columns,
      where: where || undefined,
      limit: limit ? parseInt(limit) : undefined
    });

    return NextResponse.json({
      success: true,
      operation: 'SELECT',
      table,
      data: result,
      count: Array.isArray(result) ? result.length : 0
    });

  } catch (error: any) {
    console.error('Safe DB GET error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Safe operation failed',
        operation: 'SELECT'
      },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operation, table, data, where } = body;

    if (!table) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }

    let result;
    let operationType = operation?.toUpperCase();

    switch (operationType) {
      case 'INSERT':
      case 'CREATE':
        if (!data) {
          return NextResponse.json(
            { error: 'Data is required for INSERT operation' },
            { status: 400 }
          );
        }
        result = await safeTeammateDB.createRecord(table, data);
        break;

      case 'UPDATE':
        if (!data || !where) {
          return NextResponse.json(
            { error: 'Data and WHERE clause are required for UPDATE operation' },
            { status: 400 }
          );
        }
        result = await safeTeammateDB.updateRecords(table, data, where);
        break;

      case 'DELETE':
        if (!where) {
          return NextResponse.json(
            { error: 'WHERE clause is required for DELETE operation' },
            { status: 400 }
          );
        }
        result = await safeTeammateDB.deleteRecords(table, where);
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported operation: ${operation}. Allowed: INSERT, UPDATE, DELETE` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      operation: operationType,
      table,
      data: result,
      message: `${operationType} operation completed successfully`
    });

  } catch (error: any) {
    console.error('Safe DB POST error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Safe operation failed',
        operation: 'UNKNOWN'
      },
      { status: 400 }
    );
  }
}
